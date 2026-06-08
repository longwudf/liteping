import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'liteping_session';
const CSRF_COOKIE = 'liteping_csrf';
const SESSION_VERSION = 'v1';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function getAdminPassword() {
	const password = env.ADMIN_PASSWORD;
	return typeof password === 'string' && password.trim().length > 0 ? password : null;
}

export function isAdminConfigured() {
	return getAdminPassword() !== null;
}

export async function createAdminSession() {
	const password = getAdminPassword();
	if (!password) {
		throw new Error('ADMIN_PASSWORD is not configured');
	}

	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
	const nonce = crypto.randomUUID();
	const payload = `${SESSION_VERSION}.${expiresAt}.${nonce}`;
	const signature = await sign(payload, password);

	return `${payload}.${signature}`;
}

export async function isAdminAuthenticated(cookies: Cookies) {
	const password = getAdminPassword();
	const session = cookies.get(SESSION_COOKIE);

	if (!password || !session) {
		return false;
	}

	const parts = session.split('.');
	if (parts.length !== 4 || parts[0] !== SESSION_VERSION) {
		return false;
	}

	const expiresAt = Number(parts[1]);
	if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
		return false;
	}

	const payload = parts.slice(0, 3).join('.');
	const expected = await sign(payload, password);

	return constantTimeEqual(parts[3], expected);
}

export function setAdminSessionCookie(cookies: Cookies, session: string, secure: boolean) {
	cookies.set(SESSION_COOKIE, session, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure,
		maxAge: SESSION_MAX_AGE
	});
}

export function clearAdminSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	cookies.delete(CSRF_COOKIE, { path: '/' });
}

export function createCsrfToken(cookies: Cookies, secure: boolean) {
	const token = crypto.randomUUID();
	cookies.set(CSRF_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure,
		maxAge: SESSION_MAX_AGE
	});
	return token;
}

export function verifyCsrfToken(cookies: Cookies, formData: FormData) {
	const cookieToken = cookies.get(CSRF_COOKIE);
	const formToken = formData.get('csrf');
	return typeof cookieToken === 'string' && typeof formToken === 'string' && constantTimeEqual(cookieToken, formToken);
}

export function safeRedirectPath(value: string | null) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
		return '/admin';
	}

	return value;
}

async function sign(payload: string, secret: string) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string) {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i += 1) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}
