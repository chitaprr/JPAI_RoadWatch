import prisma from "./prisma";

const initDB = async (): Promise<string> => {
  try {
    await prisma.$connect();
    return Promise.resolve("Database initialization: OK");
  } catch (_error) {
    return Promise.reject("Database initialization: FAILED");
  }
};

export default initDB;
