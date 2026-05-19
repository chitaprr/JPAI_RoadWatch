import {Response} from 'express';

const respond = (res: Response, message: string, statusCode: number, data: object = {}) => res.status(statusCode).json({
	success: statusCode >= 200 && statusCode <= 299,
	msg: message,
	...data
});

export default respond;
