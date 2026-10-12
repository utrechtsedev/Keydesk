type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const severity: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Readable lines while developing; elsewhere one JSON object per line, which Cloudflare's Workers
 * Logs (and any other log collector) turns into searchable fields. It writes through `console`,
 * which works the same in Node and on Workers.
 */
const readable = import.meta.env?.DEV === true && import.meta.env.MODE !== 'test';

function threshold(): number {
	const configured = process.env.LOG_LEVEL;
	if (configured && configured in severity) return severity[configured as Level];
	return readable ? severity.debug : severity.info;
}

/** Errors become plain objects, as JSON.stringify would otherwise write them as `{}` */
function serializeErrors(_key: string, value: unknown): unknown {
	if (value instanceof Error) {
		return { type: value.name, message: value.message, stack: value.stack, cause: value.cause };
	}
	return value;
}

function write(level: Level, fieldsOrMessage: Fields | string, message?: string): void {
	if (severity[level] < threshold()) return;

	const fields = typeof fieldsOrMessage === 'string' ? {} : fieldsOrMessage;
	const msg = typeof fieldsOrMessage === 'string' ? fieldsOrMessage : (message ?? '');

	if (readable) {
		const time = new Date().toLocaleTimeString('en-GB');
		const line = `${time} ${level.toUpperCase()}: ${msg}`;
		if (Object.keys(fields).length > 0) {
			console[level](line, fields);
		} else {
			console[level](line);
		}
		return;
	}

	const entry = { level, time: new Date().toISOString(), msg, ...fields };
	let json: string;
	try {
		json = JSON.stringify(entry, serializeErrors);
	} catch {
		// A field that can't be written as JSON (a cycle, a BigInt) shouldn't lose the message
		json = JSON.stringify({ level, time: entry.time, msg, fields: String(fields) });
	}
	console[level](json);
}

export const logger = {
	debug: (fieldsOrMessage: Fields | string, message?: string) =>
		write('debug', fieldsOrMessage, message),
	info: (fieldsOrMessage: Fields | string, message?: string) =>
		write('info', fieldsOrMessage, message),
	warn: (fieldsOrMessage: Fields | string, message?: string) =>
		write('warn', fieldsOrMessage, message),
	error: (fieldsOrMessage: Fields | string, message?: string) =>
		write('error', fieldsOrMessage, message)
};
