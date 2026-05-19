import {Router} from 'express';
import {HelloWorldHandler} from './main.controller';
import userRouter from './user/user.router';

const router = Router();

router.use('/users', userRouter);

router.get('/', HelloWorldHandler);

export default router;
