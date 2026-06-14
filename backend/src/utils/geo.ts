const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEG_LAT = 111_320;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Odległość w metrach między dwoma punktami (wzór Haversine'a).
 */
export const haversine = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
};

/**
 * Zakresy lat/lng obejmujące kwadrat o "promieniu" radiusM wokół punktu.
 * Służy jako tani prefiltr (bounding box) przed dokładnym liczeniem Haversine'a.
 */
export const boundingBox = (lat: number, lng: number, radiusM: number) => {
  const dLat = radiusM / METERS_PER_DEG_LAT;
  const dLng = radiusM / (METERS_PER_DEG_LAT * Math.cos(toRad(lat)));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
};
