import 'dotenv/config';
import checkObjectValuesNotNull from '../src/utils/checkObjectValuesNotNull';

const config = {
	PRODUCTION: process.env.PRODUCTION ? process.env.PRODUCTION === 'true' : true,
	PORT: process.env.PORT ?? 8000,
	ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(';') ?? [],
	LOGGER: {
		LEVEL: process.env.LOG_LEVEL ?? 'debug',
		SAVE_TO_FILE: false,
		FILE: 'app.log'
	},
	DATABASE_URL: process.env.DATABASE_URL,
	JWT_SECRET: process.env.JWT_SECRET,
} as const;

const checkConfigFields = (): Promise<string> => {
	const nullConfigFieldPath = checkObjectValuesNotNull(config);

	if (typeof nullConfigFieldPath === 'string') {
		return Promise.reject(`Config field (config.${nullConfigFieldPath}) is null or undefined`);
	}

	return Promise.resolve('Checking config values: OK');
};

export {checkConfigFields};

export default config;
