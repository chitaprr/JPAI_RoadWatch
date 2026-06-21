import bcrypt from "bcrypt";
import prisma from "../src/utils/prisma";
import { Rola } from "../src/generated/prisma/client";

// Skrypt seedujący bazę danymi do developmentu/testów.
// Uruchom: `npm run seed` (wymaga wcześniej prisma:generate + prisma:push).
// Idempotentny — można odpalać wielokrotnie (upsert po unikalnych polach).

const SALT_ROUNDS = 10;
const PASSWORD = "testtest";

interface SeedUser {
  email: string;
  name: string;
  role: Rola;
  isSuperadmin?: boolean;
  gminaId?: number;
  urzednikGminaId?: number;
  adminGminaId?: number;
  wykonawcaId?: number;
}

async function main() {
  const password = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // Gmina (brak pola unikalnego poza id -> findFirst + create).
  const gmina =
    (await prisma.gmina.findFirst({ where: { name: "Kraków" } })) ??
    (await prisma.gmina.create({ data: { name: "Kraków" } }));

  // Firma wykonawcza w gminie Kraków.
  const wykonawca =
    (await prisma.wykonawca.findFirst({ where: { name: "januszpol" } })) ??
    (await prisma.wykonawca.create({
      data: { name: "januszpol", nip: "1234567890", gminaId: gmina.id },
    }));

  const users: SeedUser[] = [
    {
      email: "superadmin@roadwatch.com",
      name: "Superadmin",
      role: Rola.MIESZKANIEC,
      isSuperadmin: true,
    },
    {
      email: "admin@roadwatch.com",
      name: "Administrator gminy",
      role: Rola.ADMIN,
      adminGminaId: gmina.id,
    },
    {
      email: "urzednik@roadwatch.com",
      name: "Urzędnik",
      role: Rola.URZEDNIK,
      urzednikGminaId: gmina.id,
    },
    {
      email: "wykonawca@roadwatch.com",
      name: "Wykonawca",
      role: Rola.WYKONAWCA,
      wykonawcaId: wykonawca.id,
    },
    {
      email: "mieszkaniec@roadwatch.com",
      name: "Mieszkaniec",
      role: Rola.MIESZKANIEC,
      gminaId: gmina.id,
    },
  ];

  for (const u of users) {
    const data = {
      name: u.name,
      password,
      role: u.role,
      isSuperadmin: u.isSuperadmin ?? false,
      gminaId: u.gminaId ?? null,
      urzednikGminaId: u.urzednikGminaId ?? null,
      adminGminaId: u.adminGminaId ?? null,
      wykonawcaId: u.wykonawcaId ?? null,
    };
    await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, ...data },
      update: data,
    });
  }

  console.log("Seed OK.");
  console.log(`  Gmina:      Kraków (#${gmina.id})`);
  console.log(`  Wykonawca:  januszpol (#${wykonawca.id}, NIP 1234567890)`);
  console.log(`  Konta (hasło dla wszystkich: ${PASSWORD}):`);
  users.forEach((u) =>
    console.log(
      `    - ${u.email}  [${u.role}${u.isSuperadmin ? " + superadmin" : ""}]`,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed nieudany:", e);
    process.exit(1);
  });
