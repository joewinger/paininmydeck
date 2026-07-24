/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { evictDurableObject, env, reset, runInDurableObject, SELF } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameSnapshot, ServerSocketMessage, SnapshotMessage } from '../src/shared/protocol';
import { GameRoom } from './game-room';
import worker from './index';
import { parseClientCommand } from './validation';

const rooms = env.GAME_ROOMS as DurableObjectNamespace<GameRoom>;
const TEST_SESSION_SIGNING_KEY = 'worker-test-session-signing-key-32-bytes-minimum';
const testEnv = new Proxy(env, {
  get(target, property, receiver) {
    if (property === 'SESSION_SIGNING_KEY') return TEST_SESSION_SIGNING_KEY;
    if (property === 'TURNSTILE_SECRET_KEY') return 'worker-test-turnstile-secret';
    return Reflect.get(target, property, receiver);
  },
});
const turnstileRequiredTestEnv = new Proxy(testEnv, {
  get(target, property, receiver) {
    if (property === 'TURNSTILE_REQUIRED') return 'true';
    return Reflect.get(target, property, receiver);
  },
});

function fetchWorker(url: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(url, init), testEnv);
}

function fetchWorkerRequiringTurnstile(url: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(url, init), turnstileRequiredTestEnv);
}

function waitForSocketFrame<T extends ServerSocketMessage>(
  socket: WebSocket,
  predicate: (frame: ServerSocketMessage) => frame is T,
  label = 'socket frame',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeEventListener('message', listener);
      reject(new Error(`Timed out waiting for ${label}.`));
    }, 2_000);
    const listener = (event: MessageEvent) => {
      const frame = JSON.parse(String(event.data)) as ServerSocketMessage;
      if (!predicate(frame)) return;
      clearTimeout(timeout);
      socket.removeEventListener('message', listener);
      resolve(frame);
    };
    socket.addEventListener('message', listener);
  });
}

afterEach(async () => {
  await reset();
});

describe('GameRoom integration', () => {
  it('accepts only the empty host rematch command payload', () => {
    expect(
      parseClientCommand({
        protocolVersion: 1,
        commandId: 'play-again',
        type: 'play_again',
        payload: {},
      }),
    ).toEqual({
      protocolVersion: 1,
      commandId: 'play-again',
      type: 'play_again',
      payload: {},
    });
    expect(() =>
      parseClientCommand({
        protocolVersion: 1,
        commandId: 'play-again-with-data',
        type: 'play_again',
        payload: { preserveScore: true },
      }),
    ).toThrow('This command does not accept a payload.');
  });

  it('serves the versioned health contract with API security headers', async () => {
    const response = await SELF.fetch('https://game.test/api/healthz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ buildVersion: '1.0.0', protocolVersion: 1 });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });

  it('upgrades missing-session socket attempts to a typed terminal error', async () => {
    const response = await SELF.fetch('https://game.test/api/rooms/ABCDE/socket', {
      headers: { Origin: 'https://game.test', Upgrade: 'websocket' },
    });
    expect(response.status).toBe(101);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const socket = response.webSocket;
    if (socket === null) {
      throw new Error('Expected a WebSocket');
    }
    const result = await new Promise<{ frame: unknown; closeCode: number }>((resolve) => {
      let frame: unknown = null;
      socket.addEventListener('message', (event) => {
        frame = JSON.parse(String(event.data));
      });
      socket.addEventListener('close', (event) => {
        resolve({ frame, closeCode: event.code });
      });
      socket.accept();
    });
    expect(result).toMatchObject({
      frame: { protocolVersion: 1, type: 'error', error: { code: 'INVALID_SESSION' } },
      closeCode: 4001,
    });
  });

  it('does not create SQLite tables for a nonexistent-room probe', async () => {
    const stub = rooms.getByName('ZZZZZ');
    const result = await stub.enterRoom({
      sessionHash: 'a'.repeat(64),
      now: Date.now(),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'ROOM_NOT_FOUND', status: 404 },
    });
    const tableCount = await runInDurableObject(
      stub,
      (_instance, state) =>
        state.storage.sql
          .exec<{ value: number }>(
            `SELECT COUNT(*) AS value FROM sqlite_master
					 WHERE type = 'table' AND name = 'room_state'`,
          )
          .one().value,
    );
    expect(tableCount).toBe(0);
  });

  it('initializes a private lobby and reuses its exact provisional session', async () => {
    const stub = rooms.getByName('ABCDE');
    const now = Date.now();
    const generation = crypto.randomUUID();
    const sessionHash = 'b'.repeat(64);

    expect(
      await stub.createRoom({
        roomId: 'ABCDE',
        generation,
        provisionalSessionHash: sessionHash,
        now,
      }),
    ).toEqual({ ok: true, value: { created: true } });

    const entered = await stub.enterRoom({
      sessionHash,
      existingSessionHash: sessionHash,
      generation,
      now: now + 1,
    });
    expect(entered).toMatchObject({
      ok: true,
      value: {
        generation,
        needsProfile: true,
        snapshot: {
          protocolVersion: 1,
          room: { roomId: 'ABCDE', phase: 'LOBBY', players: [] },
          me: null,
        },
      },
    });
  });

  it('watches a started room through a separate read-only display session', async () => {
    const roomId = 'TVWXY';
    const stub = rooms.getByName(roomId);
    const now = Date.now();
    const generation = crypto.randomUUID();
    const provisionalSessionHash = 'c'.repeat(64);

    await stub.createRoom({
      roomId,
      generation,
      provisionalSessionHash,
      now,
    });
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        state.storage.sql.exec(
          `INSERT INTO players (
            player_id, display_name, normalized_name, color_primary,
            color_secondary, points, czar_order, connected,
            redraws_used, joined_at, left_at, kicked_at
          ) VALUES (
            'private-player', 'Private Player', 'private player', '#EE796E',
            '#FAB4AD', 2, 0, 0, 0, ?, NULL, NULL
          )`,
          now,
        );
        state.storage.sql.exec(
          `INSERT INTO card_instances (
            instance_id, catalog_id, text, is_blank, location, owner_player_id, position
          ) VALUES (
            'private-hand-card', 'private-catalog-card', 'Never broadcast this hand.',
            0, 'hand', 'private-player', 0
          )`,
        );
        state.storage.sql.exec(
          `UPDATE room_state
           SET game_state = 'PLAYING', host_player_id = 'private-player',
               round_number = 1, round_id = 'display-round',
               question_text = 'A public question?', czar_player_id = 'private-player'
           WHERE singleton = 1`,
        );
      });
    });
    expect(
      await stub.getDisplaySnapshot({ generation: crypto.randomUUID(), now: now + 1 }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION', status: 401 } });

    const watchResponse = await fetchWorker(`https://game.test/api/rooms/${roomId}/watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: '__Host-pid_session=player-cookie-must-survive',
        Origin: 'https://game.test',
      },
      body: '{}',
    });
    expect(watchResponse.status).toBe(200);
    const setCookie = watchResponse.headers.get('set-cookie');
    expect(setCookie).toContain('__Host-pid_display=');
    expect(setCookie).toContain('Max-Age=86400');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).not.toContain('__Host-pid_session=');
    const watched = await watchResponse.json<{ snapshot: GameSnapshot }>();
    expect(watched.snapshot).toMatchObject({
      room: {
        roomId,
        phase: 'COLLECTING',
        players: [{ playerId: 'private-player', points: 2, connected: false }],
      },
      me: null,
    });
    expect(JSON.stringify(watched)).not.toContain('private-hand-card');
    expect(JSON.stringify(watched)).not.toContain('Never broadcast this hand.');

    if (setCookie === null) {
      throw new Error('Expected a display cookie.');
    }
    const displayCookie = setCookie.split(';', 1)[0];
    const resumedResponse = await fetchWorkerRequiringTurnstile(
      `https://game.test/api/rooms/${roomId}/watch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${displayCookie}; __Host-pid_session=player-cookie-must-survive`,
          Origin: 'https://game.test',
        },
        body: '{}',
      },
    );
    expect(resumedResponse.status).toBe(200);
    expect(resumedResponse.headers.get('set-cookie')).toBeNull();
    expect(await resumedResponse.json()).toMatchObject({
      snapshot: { room: { roomId }, me: null },
    });

    const socketResponse = await fetchWorker(`https://game.test/api/rooms/${roomId}/watch-socket`, {
      headers: {
        Cookie: displayCookie,
        Origin: 'https://game.test',
        Upgrade: 'websocket',
      },
    });
    expect(socketResponse.status).toBe(101);
    const socket = socketResponse.webSocket;
    if (socket === null) {
      throw new Error('Expected a display WebSocket.');
    }
    const result = await new Promise<{
      snapshot: GameSnapshot | null;
      error: ServerSocketMessage | null;
      closeCode: number;
    }>((resolve) => {
      let snapshot: GameSnapshot | null = null;
      let error: ServerSocketMessage | null = null;
      let commandSent = false;
      socket.addEventListener('message', (event) => {
        const frame = JSON.parse(String(event.data)) as ServerSocketMessage;
        if (frame.type === 'snapshot') {
          snapshot = frame.snapshot;
          if (commandSent) return;
          commandSent = true;
          socket.send(
            JSON.stringify({
              protocolVersion: 1,
              commandId: 'display-command',
              type: 'request_snapshot',
              payload: {},
            }),
          );
        } else if (frame.type === 'error') {
          error = frame;
        }
      });
      socket.addEventListener('close', (event) => {
        resolve({ snapshot, error, closeCode: event.code });
      });
      socket.accept();
    });
    expect(result.snapshot).toMatchObject({ room: { roomId }, me: null });
    expect(result.error).toMatchObject({ type: 'error', error: { code: 'READ_ONLY' } });
    expect(result.closeCode).toBe(1008);

    const presence = await runInDurableObject(stub, (_instance, state) => ({
      connected: state.storage.sql
        .exec<{ connected: number }>(
          "SELECT connected FROM players WHERE player_id = 'private-player'",
        )
        .one().connected,
      disconnectJobs: state.storage.sql
        .exec<{ value: number }>(
          "SELECT COUNT(*) AS value FROM scheduled_jobs WHERE job_type = 'disconnect'",
        )
        .one().value,
      playerCount: state.storage.sql
        .exec<{ value: number }>('SELECT COUNT(*) AS value FROM players')
        .one().value,
      sessionCount: state.storage.sql
        .exec<{ value: number }>('SELECT COUNT(*) AS value FROM sessions')
        .one().value,
    }));
    expect(presence).toEqual({
      connected: 0,
      disconnectJobs: 0,
      playerCount: 1,
      sessionCount: 1,
    });
  });

  it('broadcasts one public update to hibernated display attachments after a player command', async () => {
    const roomId = 'VWXYZ';
    const stub = rooms.getByName(roomId);
    const now = Date.now();
    const generation = crypto.randomUUID();
    const sessionHash = 'd'.repeat(64);

    await stub.createRoom({
      roomId,
      generation,
      provisionalSessionHash: sessionHash,
      now,
    });
    expect(
      await stub.setProfile({
        sessionHash,
        generation,
        displayName: 'Broadcaster',
        colorSet: ['#EE796E', '#FAB4AD'],
        now: now + 1,
      }),
    ).toMatchObject({ ok: true, value: { snapshot: { me: { displayName: 'Broadcaster' } } } });

    const playerResponse = await stub.fetch(
      new Request('https://game-room.internal/socket', {
        headers: {
          Upgrade: 'websocket',
          'X-PID-Session-Hash': sessionHash,
          'X-PID-Room-Generation': generation,
          'X-PID-Socket-Role': 'player',
        },
      }),
    );
    const playerSocket = playerResponse.webSocket;
    if (playerSocket === null) {
      throw new Error('Expected a player WebSocket.');
    }
    const playerInitial = waitForSocketFrame(
      playerSocket,
      (frame): frame is SnapshotMessage => frame.type === 'snapshot',
      'the player initial snapshot',
    );
    playerSocket.accept();
    await playerInitial;

    const watchResponse = await fetchWorker(`https://game.test/api/rooms/${roomId}/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://game.test' },
      body: '{}',
    });
    const setCookie = watchResponse.headers.get('set-cookie');
    if (setCookie === null) {
      throw new Error('Expected a display cookie.');
    }
    const displayCookie = setCookie.split(';', 1)[0];
    const displayResponses = await Promise.all(
      Array.from({ length: 1 }, () =>
        fetchWorker(`https://game.test/api/rooms/${roomId}/watch-socket`, {
          headers: {
            Cookie: displayCookie,
            Origin: 'https://game.test',
            Upgrade: 'websocket',
          },
        }),
      ),
    );
    const displaySockets = displayResponses.map((response) => {
      if (response.webSocket === null) {
        throw new Error('Expected a display WebSocket.');
      }
      return response.webSocket;
    });
    const displayInitials = displaySockets.map((socket) =>
      waitForSocketFrame(
        socket,
        (frame): frame is SnapshotMessage => frame.type === 'snapshot',
        'a display initial snapshot',
      ),
    );
    for (const socket of displaySockets) socket.accept();
    await Promise.all(displayInitials);

    await evictDurableObject(stub, { webSockets: 'hibernate' });

    const secondDisplayResponse = await fetchWorker(
      `https://game.test/api/rooms/${roomId}/watch-socket`,
      {
        headers: {
          Cookie: displayCookie,
          Origin: 'https://game.test',
          Upgrade: 'websocket',
        },
      },
    );
    const secondDisplaySocket = secondDisplayResponse.webSocket;
    if (secondDisplaySocket === null) {
      throw new Error('Expected a second display WebSocket.');
    }
    const secondDisplayInitial = waitForSocketFrame(
      secondDisplaySocket,
      (frame): frame is SnapshotMessage => frame.type === 'snapshot',
      'the second display initial snapshot',
    );
    secondDisplaySocket.accept();
    await secondDisplayInitial;
    displaySockets.push(secondDisplaySocket);

    const hasBroadcastChat = (frame: ServerSocketMessage): frame is SnapshotMessage =>
      frame.type === 'snapshot' &&
      frame.snapshot.room.chatMessages.some(
        (message) => message.text === 'Still on the big screen',
      );
    const playerUpdate = waitForSocketFrame(
      playerSocket,
      hasBroadcastChat,
      'the player chat snapshot',
    );
    const displayUpdates = displaySockets.map((socket) =>
      waitForSocketFrame(socket, hasBroadcastChat, 'a display chat broadcast'),
    );
    playerSocket.send(
      JSON.stringify({
        protocolVersion: 1,
        commandId: 'chat-after-hibernation',
        type: 'send_chat',
        payload: { text: 'Still on the big screen' },
      }),
    );

    const [playerFrame, ...displayFrames] = await Promise.all([playerUpdate, ...displayUpdates]);
    expect(playerFrame.snapshot.me).toMatchObject({ displayName: 'Broadcaster' });
    expect(displayFrames).toHaveLength(2);
    expect(displayFrames[0]).toEqual(displayFrames[1]);
    for (const frame of displayFrames) {
      expect(frame.snapshot).toMatchObject({
        revision: playerFrame.snapshot.revision,
        room: { roomId },
        me: null,
      });
    }

    playerSocket.close(1000, 'Test complete');
    for (const socket of displaySockets) socket.close(1000, 'Test complete');
  });

  it('lazily applies newer migrations to existing rooms without writing on probes', async () => {
    const stub = rooms.getByName('BCDEF');
    const now = Date.now();
    const generation = crypto.randomUUID();
    const sessionHash = '7'.repeat(64);

    await stub.createRoom({
      roomId: 'BCDEF',
      generation,
      provisionalSessionHash: sessionHash,
      now,
    });
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        state.storage.sql.exec('DROP TABLE inbound_rate_limits');
        state.storage.sql.exec(`
          CREATE TABLE command_rate_limits (
            session_hash TEXT PRIMARY KEY,
            tokens REAL NOT NULL,
            last_refill_at INTEGER NOT NULL
          )
        `);
        state.storage.sql.exec('ALTER TABLE room_state DROP COLUMN hand_redeal_mode');
        state.storage.sql.exec('DELETE FROM _sql_schema_migrations WHERE version >= 2');
      });
    });
    await evictDurableObject(stub);

    expect(await stub.getSessionSnapshot({ sessionHash, generation, now: now + 1 })).toMatchObject({
      ok: true,
      value: { room: { roomId: 'BCDEF' } },
    });
    const schema = await runInDurableObject(stub, (_instance, state) => ({
      inboundTable: state.storage.sql
        .exec<{ value: number }>(
          `SELECT COUNT(*) AS value FROM sqlite_master
           WHERE type = 'table' AND name = 'inbound_rate_limits'`,
        )
        .one().value,
      legacyTable: state.storage.sql
        .exec<{ value: number }>(
          `SELECT COUNT(*) AS value FROM sqlite_master
           WHERE type = 'table' AND name = 'command_rate_limits'`,
        )
        .one().value,
      handRedealMode: state.storage.sql
        .exec<{ value: string }>(
          'SELECT hand_redeal_mode AS value FROM room_state WHERE singleton = 1',
        )
        .one().value,
      version: state.storage.sql
        .exec<{ value: number }>('SELECT MAX(version) AS value FROM _sql_schema_migrations')
        .one().value,
    }));
    expect(schema).toEqual({
      inboundTable: 1,
      legacyTable: 0,
      handRedealMode: 'replenish',
      version: 3,
    });
  });

  it('debits the authenticated inbound limit before parsing and receipt replay', async () => {
    const stub = rooms.getByName('BDFGH');
    const now = Date.now();
    const generation = crypto.randomUUID();
    const sessionHash = '6'.repeat(64);

    await stub.createRoom({
      roomId: 'BDFGH',
      generation,
      provisionalSessionHash: sessionHash,
      now,
    });
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        state.storage.sql.exec(
          `INSERT INTO players (
            player_id, display_name, normalized_name, color_primary,
            color_secondary, points, czar_order, connected,
            redraws_used, joined_at, left_at, kicked_at
          ) VALUES (
            'rate-player', 'Rate Player', 'rate player', '#EE796E',
            '#FAB4AD', 0, 0, 1, 0, ?, NULL, NULL
          )`,
          now,
        );
        state.storage.sql.exec(
          `UPDATE sessions
           SET player_id = 'rate-player', expires_at = ?
           WHERE session_hash = ?`,
          now + 60_000,
          sessionHash,
        );
        state.storage.sql.exec(
          `UPDATE room_state
           SET host_player_id = 'rate-player'
           WHERE singleton = 1`,
        );
        state.storage.sql.exec(
          `INSERT INTO inbound_rate_limits (session_hash, tokens, last_refill_at)
           VALUES (?, 1, ?)`,
          sessionHash,
          now + 60_000,
        );
      });
    });

    const response = await stub.fetch(
      new Request('https://game-room.internal/socket', {
        headers: {
          Upgrade: 'websocket',
          'X-PID-Session-Hash': sessionHash,
          'X-PID-Room-Generation': generation,
        },
      }),
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket;
    if (socket === null) {
      throw new Error('Expected a WebSocket');
    }
    socket.accept();

    const waitForError = (code: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.removeEventListener('message', handleMessage);
          reject(new Error(`Timed out waiting for ${code}`));
        }, 2_000);
        const handleMessage = (event: MessageEvent) => {
          const frame = JSON.parse(String(event.data)) as {
            type?: string;
            error?: { code?: string };
          };
          if (frame.type === 'error' && frame.error?.code === code) {
            clearTimeout(timeout);
            socket.removeEventListener('message', handleMessage);
            resolve();
          }
        };
        socket.addEventListener('message', handleMessage);
      });

    const invalidFrame = waitForError('INVALID_COMMAND');
    socket.send(new Uint8Array([1, 2, 3]).buffer);
    await invalidFrame;
    const malformedRateLimit = waitForError('RATE_LIMITED');
    socket.send('{');
    await malformedRateLimit;

    await runInDurableObject(stub, (_instance, state) => {
      state.storage.sql.exec(
        `UPDATE inbound_rate_limits
         SET tokens = 2, last_refill_at = ?
         WHERE session_hash = ?`,
        now + 60_000,
        sessionHash,
      );
    });
    const exactCommand = JSON.stringify({
      protocolVersion: 1,
      commandId: 'same-receipt',
      type: 'request_snapshot',
      payload: {},
    });
    const replayRateLimit = waitForError('RATE_LIMITED');
    socket.send(exactCommand);
    socket.send(exactCommand);
    socket.send(exactCommand);
    await replayRateLimit;

    const receiptCount = await runInDurableObject(
      stub,
      (_instance, state) =>
        state.storage.sql
          .exec<{ value: number }>(
            `SELECT COUNT(*) AS value FROM command_receipts
           WHERE command_id = 'same-receipt'`,
          )
          .one().value,
    );
    expect(receiptCount).toBe(1);
    socket.close(1000, 'Test complete');
  });

  it('revokes provisional sessions that reach a started room', async () => {
    const stub = rooms.getByName('CDEFG');
    const now = Date.now();
    const generation = crypto.randomUUID();
    const snapshotSession = '8'.repeat(64);
    const enterSession = '9'.repeat(64);

    await stub.createRoom({
      roomId: 'CDEFG',
      generation,
      provisionalSessionHash: snapshotSession,
      now,
    });
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        state.storage.sql.exec(
          `INSERT INTO sessions (
            session_hash, room_generation, player_id, is_creator,
            created_at, last_seen_at, expires_at, revoked_at
          ) VALUES (?, ?, NULL, 0, ?, ?, ?, NULL)`,
          enterSession,
          generation,
          now,
          now,
          now + 60_000,
        );
        state.storage.sql.exec("UPDATE room_state SET game_state = 'PLAYING' WHERE singleton = 1");
      });
    });

    expect(
      await stub.enterRoom({
        sessionHash: enterSession,
        existingSessionHash: enterSession,
        generation,
        now: now + 1,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_LOCKED' } });
    expect(
      await stub.getSessionSnapshot({
        sessionHash: snapshotSession,
        generation,
        now: now + 2,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_LOCKED' } });

    const activeProvisionalSessions = await runInDurableObject(
      stub,
      (_instance, state) =>
        state.storage.sql
          .exec<{ value: number }>(
            'SELECT COUNT(*) AS value FROM sessions WHERE player_id IS NULL AND revoked_at IS NULL',
          )
          .one().value,
    );
    expect(activeProvisionalSessions).toBe(0);
  });

  it('preserves a revealed result and starts a fresh round when a player leaves', async () => {
    const stub = rooms.getByName('DEFGH');
    const now = Date.now();
    const generation = crypto.randomUUID();
    const sessionHashes = ['1', '2', '3', '4'].map((character) => character.repeat(64));
    const colors = [
      ['#EE796E', '#FAB4AD'],
      ['#F2A971', '#FCD4B5'],
      ['#F4C876', '#FDE6B9'],
      ['#ADD787', '#CAEBAD'],
    ] as const;

    await stub.createRoom({
      roomId: 'DEFGH',
      generation,
      provisionalSessionHash: sessionHashes[0],
      now,
    });
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        for (let index = 0; index < 4; index += 1) {
          state.storage.sql.exec(
            `INSERT INTO players (
              player_id, display_name, normalized_name, color_primary,
              color_secondary, points, czar_order, connected,
              redraws_used, joined_at, left_at, kicked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, NULL, NULL)`,
            `reveal-player-${index}`,
            `Reveal Player ${index}`,
            `reveal player ${index}`,
            colors[index][0],
            colors[index][1],
            index === 1 ? 1 : 0,
            index,
            now + index,
          );
          if (index === 0) {
            state.storage.sql.exec(
              `UPDATE sessions
               SET player_id = ?, expires_at = ?
               WHERE session_hash = ?`,
              'reveal-player-0',
              now + 60_000,
              sessionHashes[0],
            );
          } else {
            state.storage.sql.exec(
              `INSERT INTO sessions (
                session_hash, room_generation, player_id, is_creator,
                created_at, last_seen_at, expires_at, revoked_at
              ) VALUES (?, ?, ?, 0, ?, ?, ?, NULL)`,
              sessionHashes[index],
              generation,
              `reveal-player-${index}`,
              now,
              now,
              now + 60_000,
            );
          }
        }
        state.storage.sql.exec(
          `UPDATE room_state
           SET game_state = 'PLAYING', host_player_id = 'reveal-player-0',
               cards_per_hand = 1, round_number = 1, completed_rounds = 1,
               round_id = 'reveal-round-1', question_id = 'question-current',
               question_text = 'Current question?', czar_player_id = 'reveal-player-0',
               turn_status = 'REVEAL', winning_submission_id = 'submission-1',
               reveal_deadline = ?
           WHERE singleton = 1`,
          now + 4_000,
        );
        state.storage.sql.exec(
          `INSERT INTO question_cards (instance_id, catalog_id, text, state, position)
           VALUES ('question-current', 'current', 'Current question?', 'used', 0),
                  ('question-next', 'next', 'Next question?', 'draw', 1)`,
        );
        state.storage.sql.exec(
          `INSERT INTO card_instances (
            instance_id, catalog_id, text, is_blank, location, owner_player_id, position
          ) VALUES
            ('czar-hand', 'czar-card', 'Czar card.', 0, 'hand', 'reveal-player-0', 0),
            ('played-1', 'answer-1', 'Answer one.', 0, 'played', 'reveal-player-1', 0),
            ('played-2', NULL, '', 1, 'played', 'reveal-player-2', 0),
            ('played-3', 'answer-3', 'Answer three.', 0, 'played', 'reveal-player-3', 0)`,
        );
        for (let index = 1; index < 4; index += 1) {
          state.storage.sql.exec(
            `INSERT INTO submissions (
              submission_id, round_id, player_id, card_instance_id,
              custom_text, display_order, is_winner, created_at
            ) VALUES (?, 'reveal-round-1', ?, ?, ?, ?, ?, ?)`,
            `submission-${index}`,
            `reveal-player-${index}`,
            `played-${index}`,
            index === 2 ? 'A custom answer.' : null,
            index,
            index === 1 ? 1 : 0,
            now + index,
          );
        }
        state.storage.sql.exec(
          `INSERT INTO rounds (
            round_number, round_id, question, winning_answer,
            winning_player_id, winning_player_name, completed_at
          ) VALUES (
            1, 'reveal-round-1', 'Current question?', 'Answer one.',
            'reveal-player-1', 'Reveal Player 1', ?
          )`,
          now,
        );
        for (let index = 1; index < 4; index += 1) {
          state.storage.sql.exec(
            `INSERT INTO round_answers (
              round_number, answer_order, text, player_id, player_name, is_winner
            ) VALUES (1, ?, ?, ?, ?, ?)`,
            index,
            index === 2 ? 'A custom answer.' : `Answer ${index}.`,
            `reveal-player-${index}`,
            `Reveal Player ${index}`,
            index === 1 ? 1 : 0,
          );
        }
        state.storage.sql.exec(
          `INSERT INTO scheduled_jobs (job_type, job_key, due_at)
           VALUES ('reveal', 'reveal-round-1', ?)`,
          now + 4_000,
        );
      });
    });

    expect(
      await stub.leaveSession({
        sessionHash: sessionHashes[3],
        generation,
        now: now + 10,
      }),
    ).toEqual({ ok: true, value: { left: true } });

    const persisted = await runInDurableObject(stub, (_instance, state) => ({
      room: state.storage.sql
        .exec<{
          round_number: number;
          completed_rounds: number;
          turn_status: string;
          czar_player_id: string;
          question_id: string;
          winning_submission_id: string | null;
        }>(
          `SELECT round_number, completed_rounds, turn_status, czar_player_id,
                  question_id, winning_submission_id
           FROM room_state WHERE singleton = 1`,
        )
        .one(),
      winnerPoints: state.storage.sql
        .exec<{ value: number }>(
          "SELECT points AS value FROM players WHERE player_id = 'reveal-player-1'",
        )
        .one().value,
      historyRows: state.storage.sql
        .exec<{ value: number }>('SELECT COUNT(*) AS value FROM rounds')
        .one().value,
      answerRows: state.storage.sql
        .exec<{ value: number }>('SELECT COUNT(*) AS value FROM round_answers')
        .one().value,
      submissions: state.storage.sql
        .exec<{ value: number }>('SELECT COUNT(*) AS value FROM submissions')
        .one().value,
      revealJobs: state.storage.sql
        .exec<{ value: number }>(
          "SELECT COUNT(*) AS value FROM scheduled_jobs WHERE job_type = 'reveal'",
        )
        .one().value,
      cards: state.storage.sql
        .exec<{ instance_id: string; location: string; owner_player_id: string | null }>(
          `SELECT instance_id, location, owner_player_id
           FROM card_instances WHERE instance_id LIKE 'played-%'
           ORDER BY instance_id`,
        )
        .toArray(),
    }));
    expect(persisted).toEqual({
      room: {
        round_number: 2,
        completed_rounds: 1,
        turn_status: 'WAITING_FOR_CARDS',
        czar_player_id: 'reveal-player-0',
        question_id: 'question-next',
        winning_submission_id: null,
      },
      winnerPoints: 1,
      historyRows: 1,
      answerRows: 3,
      submissions: 0,
      revealJobs: 0,
      cards: [
        { instance_id: 'played-1', location: 'hand', owner_player_id: 'reveal-player-1' },
        { instance_id: 'played-2', location: 'hand', owner_player_id: 'reveal-player-2' },
        { instance_id: 'played-3', location: 'discard', owner_player_id: null },
      ],
    });
  });

  it('rolls back a departure when round restart cannot be completed', async () => {
    const stub = rooms.getByName('HJKLM');
    const now = Date.now();
    const generation = crypto.randomUUID();
    const sessionHashes = ['c', 'd', 'e', 'f'].map((character) => character.repeat(64));
    const colors = [
      ['#EE796E', '#FAB4AD'],
      ['#F2A971', '#FCD4B5'],
      ['#F4C876', '#FDE6B9'],
      ['#ADD787', '#CAEBAD'],
    ] as const;

    await stub.createRoom({
      roomId: 'HJKLM',
      generation,
      provisionalSessionHash: sessionHashes[0],
      now,
    });
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        for (let index = 0; index < 4; index += 1) {
          state.storage.sql.exec(
            `INSERT INTO players (
							player_id, display_name, normalized_name, color_primary,
							color_secondary, points, czar_order, connected,
							redraws_used, joined_at, left_at, kicked_at
						) VALUES (?, ?, ?, ?, ?, 0, ?, 1, 0, ?, NULL, NULL)`,
            `player-${index}`,
            `Player ${index}`,
            `player ${index}`,
            colors[index][0],
            colors[index][1],
            index,
            now + index,
          );
          if (index === 0) {
            state.storage.sql.exec(
              'UPDATE sessions SET player_id = ?, expires_at = ? WHERE session_hash = ?',
              'player-0',
              now + 60_000,
              sessionHashes[0],
            );
          } else {
            state.storage.sql.exec(
              `INSERT INTO sessions (
								session_hash, room_generation, player_id, is_creator,
								created_at, last_seen_at, expires_at, revoked_at
							) VALUES (?, ?, ?, 0, ?, ?, ?, NULL)`,
              sessionHashes[index],
              generation,
              `player-${index}`,
              now,
              now,
              now + 60_000,
            );
          }
        }
        state.storage.sql.exec(
          `UPDATE room_state
					 SET game_state = 'PLAYING', host_player_id = 'player-0',
					     round_number = 1, round_id = 'round-1',
					     question_id = 'missing-question', question_text = 'Question?',
					     czar_player_id = 'player-0', turn_status = 'WAITING_FOR_CARDS'
					 WHERE singleton = 1`,
        );
      });
    });

    const result = await stub.leaveSession({
      sessionHash: sessionHashes[1],
      generation,
      now: now + 10,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'DECK_EXHAUSTED' } });

    const persisted = await runInDurableObject(stub, (_instance, state) => ({
      activePlayer: state.storage.sql
        .exec<{ value: number }>(
          `SELECT COUNT(*) AS value FROM players
					 WHERE player_id = 'player-1' AND left_at IS NULL`,
        )
        .one().value,
      activeSession: state.storage.sql
        .exec<{ value: number }>(
          `SELECT COUNT(*) AS value FROM sessions
					 WHERE session_hash = ? AND revoked_at IS NULL`,
          sessionHashes[1],
        )
        .one().value,
    }));
    expect(persisted).toEqual({ activePlayer: 1, activeSession: 1 });
  });
});
