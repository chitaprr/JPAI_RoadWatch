import prisma from "../../utils/prisma";

const gminaSelect = { id: true, name: true } as const;

export const listGminy = () =>
  prisma.gmina.findMany({ select: gminaSelect, orderBy: { name: "asc" } });

export const createGmina = (name: string) =>
  prisma.gmina.create({ data: { name }, select: gminaSelect });

export const updateGmina = (id: number, name: string) =>
  prisma.gmina.update({ where: { id }, data: { name }, select: gminaSelect });

export const deleteGmina = (id: number) =>
  prisma.gmina.delete({ where: { id } });
