import prisma from "../../utils/prisma";
import type { Rola } from "../../generated/prisma/client";

// Pola zwracane do panelu (bez hasła).
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isSuperadmin: true,
  gminaId: true,
  urzednikGminaId: true,
  adminGminaId: true,
  wykonawcaId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listUsers = () => prisma.user.findMany({ select: userSelect });

// Użytkownicy „należący" do gminy — widoczni dla administratora gminy:
// urzędnicy/administratorzy tej gminy oraz konta wykonawców firm z tej gminy.
export const listUsersForGmina = (gminaId: number) =>
  prisma.user.findMany({
    where: {
      OR: [
        { urzednikGminaId: gminaId },
        { adminGminaId: gminaId },
        { wykonawca: { gminaId } },
      ],
    },
    select: userSelect,
  });

export const findUserById = (id: number) =>
  prisma.user.findUnique({ where: { id }, select: userSelect });

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email }, select: userSelect });

// Minimalny widok do sprawdzenia przynależności konta do gminy (scoping admina).
export const findUserScope = (id: number) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      isSuperadmin: true,
      urzednikGminaId: true,
      adminGminaId: true,
      wykonawca: { select: { gminaId: true } },
    },
  });

export const updateUser = (
  id: number,
  data: {
    name?: string;
    role?: Rola;
    isSuperadmin?: boolean;
    urzednikGminaId?: number | null;
    adminGminaId?: number | null;
    wykonawcaId?: number | null;
  },
) => prisma.user.update({ where: { id }, data, select: userSelect });

export const deleteUser = (id: number) => prisma.user.delete({ where: { id } });
