const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST']);
const ALLOWED_ANNOUNCEMENT_TYPES = new Set(['info', 'warning', 'alert']);
const ALLOWED_NOTIFIER_TYPES = new Set(['discord', 'telegram', 'slack', 'webhook']);

type MonitorInput = {
	name: string;
	url: string;
	method: 'GET' | 'HEAD' | 'POST';
	interval: number;
	active: boolean;
};

export function parseMonitorInput(input: {
	name: unknown;
	url: unknown;
	method: unknown;
	interval?: unknown;
	active?: unknown;
}): MonitorInput {
	const name = stringValue(input.name).trim();
	const url = normalizeHttpUrl(input.url);
	const method = normalizeMethod(input.method);
	const interval = normalizeInterval(input.interval);

	if (!name) {
		throw new Error('Monitor name is required');
	}

	return {
		name,
		url,
		method,
		interval,
		active: input.active !== false
	};
}

export function normalizeMethod(value: unknown) {
	const method = stringValue(value).toUpperCase() || 'HEAD';
	if (!ALLOWED_METHODS.has(method)) {
		throw new Error('Unsupported monitor method');
	}

	return method as 'GET' | 'HEAD' | 'POST';
}

export function normalizeHttpUrl(value: unknown) {
	const raw = stringValue(value).trim();
	if (!raw) {
		throw new Error('URL is required');
	}

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error('URL must be valid');
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error('URL must use http or https');
	}

	if (!parsed.hostname || parsed.username || parsed.password) {
		throw new Error('URL must not contain credentials');
	}

	return parsed.toString();
}

export function normalizeWebhookUrl(value: unknown) {
	return normalizeHttpUrl(value);
}

export function normalizeAnnouncementType(value: unknown) {
	const type = stringValue(value).trim() || 'info';
	if (!ALLOWED_ANNOUNCEMENT_TYPES.has(type)) {
		throw new Error('Unsupported announcement type');
	}

	return type;
}

export function normalizeNotifierType(value: unknown) {
	const type = stringValue(value).trim();
	if (!ALLOWED_NOTIFIER_TYPES.has(type)) {
		throw new Error('Unsupported notifier type');
	}

	return type;
}

export function normalizeRetentionDays(value: unknown) {
	const days = Number(stringValue(value));
	if (!Number.isInteger(days) || days < 1 || days > 365) {
		throw new Error('Retention days must be an integer from 1 to 365');
	}

	return String(days);
}

export function parseUnixTimestamp(value: unknown, label: string) {
	const raw = stringValue(value);
	const time = new Date(raw).getTime();
	if (!raw || !Number.isFinite(time)) {
		throw new Error(`${label} must be a valid date`);
	}

	return Math.floor(time / 1000);
}

export function assertMaintenanceWindow(startTime: number, endTime: number) {
	if (endTime <= startTime) {
		throw new Error('Maintenance end time must be after start time');
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown) {
	return typeof value === 'string' ? value : '';
}

function normalizeInterval(value: unknown) {
	const interval = Number(value ?? 60);
	return Number.isInteger(interval) && interval >= 1 && interval <= 1440 ? interval : 60;
}
