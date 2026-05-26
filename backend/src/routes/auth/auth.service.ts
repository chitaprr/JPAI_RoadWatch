import prisma from '../../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../../../config';

const JWT_SECRET = config.JWT_SECRET!;
const SALT_ROUNDS = 10;

export const findUserByEmail = (email: string) =>
	prisma.user.findUnique({where: {email}});

export const createUser = async (data: {email: string; name: string; password: string}) => {
	const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
	return prisma.user.create({
		data: {email: data.email, name: data.name, password: hashedPassword},
	});
};

export const verifyPassword = (plain: string, hash: string) =>
	bcrypt.compare(plain, hash);

export const generateToken = (user: {id: number; email: string; isSuperadmin: boolean}) =>
	jwt.sign(
		{userId: user.id, email: user.email, isSuperadmin: user.isSuperadmin},
		JWT_SECRET,
		{expiresIn: '24h'},
	);
