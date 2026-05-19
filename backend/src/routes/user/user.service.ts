import prisma from '../../utils/prisma';

export const listUsers = () => prisma.user.findMany({
	select: {id: true, email: true, name: true, isSuperadmin: true, createdAt: true, updatedAt: true}
});

export const createUser = (data: {email: string; name: string; password: string}) =>
	prisma.user.create({data});
