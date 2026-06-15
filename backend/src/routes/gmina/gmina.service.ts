import prisma from "../../utils/prisma";

export const listGminy = () =>
  prisma.gmina.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
