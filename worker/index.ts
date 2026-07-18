import type { CreateRoomResponse } from '../src/shared/protocol';
import { isRoomId, normalizeRoomId, PROTOCOL_VERSION } from '../src/shared/protocol';
import packageMetadata from '../package.json';
import { apiErrorBody, asRoomError, RoomError, type RpcResult } from './errors';
import { GameRoom } from './game-room';
import {
  assertSameOrigin,
  createSessionId,
  displayCookie,
  encodeSessionEnvelope,
  hashSessionId,
  readDisplayIdentity,
  readJsonObject,
  readSessionIdentity,
  sessionCookie,
  type SessionIdentity,
} from './session';
import { parseProfile } from './validation';

declare const __PAIN_IN_MY_DECK_BUILD_VERSION__: string;

interface WorkerEnv extends Omit<Env, 'GAME_ROOMS'> {
  GAME_ROOMS: DurableObjectNamespace<GameRoom>;
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CREATE_ATTEMPTS = 20;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const INTERNAL_SESSION_HEADER = 'X-PID-Session-Hash';
const INTERNAL_GENERATION_HEADER = 'X-PID-Room-Generation';
const INTERNAL_SOCKET_ROLE_HEADER = 'X-PID-Socket-Role';
const BUILD_VERSION =
  typeof __PAIN_IN_MY_DECK_BUILD_VERSION__ === 'string'
    ? __PAIN_IN_MY_DECK_BUILD_VERSION__
    : packageMetadata.version;

function randomRoomId(): string {
  let result = '';
  const random = new Uint8Array(1);
  while (result.length < 5) {
    crypto.getRandomValues(random);
    if (random[0] >= 240) {
      continue;
    }
    result += ROOM_ALPHABET[random[0] % ROOM_ALPHABET.length];
  }
  return result;
}

function clientRateKey(request: Request, suffix: string): string {
  const address = request.headers.get('CF-Connecting-IP') ?? 'local';
  return `${address}:${suffix}`;
}

function unwrap<T>(result: RpcResult<T>): T {
  if (!result.ok) {
    throw new RoomError(
      result.error.code,
      result.error.message,
      result.error.status,
      result.error.title,
    );
  }
  return result.value;
}

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(value), { status, headers: responseHeaders });
}

function securityHeaders(environment: WorkerEnv['ENVIRONMENT']): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Security-Policy':
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  if (environment !== 'development') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return headers;
}

function secureResponse(response: Response, environment: WorkerEnv['ENVIRONMENT']): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of securityHeaders(environment)) {
    headers.set(name, value);
  }
  if (response.status === 101) {
    if (response.webSocket === null) {
      throw new RoomError('INTERNAL_ERROR', 'WebSocket upgrade failed.', 500);
    }
    return new Response(null, {
      status: 101,
      headers,
      webSocket: response.webSocket,
    });
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function socketErrorResponse(error: RoomError, closeCode: number): Response {
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();
  server.send(
    JSON.stringify({
      protocolVersion: PROTOCOL_VERSION,
      type: 'error',
      error: {
        code: error.code,
        message: error.message,
        ...(error.title === undefined ? {} : { title: error.title }),
      },
    }),
  );
  server.close(closeCode, error.code);
  return new Response(null, { status: 101, webSocket: client });
}

function turnstileToken(body: Record<string, unknown>): string | null {
  return typeof body.turnstileToken === 'string' && body.turnstileToken.length <= 2_048
    ? body.turnstileToken
    : null;
}

async function verifyTurnstile(
  token: string | null,
  request: Request,
  env: WorkerEnv,
  expectedAction: 'create_room' | 'enter_room' | 'watch_room',
): Promise<void> {
  if (env.TURNSTILE_REQUIRED !== 'true') {
    return;
  }
  if (token === null || token.length === 0) {
    throw new RoomError('TURNSTILE_REQUIRED', 'Complete the security check to continue.', 403);
  }

  const form = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  const remoteAddress = request.headers.get('CF-Connecting-IP');
  if (remoteAddress !== null) {
    form.set('remoteip', remoteAddress);
  }
  let response: Response;
  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new RoomError(
      'TURNSTILE_UNAVAILABLE',
      'The security check is temporarily unavailable. Try again.',
      503,
    );
  }
  if (!response.ok) {
    throw new RoomError(
      'TURNSTILE_UNAVAILABLE',
      'The security check is temporarily unavailable. Try again.',
      503,
    );
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (
    typeof result !== 'object' ||
    result === null ||
    Array.isArray(result) ||
    !('success' in result) ||
    !('action' in result) ||
    !('hostname' in result) ||
    result.success !== true ||
    result.action !== expectedAction ||
    result.hostname !== new URL(request.url).hostname
  ) {
    throw new RoomError('TURNSTILE_FAILED', 'The security check was not accepted. Try again.', 403);
  }
}

async function enforceRateLimit(binding: RateLimit, key: string): Promise<void> {
  const result = await binding.limit({ key });
  if (!result.success) {
    throw new RoomError('RATE_LIMITED', 'Too many requests. Wait a moment and try again.', 429);
  }
}

async function previousIdentity(request: Request, env: WorkerEnv): Promise<SessionIdentity | null> {
  return readSessionIdentity(request, env.SESSION_SIGNING_KEY);
}

async function bestEffortLeavePrevious(
  previous: SessionIdentity | null,
  nextRoomId: string,
  nextGeneration: string,
  env: WorkerEnv,
  now: number,
): Promise<void> {
  if (
    previous === null ||
    (previous.roomId === nextRoomId && previous.generation === nextGeneration)
  ) {
    return;
  }
  try {
    const sessionHash = await hashSessionId(previous.sessionId, env.SESSION_SIGNING_KEY);
    const stub = env.GAME_ROOMS.getByName(previous.roomId);
    await stub.leaveSession({
      sessionHash,
      generation: previous.generation,
      now,
    });
  } catch {
    // The next room must not fail because an old room is already gone.
  }
}

async function createRoom(request: Request, env: WorkerEnv): Promise<Response> {
  assertSameOrigin(request);
  await enforceRateLimit(env.CREATE_RATE_LIMIT, clientRateKey(request, 'create'));
  const body = await readJsonObject(request);
  await verifyTurnstile(turnstileToken(body), request, env, 'create_room');
  const previous = await previousIdentity(request, env);
  const sessionId = createSessionId();
  const sessionHash = await hashSessionId(sessionId, env.SESSION_SIGNING_KEY);
  const now = Date.now();

  for (let attempt = 0; attempt < ROOM_CREATE_ATTEMPTS; attempt += 1) {
    const roomId = randomRoomId();
    const generation = crypto.randomUUID();
    const stub = env.GAME_ROOMS.getByName(roomId);
    const result = await stub.createRoom({
      roomId,
      generation,
      provisionalSessionHash: sessionHash,
      now,
    });
    if (!result.ok && result.error.code === 'ROOM_EXISTS') {
      continue;
    }
    unwrap(result);
    await bestEffortLeavePrevious(previous, roomId, generation, env, now);
    const envelope = await encodeSessionEnvelope(
      { sessionId, roomId, generation },
      env.SESSION_SIGNING_KEY,
    );
    const response: CreateRoomResponse = { roomId, redirectUrl: `/join/${roomId}` };
    return jsonResponse(response, 201, { 'Set-Cookie': sessionCookie(envelope) });
  }
  throw new RoomError('ROOM_CAPACITY', 'Could not allocate a room code. Try again.', 503);
}

async function returningSession(
  identity: SessionIdentity | null,
  roomId: string,
  env: WorkerEnv,
  now: number,
): Promise<{ response: unknown; sessionHash: string } | null> {
  if (identity === null || identity.roomId !== roomId) {
    return null;
  }
  const sessionHash = await hashSessionId(identity.sessionId, env.SESSION_SIGNING_KEY);
  const stub = env.GAME_ROOMS.getByName(roomId);
  const inspection = await stub.getSessionSnapshot({
    sessionHash,
    generation: identity.generation,
    now,
  });
  if (!inspection.ok) {
    if (
      inspection.error.code === 'INVALID_SESSION' ||
      inspection.error.code === 'PLAYER_REMOVED' ||
      inspection.error.code === 'KICKED' ||
      inspection.error.code === 'ROOM_NOT_FOUND'
    ) {
      return null;
    }
    unwrap(inspection);
  }
  const entered = unwrap(
    await stub.enterRoom({
      sessionHash,
      existingSessionHash: sessionHash,
      generation: identity.generation,
      now,
    }),
  );
  return {
    response: { snapshot: entered.snapshot, needsProfile: entered.needsProfile },
    sessionHash,
  };
}

async function enterRoom(request: Request, roomId: string, env: WorkerEnv): Promise<Response> {
  assertSameOrigin(request);
  const now = Date.now();
  const previous = await previousIdentity(request, env);
  const returning = await returningSession(previous, roomId, env, now);
  if (returning !== null) {
    return jsonResponse(returning.response);
  }

  await enforceRateLimit(env.JOIN_RATE_LIMIT, clientRateKey(request, 'join'));
  const body = await readJsonObject(request);
  const token = turnstileToken(body);
  if (env.TURNSTILE_REQUIRED === 'true' && (token === null || token.length === 0)) {
    throw new RoomError('TURNSTILE_REQUIRED', 'Complete the security check to continue.', 403);
  }
  await verifyTurnstile(token, request, env, 'enter_room');

  const sessionId = createSessionId();
  const sessionHash = await hashSessionId(sessionId, env.SESSION_SIGNING_KEY);
  const stub = env.GAME_ROOMS.getByName(roomId);
  const entered = unwrap(await stub.enterRoom({ sessionHash, now }));
  await bestEffortLeavePrevious(previous, roomId, entered.generation, env, now);
  const envelope = await encodeSessionEnvelope(
    { sessionId, roomId, generation: entered.generation },
    env.SESSION_SIGNING_KEY,
  );
  const response = {
    snapshot: entered.snapshot,
    needsProfile: entered.needsProfile,
  };
  return jsonResponse(response, 200, { 'Set-Cookie': sessionCookie(envelope) });
}

async function returningDisplay(
  identity: SessionIdentity | null,
  roomId: string,
  env: WorkerEnv,
  now: number,
): Promise<{ snapshot: unknown } | null> {
  if (identity === null || identity.roomId !== roomId) {
    return null;
  }
  const stub = env.GAME_ROOMS.getByName(roomId);
  const inspection = await stub.getDisplaySnapshot({
    generation: identity.generation,
    now,
  });
  if (!inspection.ok) {
    if (inspection.error.code === 'INVALID_SESSION') {
      return null;
    }
    unwrap(inspection);
  }
  return { snapshot: unwrap(inspection).snapshot };
}

async function watchRoom(request: Request, roomId: string, env: WorkerEnv): Promise<Response> {
  assertSameOrigin(request);
  const now = Date.now();
  const existingIdentity = await readDisplayIdentity(request, env.SESSION_SIGNING_KEY);
  const returning = await returningDisplay(existingIdentity, roomId, env, now);
  if (returning !== null) {
    return jsonResponse(returning);
  }

  await enforceRateLimit(env.JOIN_RATE_LIMIT, clientRateKey(request, 'join'));
  const body = await readJsonObject(request);
  const token = turnstileToken(body);
  if (env.TURNSTILE_REQUIRED === 'true' && (token === null || token.length === 0)) {
    throw new RoomError('TURNSTILE_REQUIRED', 'Complete the security check to continue.', 403);
  }
  await verifyTurnstile(token, request, env, 'watch_room');

  const stub = env.GAME_ROOMS.getByName(roomId);
  const watched = unwrap(await stub.getDisplaySnapshot({ now }));
  const envelope = await encodeSessionEnvelope(
    {
      sessionId: createSessionId(),
      roomId,
      generation: watched.generation,
    },
    env.SESSION_SIGNING_KEY,
  );
  return jsonResponse({ snapshot: watched.snapshot }, 200, {
    'Set-Cookie': displayCookie(envelope),
  });
}

async function setProfile(request: Request, roomId: string, env: WorkerEnv): Promise<Response> {
  assertSameOrigin(request);
  const identity = await previousIdentity(request, env);
  if (identity === null || identity.roomId !== roomId) {
    throw new RoomError('INVALID_SESSION', 'Enter this room before choosing a profile.', 401);
  }
  const body = await readJsonObject(request);
  const profile = parseProfile(body);
  const sessionHash = await hashSessionId(identity.sessionId, env.SESSION_SIGNING_KEY);
  const stub = env.GAME_ROOMS.getByName(roomId);
  const value = unwrap(
    await stub.setProfile({
      sessionHash,
      generation: identity.generation,
      displayName: profile.displayName,
      colorSet: profile.colorSet,
      now: Date.now(),
    }),
  );
  const response = { snapshot: value.snapshot };
  return jsonResponse(response);
}

async function openSocket(request: Request, roomId: string, env: WorkerEnv): Promise<Response> {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    throw new RoomError('UPGRADE_REQUIRED', 'This endpoint requires a WebSocket upgrade.', 426);
  }
  try {
    assertSameOrigin(request);
  } catch (error) {
    return socketErrorResponse(asRoomError(error), 4001);
  }
  const identity = await previousIdentity(request, env);
  if (identity === null || identity.roomId !== roomId) {
    return socketErrorResponse(
      new RoomError('INVALID_SESSION', 'Enter this room before opening a socket.', 401),
      4001,
    );
  }
  const sessionHash = await hashSessionId(identity.sessionId, env.SESSION_SIGNING_KEY);
  const stub = env.GAME_ROOMS.getByName(roomId);
  const inspection = await stub.getSessionSnapshot({
    sessionHash,
    generation: identity.generation,
    now: Date.now(),
  });
  if (!inspection.ok) {
    const error = new RoomError(
      inspection.error.code,
      inspection.error.message,
      inspection.error.status,
      inspection.error.title,
    );
    return socketErrorResponse(
      error,
      error.code === 'ROOM_NOT_FOUND' ? 4004 : error.code === 'KICKED' ? 4003 : 4001,
    );
  }
  if (inspection.value.me === null) {
    return socketErrorResponse(
      new RoomError('PROFILE_REQUIRED', 'Complete your profile first.', 409),
      4001,
    );
  }
  const headers = new Headers({
    Upgrade: 'websocket',
    [INTERNAL_SESSION_HEADER]: sessionHash,
    [INTERNAL_GENERATION_HEADER]: identity.generation,
    [INTERNAL_SOCKET_ROLE_HEADER]: 'player',
  });
  const requestedProtocol = request.headers.get('Sec-WebSocket-Protocol');
  if (requestedProtocol !== null) {
    headers.set('Sec-WebSocket-Protocol', requestedProtocol);
  }
  const internalRequest = new Request('https://game-room.internal/socket', { headers });
  return stub.fetch(internalRequest);
}

async function openWatchSocket(
  request: Request,
  roomId: string,
  env: WorkerEnv,
): Promise<Response> {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    throw new RoomError('UPGRADE_REQUIRED', 'This endpoint requires a WebSocket upgrade.', 426);
  }
  try {
    assertSameOrigin(request);
  } catch (error) {
    return socketErrorResponse(asRoomError(error), 4001);
  }
  const identity = await readDisplayIdentity(request, env.SESSION_SIGNING_KEY);
  if (identity === null || identity.roomId !== roomId) {
    return socketErrorResponse(
      new RoomError('INVALID_SESSION', 'Watch this room before opening a display socket.', 401),
      4001,
    );
  }

  const stub = env.GAME_ROOMS.getByName(roomId);
  const headers = new Headers({
    Upgrade: 'websocket',
    [INTERNAL_GENERATION_HEADER]: identity.generation,
    [INTERNAL_SOCKET_ROLE_HEADER]: 'display',
  });
  const requestedProtocol = request.headers.get('Sec-WebSocket-Protocol');
  if (requestedProtocol !== null) {
    headers.set('Sec-WebSocket-Protocol', requestedProtocol);
  }
  const internalRequest = new Request('https://game-room.internal/watch-socket', { headers });
  return stub.fetch(internalRequest);
}

async function route(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/api/healthz') {
    if (request.method !== 'GET') {
      return jsonResponse(
        apiErrorBody({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', status: 405 }),
        405,
        { Allow: 'GET' },
      );
    }
    return jsonResponse({ buildVersion: BUILD_VERSION, protocolVersion: PROTOCOL_VERSION });
  }
  if (url.pathname === '/api/rooms') {
    if (request.method !== 'POST') {
      return jsonResponse(
        apiErrorBody({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', status: 405 }),
        405,
        { Allow: 'POST' },
      );
    }
    return createRoom(request, env);
  }

  const match = /^\/api\/rooms\/([^/]+)\/(enter|profile|socket|watch|watch-socket)$/u.exec(
    url.pathname,
  );
  if (match !== null) {
    const roomId = normalizeRoomId(match[1]);
    if (!isRoomId(roomId)) {
      const error = new RoomError('INVALID_ROOM_ID', 'Room codes contain five letters.', 400);
      if (
        (match[2] === 'socket' || match[2] === 'watch-socket') &&
        request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
      ) {
        return socketErrorResponse(error, 4004);
      }
      throw error;
    }
    const action = match[2];
    if (action === 'enter' && request.method === 'POST') {
      return enterRoom(request, roomId, env);
    }
    if (action === 'profile' && request.method === 'POST') {
      return setProfile(request, roomId, env);
    }
    if (action === 'watch' && request.method === 'POST') {
      return watchRoom(request, roomId, env);
    }
    if (action === 'socket' && request.method === 'GET') {
      return openSocket(request, roomId, env);
    }
    if (action === 'watch-socket' && request.method === 'GET') {
      return openWatchSocket(request, roomId, env);
    }
    const allow = action === 'socket' || action === 'watch-socket' ? 'GET' : 'POST';
    return jsonResponse(
      apiErrorBody({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', status: 405 }),
      405,
      { Allow: allow },
    );
  }

  if (url.pathname.startsWith('/api/')) {
    throw new RoomError('NOT_FOUND', 'API endpoint not found.', 404);
  }
  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    let response: Response;
    try {
      response = await route(request, env);
    } catch (error) {
      const roomError = asRoomError(error);
      response = jsonResponse(apiErrorBody(roomError.toPublicError()), roomError.status);
    }
    return secureResponse(response, env.ENVIRONMENT);
  },
} satisfies ExportedHandler<WorkerEnv>;

export { GameRoom };
