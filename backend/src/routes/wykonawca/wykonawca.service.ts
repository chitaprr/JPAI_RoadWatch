import prisma from "../../utils/prisma";

export const listWykonawcy = () =>
  prisma.wykonawca.findMany({
    select: { id: true, name: true, nip: true, gminaId: true },
    orderBy: { name: "asc" },
  });
