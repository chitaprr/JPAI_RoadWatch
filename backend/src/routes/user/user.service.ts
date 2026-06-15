import prisma from "../../utils/prisma";
import type { Rola } from "../../generated/prisma/client";

// Pola zwracane do panelu (bez hasła).
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isSuperadmin: true,
  urzednikGminaId: true,
  wykonawcaId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listUsers = () => prisma.user.findMany({ select: userSelect });

export const findUserById = (id: number) =>
  prisma.user.findUnique({ where: { id }, select: userSelect });

export const updateUser = (
  id: number,
  data: {
    name?: string;
    role?: Rola;
    isSuperadmin?: boolean;
    urzednikGminaId?: number | null;
    wykonawcaId?: number | null;
  },
) => prisma.user.update({ where: { id }, data, select: userSelect });

export const deleteUser = (id: number) => prisma.user.delete({ where: { id } });
