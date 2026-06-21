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
export const listPublicZgloszenia = () =>
  prisma.zgloszenie.findMany({
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
    },
    orderBy: { createdAt: "desc" },
  });

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
