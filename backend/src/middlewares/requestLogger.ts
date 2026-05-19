import {NextFunction, Response, Request} from 'express';
import logger from '../utils/logger';

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
	const ip = req.header('CF-Connecting-IP') ??
		req.header('x-forwarded-for') ??
		req.ip;

	logger.info(`[${ip}] ${req.method} ${req.originalUrl}`);

	next();
};

export default requestLogger;
