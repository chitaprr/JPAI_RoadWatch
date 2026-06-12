import { describe, it, expect } from "vitest";
import { haversine, boundingBox } from "./geo";

describe("haversine", () => {
  it("zwraca 0 dla tego samego punktu", () => {
    expect(haversine(52.2297, 21.0122, 52.2297, 21.0122)).toBe(0);
  });

  it("jest symetryczna", () => {
    const a = haversine(52.2297, 21.0122, 50.0647, 19.945);
    const b = haversine(50.0647, 19.945, 52.2297, 21.0122);
    expect(a).toBeCloseTo(b, 6);
  });

  it("1 stopień szerokości to ~111.2 km", () => {
    const d = haversine(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("Warszawa–Kraków to ~252 km (±5 km)", () => {
    const d = haversine(52.2297, 21.0122, 50.0647, 19.945);
    expect(d).toBeGreaterThan(247_000);
    expect(d).toBeLessThan(257_000);
  });

  it("mały krok ~0.00018 stopnia lat to ~20 m", () => {
    const d = haversine(52.2297, 21.0122, 52.22988, 21.0122);
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(25);
  });
});

describe("boundingBox", () => {
  it("punkt mieści się w swoim własnym boxie", () => {
    const lat = 52.2297;
    const lng = 21.0122;
    const box = boundingBox(lat, lng, 50);
    expect(lat).toBeGreaterThan(box.minLat);
    expect(lat).toBeLessThan(box.maxLat);
    expect(lng).toBeGreaterThan(box.minLng);
    expect(lng).toBeLessThan(box.maxLng);
  });

  it("jest wyśrodkowany na punkcie", () => {
    const box = boundingBox(52.2297, 21.0122, 50);
    expect((box.minLat + box.maxLat) / 2).toBeCloseTo(52.2297, 6);
    expect((box.minLng + box.maxLng) / 2).toBeCloseTo(21.0122, 6);
  });

  it("obejmuje punkt dokładnie na promieniu na północ (rożne narożniki dalej)", () => {
    const lat = 52.2297;
    const lng = 21.0122;
    const radius = 50;
    const box = boundingBox(lat, lng, radius);
    // Punkt ~49 m na północ musi wpaść w zakres lat boxa.
    const northLat = lat + 49 / 111_320;
    expect(northLat).toBeLessThan(box.maxLat);
  });

  it("większy promień daje szerszy box", () => {
    const small = boundingBox(52, 21, 50);
    const big = boundingBox(52, 21, 500);
    expect(big.maxLat - big.minLat).toBeGreaterThan(
      small.maxLat - small.minLat,
    );
  });
});
