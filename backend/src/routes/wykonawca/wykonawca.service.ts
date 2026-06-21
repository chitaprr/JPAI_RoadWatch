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
