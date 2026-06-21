import prisma from "../../utils/prisma";

const wykonawcaSelect = {
  id: true,
  name: true,
  nip: true,
  gminaId: true,
} as const;

export const listWykonawcy = () =>
  prisma.wykonawca.findMany({
    select: wykonawcaSelect,
    orderBy: { name: "asc" },
  });

// Wykonawcy jednej gminy — dla urzędnika/administratora gminy.
export const listWykonawcyByGmina = (gminaId: number) =>
  prisma.wykonawca.findMany({
    where: { gminaId },
    select: wykonawcaSelect,
    orderBy: { name: "asc" },
  });

export const findWykonawcaById = (id: number) =>
  prisma.wykonawca.findUnique({ where: { id }, select: wykonawcaSelect });

export const createWykonawca = (data: {
  name: string;
  nip: string;
  gminaId: number;
}) => prisma.wykonawca.create({ data, select: wykonawcaSelect });

export const updateWykonawca = (
  id: number,
  data: { name?: string; nip?: string; gminaId?: number },
) => prisma.wykonawca.update({ where: { id }, data, select: wykonawcaSelect });

export const deleteWykonawca = (id: number) =>
  prisma.wykonawca.delete({ where: { id } });
