/**
 * @param obj Object to check.
 * @return Object's first null field path as string OR void if there is not any null (or undefined) fields.
 */
const checkObjectValuesNotNull = (obj: object): string | void => {
	for (let [key, value] of Object.entries(obj)) {

		if (value == null) return key;

		if (typeof value !== 'object') continue;

		const res = checkObjectValuesNotNull(value);
		if (typeof res !== 'string') continue;
		return `${key}.${res}`;
	}
};

export default checkObjectValuesNotNull;
