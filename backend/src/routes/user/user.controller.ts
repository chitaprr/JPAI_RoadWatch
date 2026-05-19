import {Request, Response} from 'express';
import {z} from 'zod';
import {SUCCESS, CREATED, MISSING_BODY_FIELDS} from '../../utils/httpCodeResponses/messages';
import * as userService from './user.service';

export const getUsers = async (_req: Request, res: Response) => {
	const users = await userService.listUsers();
	return SUCCESS(res, 'Users', {users});
};

const createUserSchema = z.object({
	email: z.email(),
	name: z.string().min(1),
	password: z.string().min(1),
});

export const postUser = async (req: Request, res: Response) => {
	const parsed = createUserSchema.safeParse(req.body);
	if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

	const user = await userService.createUser(parsed.data);
	return CREATED(res, 'User created', {id: user.id, email: user.email, name: user.name});
};
