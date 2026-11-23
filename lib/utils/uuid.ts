const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Check ids from URLs and forms first: Postgres errors on a malformed UUID. */
export const isUuid = (value: string) => UUID_PATTERN.test(value);
