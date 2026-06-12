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
      zdjecia: {
        create: data.filePaths.map((filePath) => ({ filePath })),
      },
    },
    include: { zdjecia: true },
  });
