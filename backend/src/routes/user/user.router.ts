import {Router} from 'express';
import {getUsers, postUser} from './user.controller';

const userRouter = Router();

userRouter.get('/', getUsers);
userRouter.post('/', postUser);

export default userRouter;
