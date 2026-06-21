import prisma from "../../utils/prisma";

// Rekord naprawy wraz ze zdjęciami „po naprawie".
export const createNaprawa = (data: {
  zadanieId: number;
  contractorId: number;
  description: string;
  filePaths: string[];
}) =>
  prisma.naprawa.create({
    data: {
      zadanieId: data.zadanieId,
      contractorId: data.contractorId,
      description: data.description,
      completedAt: new Date(),
      zdjecia: { create: data.filePaths.map((filePath) => ({ filePath })) },
    },
    include: { zdjecia: true },
  });
