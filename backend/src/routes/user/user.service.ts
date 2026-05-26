import prisma from "../../utils/prisma";

export const listUsers = () =>
  prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isSuperadmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

export const findUserById = (id: number) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      isSuperadmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
