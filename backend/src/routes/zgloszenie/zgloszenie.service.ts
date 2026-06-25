import prisma from "../../utils/prisma";
import { haversine, boundingBox } from "../../utils/geo";

// Statusy uznawane za "aktywne" - tylko wśród nich szukamy duplikatów.
const ACTIVE_STATUSES = ["Nowe", "W trakcie", "Zaakceptowane", "Zlecone"];

export interface NearbyDuplicate {
  id: number;
  title: string;
  status: string;
  lat: number;
  lng: number;
  distanceM: number;
}

/**
 * Zwraca aktywne zgłoszenia w promieniu radiusM metrów od punktu,
 * posortowane rosnąco po odległości. Prefiltr bounding-box (Prisma),
 * dokładny dystans liczony Haversine'em w aplikacji.
 */
export const findNearbyDuplicates = async (
  lat: number,
  lng: number,
  radiusM: number,
): Promise<NearbyDuplicate[]> => {
  const box = boundingBox(lat, lng, radiusM);

  const candidates = await prisma.zgloszenie.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    },
    select: { id: true, title: true, status: true, lat: true, lng: true },
  });

  return candidates
    .map((z) => {
      const zLat = Number(z.lat);
      const zLng = Number(z.lng);
      return {
        id: z.id,
        title: z.title,
        status: z.status,
        lat: zLat,
        lng: zLng,
        distanceM: Math.round(haversine(lat, lng, zLat, zLng)),
      };
    })
    .filter((z) => z.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
};

export const createZgloszenie = (data: {
  userId: number | null;
  email: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  gminaId: number;
  filePaths: string[];
}) =>
  prisma.zgloszenie.create({
    data: {
      userId: data.userId,
      email: data.email,
      title: data.title,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      gminaId: data.gminaId,
      zdjecia: {
        create: data.filePaths.map((filePath) => ({ filePath })),
      },
    },
    include: { zdjecia: true },
  });

// Bez filtra -> wszystkie (superadmin). Z gminaId -> tylko zgłoszenia danej gminy
// (scoping urzędnika do jego gminy).
export const listZgloszenia = (filter?: { gminaId?: number }) =>
  prisma.zgloszenie.findMany({
    where: filter?.gminaId !== undefined ? { gminaId: filter.gminaId } : {},
    include: { zdjecia: true },
    orderBy: { createdAt: "desc" },
  });

// Zgłoszenia zalogowanego mieszkańca (po jego userId).
export const listMyZgloszenia = (userId: number) =>
  prisma.zgloszenie.findMany({
    where: { userId },
    include: { zdjecia: true, gmina: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

// Zlecenia wykonawcy — zgłoszenia przypisane do jego firmy (contractorId),
// wraz z naprawami i ich zdjęciami „po".
export const listZlecone = (wykonawcaId: number) =>
  prisma.zgloszenie.findMany({
    where: { contractorId: wykonawcaId },
    include: {
      zdjecia: true,
      gmina: { select: { name: true } },
      naprawy: { include: { zdjecia: true }, orderBy: { completedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

// Lookup gościa: zgłoszenie odnajdywane TYLKO po parze id + email (oba muszą
// pasować), żeby nie dało się enumerować cudzych zgłoszeń po samym id.
export const findZgloszenieByIdAndEmail = (id: number, email: string) =>
  prisma.zgloszenie.findFirst({
    where: { id, email },
    include: { zdjecia: true, gmina: { select: { name: true } } },
  });

// Publiczna lista do mapy — tylko pola potrzebne do pinezek, bez danych
// kontaktowych (email) i powiązań użytkowników.
export const listPublicZgloszenia = async () => {
  const rows = await prisma.zgloszenie.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      lat: true,
      lng: true,
      status: true,
      priority: true,
      createdAt: true,
      zdjecia: { select: { id: true, filePath: true } },
      _count: { select: { potwierdzenia: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // Spłaszczenie licznika potwierdzeń („+1") do pola confirmations.
  return rows.map(({ _count, ...z }) => ({
    ...z,
    confirmations: _count.potwierdzenia,
  }));
};

export const findZgloszenieById = (id: number) =>
  prisma.zgloszenie.findUnique({
    where: { id },
    include: {
      zdjecia: true,
      gmina: { select: { name: true } },
      // Naprawy wraz ze zdjęciami „po" i opisem od wykonawcy — do widoku
      // szczegółów (m.in. dla urzędnika).
      naprawy: { include: { zdjecia: true }, orderBy: { completedAt: "desc" } },
    },
  });

// Pola triażu, które urzędnik może aktualizować. undefined = bez zmiany.
export const updateZgloszenie = (
  id: number,
  data: {
    urzednikId?: number | null;
    contractorId?: number | null;
    priority?: number;
    status?: string;
    deadline?: Date | null;
  },
) =>
  prisma.zgloszenie.update({
    where: { id },
    data,
    include: { zdjecia: true },
  });

export const deleteZgloszenie = (id: number) =>
  prisma.zgloszenie.delete({ where: { id } });

// ---- Komentarze (notatki wewnętrzne obsługi) ----

export const listKomentarze = (zgloszenieId: number) =>
  prisma.komentarz.findMany({
    where: { zgloszenieId },
    orderBy: { createdAt: "asc" },
  });

export const createKomentarz = (data: {
  zgloszenieId: number;
  authorId: number | null;
  authorName: string;
  content: string;
}) => prisma.komentarz.create({ data });

// ---- Historia zmian (audit log) ----

export interface AuditEntry {
  zgloszenieId: number;
  userId: number | null;
  userName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export const listHistoria = (zgloszenieId: number) =>
  prisma.historiaZmian.findMany({
    where: { zgloszenieId },
    orderBy: { createdAt: "asc" },
  });

// Zapis wielu wpisów na raz; pusta lista nie generuje zapytania.
export const addHistoria = (entries: AuditEntry[]) =>
  entries.length > 0
    ? prisma.historiaZmian.createMany({ data: entries })
    : Promise.resolve();

// ---- Potwierdzenia („+1" cudzego zgłoszenia) ----

// Idempotentne — ponowny „+1" tego samego użytkownika nic nie zmienia.
export const addPotwierdzenie = (zgloszenieId: number, userId: number) =>
  prisma.potwierdzenie.upsert({
    where: { zgloszenieId_userId: { zgloszenieId, userId } },
    create: { zgloszenieId, userId },
    update: {},
  });

export const removePotwierdzenie = (zgloszenieId: number, userId: number) =>
  prisma.potwierdzenie.deleteMany({ where: { zgloszenieId, userId } });

export const countPotwierdzenia = (zgloszenieId: number) =>
  prisma.potwierdzenie.count({ where: { zgloszenieId } });

// ---- Statystyki ----

export interface StatystykiFilter {
  gminaId?: number;
  from?: Date;
  to?: Date;
}

export interface Statystyki {
  total: number;
  byStatus: Record<string, number>;
  // Średni czas realizacji (dni) liczony od utworzenia do pierwszej naprawy.
  avgResolutionDays: number | null;
  resolvedCount: number;
}

const buildWhere = (filter: StatystykiFilter) => {
  const where: {
    gminaId?: number;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (filter.gminaId !== undefined) where.gminaId = filter.gminaId;
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }
  return where;
};

export const getStatystyki = async (
  filter: StatystykiFilter,
): Promise<Statystyki> => {
  const where = buildWhere(filter);

  const rows = await prisma.zgloszenie.findMany({
    where,
    select: {
      status: true,
      createdAt: true,
      naprawy: {
        select: { completedAt: true },
        orderBy: { completedAt: "asc" },
        take: 1,
      },
    },
  });

  const byStatus: Record<string, number> = {};
  let resolvedCount = 0;
  let totalMs = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const firstRepair = row.naprawy[0];
    if (firstRepair) {
      resolvedCount += 1;
      totalMs += firstRepair.completedAt.getTime() - row.createdAt.getTime();
    }
  }

  const avgResolutionDays =
    resolvedCount > 0
      ? Math.round((totalMs / resolvedCount / 86_400_000) * 10) / 10
      : null;

  return { total: rows.length, byStatus, avgResolutionDays, resolvedCount };
};
