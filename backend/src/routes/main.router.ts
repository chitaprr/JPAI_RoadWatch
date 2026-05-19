import {Router} from 'express';
import {HelloWorldHandler} from './main.controller';

const router = Router();

router.get('/', HelloWorldHandler);

export default router;
