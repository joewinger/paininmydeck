import { RoomError } from './errors';

const SESSION_ID_BYTES = 16;
const COOKIE_NAME = '__Host-pid_session';
const DISPLAY_COOKIE_NAME = '__Host-pid_display';
const COOKIE_VERSION = 'v1';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const DISPLAY_MAX_AGE_SECONDS = 24 * 60 * 60;

export interface SessionIdentity {
  sessionId: string;
  roomId: string;
  generation: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null;
  }
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmac(message: string, signingKey: string): Promise<ArrayBuffer> {
  if (signingKey.length < 32) {
    throw new RoomError(
      'SERVER_MISCONFIGURED',
      'Session signing is not configured correctly.',
      500,
    );
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

function parseIdentity(value: unknown): SessionIdentity | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('sessionId' in value) ||
    !('roomId' in value) ||
    !('generation' in value) ||
    typeof value.sessionId !== 'string' ||
    typeof value.roomId !== 'string' ||
    typeof value.generation !== 'string' ||
    !/^[A-Za-z0-9_-]{22}$/u.test(value.sessionId) ||
    !/^[A-HJ-NP-Z]{5}$/u.test(value.roomId) ||
    value.generation.length < 16 ||
    value.generation.length > 128
  ) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    roomId: value.roomId,
    generation: value.generation,
  };
}

export function createSessionId(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_ID_BYTES)));
}

export async function hashSessionId(sessionId: string, signingKey: string): Promise<string> {
  const digest = await hmac(`session-id:${sessionId}`, signingKey);
  return bytesToHex(new Uint8Array(digest));
}

export async function encodeSessionEnvelope(
  identity: SessionIdentity,
  signingKey: string,
): Promise<string> {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        sessionId: identity.sessionId,
        roomId: identity.roomId,
        generation: identity.generation,
      }),
    ),
  );
  const signed = `${COOKIE_VERSION}.${payload}`;
  const signature = bytesToBase64Url(new Uint8Array(await hmac(signed, signingKey)));
  return `${signed}.${signature}`;
}

export async function decodeSessionEnvelope(
  value: string,
  signingKey: string,
): Promise<SessionIdentity | null> {
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== COOKIE_VERSION) {
    return null;
  }
  const payload = parts[1];
  const suppliedSignature = base64UrlToBytes(parts[2]);
  const payloadBytes = base64UrlToBytes(payload);
  if (suppliedSignature === null || payloadBytes === null) {
    return null;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    suppliedSignature,
    encoder.encode(`${COOKIE_VERSION}.${payload}`),
  );
  if (!valid) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  return parseIdentity(decoded);
}

function readCookieValue(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader === null) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== cookieName) {
      continue;
    }
    const value = part.slice(separator + 1).trim();
    return value.length <= 1_024 ? value : null;
  }
  return null;
}

export function readSessionCookieValue(request: Request): string | null {
  return readCookieValue(request, COOKIE_NAME);
}

function readDisplayCookieValue(request: Request): string | null {
  return readCookieValue(request, DISPLAY_COOKIE_NAME);
}

export async function readSessionIdentity(
  request: Request,
  signingKey: string,
): Promise<SessionIdentity | null> {
  const value = readSessionCookieValue(request);
  return value === null ? null : decodeSessionEnvelope(value, signingKey);
}

export async function readDisplayIdentity(
  request: Request,
  signingKey: string,
): Promise<SessionIdentity | null> {
  const value = readDisplayCookieValue(request);
  return value === null ? null : decodeSessionEnvelope(value, signingKey);
}

export function sessionCookie(envelope: string): string {
  return `${COOKIE_NAME}=${envelope}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function displayCookie(envelope: string): string {
  return `${DISPLAY_COOKIE_NAME}=${envelope}; Path=/; Max-Age=${DISPLAY_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin');
  const expected = new URL(request.url).origin;
  if (origin === null || origin !== expected) {
    throw new RoomError('INVALID_ORIGIN', 'This request must come from the game site.', 403);
  }
}

export async function readJsonObject(
  request: Request,
  maxBytes = 8_192,
): Promise<Record<string, unknown>> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength !== null && Number(contentLength) > maxBytes) {
    throw new RoomError('PAYLOAD_TOO_LARGE', 'The request body is too large.', 413);
  }

  if (request.body === null) {
    return {};
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) {
      break;
    }
    totalBytes += result.value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel('Request body exceeds the configured limit.');
      throw new RoomError('PAYLOAD_TOO_LARGE', 'The request body is too large.', 413);
    }
    chunks.push(result.value);
  }
  if (totalBytes === 0) {
    return {};
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    throw new RoomError('INVALID_JSON', 'The request body is not valid UTF-8 JSON.', 400);
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new RoomError('INVALID_JSON', 'The request body is not valid JSON.', 400);
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RoomError('INVALID_JSON', 'The request body must be a JSON object.', 400);
  }
  return value as Record<string, unknown>;
}
