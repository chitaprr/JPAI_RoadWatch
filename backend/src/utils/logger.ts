import winston from 'winston';
import colors from './colors';
import config from '../../config';

interface ColorMap {
	[key: string]: string;
}

const levelColors: ColorMap = {
	info: colors.blue,
	debug: colors.yellow,
	warn: colors.yellow,
	error: colors.red,
	reset: colors.reset,
};

const transports: Array<winston.transport> = [
	new winston.transports.Console()
];

config.LOGGER.SAVE_TO_FILE && transports.push(new winston.transports.File({filename: config.LOGGER.FILE}));

const logger = winston.createLogger({
	level: config.LOGGER.LEVEL,
	format: winston.format.combine(
		winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
		winston.format.printf(({timestamp, level, message}) => {
			const color = levelColors[level] || '';
			return `${timestamp} ${color}[${level.toUpperCase()}]${colors.reset}: ${message}`;
		})
	),
	transports
});

export default logger;
