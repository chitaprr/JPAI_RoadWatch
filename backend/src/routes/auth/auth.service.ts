import prisma from "../../utils/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../../../config";

const JWT_SECRET = config.JWT_SECRET!;
const SALT_ROUNDS = 10;

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const createUser = async (data: {
  email: string;
  name: string;
  password: string;
}) => {
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  return prisma.user.create({
    data: { email: data.email, name: data.name, password: hashedPassword },
  });
};

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

// Token niesie tylko tożsamość — rola/gmina/flagi są czytane z bazy w
// authMiddleware przy każdym żądaniu (zob. loadUser).
export const generateToken = (user: { id: number; email: string }) =>
  jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "24h",
  });
