import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import request from "supertest";
import server from "../../server";
import prisma from "../../utils/prisma";
import { UPLOAD_DIR } from "../../middlewares/upload";

// Marker pozwalający posprzątać tylko dane utworzone przez testy.
const TEST_DOMAIN = "@vitest.test";

// Minimalny poprawny plik PNG (1x1).
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001" +
    "0d0a2db40000000049454e44ae426082",
  "hex",
);

const attachPng = (req: request.Test) => req.attach("zdjecia", PNG, "test.png");

const registerAndToken = async (email: string): Promise<string> => {
  const res = await request(server)
    .post("/auth/register")
    .send({ email, name: "Vitest User", password: "secret123" });
  return res.body.data.token as string;
};

const cleanup = async () => {
  await prisma.zgloszenie.deleteMany({
    where: { email: { endsWith: TEST_DOMAIN } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: TEST_DOMAIN } },
  });
};

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
});

describe("POST /zgloszenia", () => {
  it("gość z emailem i zdjęciem tworzy zgłoszenie (201, userId null)", async () => {
    const res = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "Dziura gość")
        .field("description", "Zgłoszenie od niezalogowanego")
        .field("lat", "50.0")
        .field("lng", "19.9")
        .field("email", `gosc${TEST_DOMAIN}`),
    );

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const z = res.body.data.zgloszenie;
    expect(z.userId).toBeNull();
    expect(z.email).toBe(`gosc${TEST_DOMAIN}`);
    expect(z.status).toBe("Nowe");
    expect(z.zdjecia).toHaveLength(1);
    expect(z.zdjecia[0].filePath).toMatch(/^\/uploads\//);
    // Plik faktycznie zapisany na dysku.
    const name = z.zdjecia[0].filePath.replace("/uploads/", "");
    expect(fs.existsSync(`${UPLOAD_DIR}/${name}`)).toBe(true);
  });

  it("gość bez emaila dostaje 400", async () => {
    const res = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "Bez emaila")
        .field("description", "Powinno zostać odrzucone")
        .field("lat", "48.0")
        .field("lng", "18.0"),
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("zgłoszenie bez zdjęcia dostaje 400", async () => {
    const res = await request(server)
      .post("/zgloszenia")
      .field("title", "Bez zdjęcia")
      .field("description", "Powinno zostać odrzucone")
      .field("lat", "48.5")
      .field("lng", "18.5")
      .field("email", `bezfoto${TEST_DOMAIN}`);

    expect(res.status).toBe(400);
  });

  it("niepoprawne dane (krótki tytuł) dają 400", async () => {
    const res = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "ab")
        .field("description", "Tytuł za krótki")
        .field("lat", "48.6")
        .field("lng", "18.6")
        .field("email", `walid${TEST_DOMAIN}`),
    );

    expect(res.status).toBe(400);
  });

  it("zalogowany tworzy zgłoszenie przypięte do konta z emailem z tokena (201)", async () => {
    const email = `konto${TEST_DOMAIN}`;
    const token = await registerAndToken(email);

    const res = await attachPng(
      request(server)
        .post("/zgloszenia")
        .set("Authorization", `Bearer ${token}`)
        .field("title", "Dziura zalogowany")
        .field("description", "Przypięte do konta")
        .field("lat", "51.0")
        .field("lng", "17.0"),
    );

    expect(res.status).toBe(201);
    const z = res.body.data.zgloszenie;
    expect(z.userId).toEqual(expect.any(Number));
    expect(z.email).toBe(email);
  });

  it("niepoprawny token daje 403", async () => {
    const res = await attachPng(
      request(server)
        .post("/zgloszenia")
        .set("Authorization", "Bearer niepoprawny.token.tutaj")
        .field("title", "Z błędnym tokenem")
        .field("description", "Powinno zostać odrzucone")
        .field("lat", "52.0")
        .field("lng", "16.0"),
    );

    expect(res.status).toBe(403);
  });

  it("blokuje duplikat w promieniu 50 m (409) i przepuszcza z force=true (201)", async () => {
    // Gdańsk - lokalizacja unikalna względem pozostałych testów.
    const lat = 54.352;
    const lng = 18.6466;

    const first = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "Pierwsze zgłoszenie")
        .field("description", "Oryginalne zgłoszenie usterki")
        .field("lat", String(lat))
        .field("lng", String(lng))
        .field("email", `dup1${TEST_DOMAIN}`),
    );
    expect(first.status).toBe(201);

    // ~20 m na północ.
    const nearLat = lat + 0.00018;
    const dup = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "Duplikat obok")
        .field("description", "Ta sama usterka zgłoszona ponownie")
        .field("lat", String(nearLat))
        .field("lng", String(lng))
        .field("email", `dup2${TEST_DOMAIN}`),
    );
    expect(dup.status).toBe(409);
    expect(dup.body.duplicates).toBeInstanceOf(Array);
    expect(dup.body.duplicates.length).toBeGreaterThan(0);
    expect(dup.body.duplicates[0].distanceM).toBeLessThanOrEqual(50);

    // Z force=true przechodzi mimo duplikatu.
    const forced = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "Mimo duplikatu")
        .field("description", "Dodaję pomimo istniejącego zgłoszenia")
        .field("lat", String(nearLat))
        .field("lng", String(lng))
        .field("email", `dup3${TEST_DOMAIN}`)
        .field("force", "true"),
    );
    expect(forced.status).toBe(201);
  });

  it("odległe zgłoszenie (>50 m) nie jest duplikatem (201)", async () => {
    const res = await attachPng(
      request(server)
        .post("/zgloszenia")
        .field("title", "Inne miejsce")
        .field("description", "Zupełnie inna lokalizacja")
        .field("lat", "53.13")
        .field("lng", "23.16")
        .field("email", `far${TEST_DOMAIN}`),
    );
    expect(res.status).toBe(201);
  });
});
