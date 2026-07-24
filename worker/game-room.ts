import { DurableObject } from 'cloudflare:workers';
import type {
  Card,
  ChatMessage,
  ClientCommand,
  EnterRoomResponse,
  ErrorMessage,
  FinalRecord,
  GameSettings,
  GameSnapshot,
  PlayedCard,
  PlayerSummary,
  PrivatePlayerState,
  RoundAnswer,
  RoundHistoryEntry,
  ServerSocketMessage,
  SetProfileResponse,
  SnapshotMessage,
} from '../src/shared/protocol';
import { answerCards, questionCards, shuffled } from './cards';
import { asRoomError, RoomError, type RpcResult } from './errors';
import { migrate } from './schema';
import {
  normalizeDisplayName,
  parseClientCommand,
  parseProfile,
  parseSettings,
} from './validation';

const DEFAULT_SETTINGS: GameSettings = Object.freeze({
  cardsPerHand: 7,
  pointsToWin: 10,
  numBlankCards: 0,
  guaranteedBlanks: 0,
  allBlanks: false,
  familyMode: false,
  numRedraws: 4,
  handRedealMode: 'replenish',
});

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;
const PROVISIONAL_SESSION_TTL_MS = 5 * 60 * 1_000;
const UNCLAIMED_ROOM_TTL_MS = 5 * 60 * 1_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const ACTIVE_ROOM_TTL_MS = 24 * 60 * 60 * 1_000;
const DISCONNECT_GRACE_MS = 90 * 1_000;
const WINNER_REVEAL_MS = 4 * 1_000;
const MAX_SOCKET_MESSAGE_BYTES = 16_384;
const COMMANDS_PER_SECOND = 20;
const COMMAND_BURST = 40;
const CHAT_WINDOW_MS = 10_000;
const CHAT_WINDOW_LIMIT = 5;
const INTERNAL_SESSION_HEADER = 'X-PID-Session-Hash';
const INTERNAL_GENERATION_HEADER = 'X-PID-Room-Generation';
const INTERNAL_SOCKET_ROLE_HEADER = 'X-PID-Socket-Role';
const GAME_LABEL = 'Game';

type SqlRow<T extends Record<string, SqlStorageValue>> = T & Record<string, SqlStorageValue>;

type RoomRow = SqlRow<{
  room_id: string;
  generation: string;
  game_state: string;
  revision: number;
  created_at: number;
  updated_at: number;
  expires_at: number;
  host_player_id: string | null;
  cards_per_hand: number;
  points_to_win: number;
  num_blank_cards: number;
  guaranteed_blanks: number;
  all_blanks: number;
  family_mode: number;
  num_redraws: number;
  hand_redeal_mode: GameSettings['handRedealMode'];
  round_number: number;
  completed_rounds: number;
  round_id: string | null;
  turn_status: string;
  question_id: string | null;
  question_text: string | null;
  czar_player_id: string | null;
  winning_submission_id: string | null;
  reveal_deadline: number | null;
}>;

type SessionRow = SqlRow<{
  session_hash: string;
  room_generation: string;
  player_id: string | null;
  is_creator: number;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  revoked_at: number | null;
}>;

type PlayerRow = SqlRow<{
  player_id: string;
  display_name: string;
  normalized_name: string;
  color_primary: string;
  color_secondary: string;
  points: number;
  czar_order: number;
  connected: number;
  redraws_used: number;
  joined_at: number;
  left_at: number | null;
  kicked_at: number | null;
}>;

type CardRow = SqlRow<{
  instance_id: string;
  catalog_id: string | null;
  text: string;
  is_blank: number;
  location: string;
  owner_player_id: string | null;
  position: number;
}>;

type SubmissionRow = SqlRow<{
  submission_id: string;
  round_id: string;
  player_id: string;
  card_instance_id: string;
  custom_text: string | null;
  display_order: number | null;
  is_winner: number;
  created_at: number;
  card_text: string;
  is_blank: number;
  display_name: string;
}>;

type JobRow = SqlRow<{
  job_type: string;
  job_key: string;
  due_at: number;
}>;

type MessageRow = SqlRow<{
  id: number;
  timestamp: number;
  type: string;
  sender_player_id: string | null;
  sender_display_name: string;
  text: string;
}>;

type RoundRow = SqlRow<{
  round_number: number;
  round_id: string;
  question: string;
  winning_answer: string;
  winning_player_id: string | null;
  winning_player_name: string;
  completed_at: number;
}>;

type RoundAnswerRow = SqlRow<{
  round_number: number;
  answer_order: number;
  text: string;
  player_id: string | null;
  player_name: string;
  is_winner: number;
}>;

type FinalPlayerRow = SqlRow<{
  player_id: string;
  display_name: string;
  color_primary: string;
  color_secondary: string;
  points: number;
  czar_order: number;
  connected: number;
  rank: number;
  is_winner: number;
}>;

type ReceiptRow = SqlRow<{
  room_generation: string;
  player_id: string;
  command_id: string;
  request_digest: string;
  response_json: string;
  processed_at: number;
  revision: number;
}>;

interface CreateRoomInput {
  roomId: string;
  generation: string;
  provisionalSessionHash: string;
  now: number;
}

interface EnterRoomInput {
  sessionHash: string;
  existingSessionHash?: string;
  generation?: string;
  now: number;
  creator?: boolean;
}

interface SetProfileInput {
  sessionHash: string;
  generation: string;
  displayName: string;
  colorSet: readonly [string, string];
  now: number;
}

interface SnapshotInput {
  sessionHash: string;
  generation: string;
  now: number;
}

interface DisplaySnapshotInput {
  generation?: string;
  now: number;
}

export interface EnterRoomRpcValue extends EnterRoomResponse {
  generation: string;
}

export interface DisplaySnapshotRpcValue {
  generation: string;
  snapshot: GameSnapshot;
}

interface PlayerSocketAttachment {
  version: 2;
  role: 'player';
  sessionHash: string;
  playerId: string;
  connectionId: string;
}

interface DisplaySocketAttachment {
  version: 2;
  role: 'display';
  generation: string;
  connectionId: string;
}

type SocketAttachment = PlayerSocketAttachment | DisplaySocketAttachment;

interface DueResult {
  changed: boolean;
  deleted: boolean;
}

interface CommandOutcome {
  changed: boolean;
  duplicate: boolean;
  closeSelf: boolean;
  closePlayerId?: string;
}

function first<T>(rows: readonly T[]): T | null {
  return rows[0] ?? null;
}

function safeNow(value: number): number {
  return Number.isFinite(value) ? Math.floor(value) : Date.now();
}

function socketAttachment(ws: WebSocket): SocketAttachment | null {
  const raw: unknown = ws.deserializeAttachment();
  if (
    typeof raw !== 'object' ||
    raw === null ||
    Array.isArray(raw) ||
    !('version' in raw) ||
    !('role' in raw) ||
    !('connectionId' in raw) ||
    raw.version !== 2 ||
    (raw.role !== 'player' && raw.role !== 'display') ||
    typeof raw.connectionId !== 'string'
  ) {
    return null;
  }
  if (raw.role === 'player') {
    if (
      !('sessionHash' in raw) ||
      !('playerId' in raw) ||
      typeof raw.sessionHash !== 'string' ||
      typeof raw.playerId !== 'string'
    ) {
      return null;
    }
    return {
      version: 2,
      role: 'player',
      sessionHash: raw.sessionHash,
      playerId: raw.playerId,
      connectionId: raw.connectionId,
    };
  }
  if (!('generation' in raw) || typeof raw.generation !== 'string') {
    return null;
  }
  return {
    version: 2,
    role: 'display',
    generation: raw.generation,
    connectionId: raw.connectionId,
  };
}

function playerSummary(row: PlayerRow): PlayerSummary {
  return {
    playerId: row.player_id,
    displayName: row.display_name,
    colorSet: [row.color_primary, row.color_secondary],
    points: row.points,
    czarOrder: row.czar_order,
    connected: row.connected === 1,
  };
}

export class GameRoom extends DurableObject<Env> {
  private schemaReady = false;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async createRoom(input: CreateRoomInput): Promise<RpcResult<{ created: true }>> {
    return this.exclusive(() =>
      this.capture(async () => {
        const now = safeNow(input.now);
        if (!/^[A-HJ-NP-Z]{5}$/u.test(input.roomId)) {
          throw new RoomError('INVALID_ROOM_ID', 'Room code is invalid.');
        }
        if (!/^[a-f0-9]{64}$/u.test(input.provisionalSessionHash)) {
          throw new RoomError('INVALID_SESSION', 'Session is invalid.', 401);
        }
        if (this.ensureExistingSchema()) {
          const due = await this.runDueJobs(now);
          if (!due.deleted && this.room() !== null) {
            throw new RoomError('ROOM_EXISTS', 'That room code is already in use.', 409);
          }
        }
        this.initializeSchema();

        const expiresAt = now + UNCLAIMED_ROOM_TTL_MS;
        this.ctx.storage.transactionSync(() => {
          this.sql.exec(
            `INSERT INTO room_state (
							singleton, room_id, generation, game_state, revision,
							created_at, updated_at, expires_at, cards_per_hand,
							points_to_win, num_blank_cards, guaranteed_blanks,
							all_blanks, family_mode, num_redraws, hand_redeal_mode
						) VALUES (1, ?, ?, 'LOBBY', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            input.roomId,
            input.generation,
            now,
            now,
            expiresAt,
            DEFAULT_SETTINGS.cardsPerHand,
            DEFAULT_SETTINGS.pointsToWin,
            DEFAULT_SETTINGS.numBlankCards,
            DEFAULT_SETTINGS.guaranteedBlanks,
            DEFAULT_SETTINGS.allBlanks ? 1 : 0,
            DEFAULT_SETTINGS.familyMode ? 1 : 0,
            DEFAULT_SETTINGS.numRedraws,
            DEFAULT_SETTINGS.handRedealMode,
          );
          this.sql.exec(
            `INSERT INTO sessions (
							session_hash, room_generation, player_id, is_creator, created_at,
							last_seen_at, expires_at, revoked_at
						) VALUES (?, ?, NULL, 1, ?, ?, ?, NULL)`,
            input.provisionalSessionHash,
            input.generation,
            now,
            now,
            now + PROVISIONAL_SESSION_TTL_MS,
          );
          this.putJob('ttl', 'room', expiresAt);
        });
        await this.rescheduleAlarm();
        return { created: true };
      }),
    );
  }

  async enterRoom(input: EnterRoomInput): Promise<RpcResult<EnterRoomRpcValue>> {
    return this.exclusive(() =>
      this.capture(async () => {
        this.requireExistingSchema();
        const now = safeNow(input.now);
        const due = await this.runDueJobs(now);
        if (due.deleted) {
          throw new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.', 404);
        }
        const room = this.roomOrThrow();
        this.assertSessionHash(input.sessionHash);

        let inherited: SessionRow | null = null;
        if (input.existingSessionHash !== undefined) {
          inherited = this.activeSession(input.existingSessionHash, now, input.generation);
          if (inherited?.player_id !== null && inherited?.player_id !== undefined) {
            const player = this.player(inherited.player_id, false);
            if (player === null) {
              inherited = null;
            }
          }
        }

        if (inherited?.player_id === null && room.game_state !== 'LOBBY') {
          this.ctx.storage.transactionSync(() => {
            this.sql.exec(
              'UPDATE sessions SET revoked_at = ? WHERE session_hash = ? AND revoked_at IS NULL',
              now,
              inherited?.session_hash ?? '',
            );
          });
          throw new RoomError('ROOM_LOCKED', 'This game has already started.', 409);
        }

        if (inherited === null && room.game_state !== 'LOBBY') {
          throw new RoomError('ROOM_LOCKED', 'This game has already started.', 409);
        }

        if (inherited !== null && inherited.session_hash === input.sessionHash) {
          this.ctx.storage.transactionSync(() => {
            this.touchSession(input.sessionHash, now);
            this.touchRoom(now);
          });
          await this.rescheduleAlarm();
          if (due.changed) {
            this.broadcastSnapshots(now);
          }
          return {
            snapshot: this.snapshot(input.sessionHash, now),
            needsProfile: inherited.player_id === null,
            generation: room.generation,
          };
        }

        this.ctx.storage.transactionSync(() => {
          if (inherited !== null) {
            this.sql.exec(
              'UPDATE sessions SET revoked_at = ? WHERE session_hash = ?',
              now,
              inherited.session_hash,
            );
          }
          this.sql.exec(
            `INSERT INTO sessions (
							session_hash, room_generation, player_id, is_creator, created_at,
							last_seen_at, expires_at, revoked_at
						) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
            input.sessionHash,
            room.generation,
            inherited?.player_id ?? null,
            inherited?.is_creator ?? (input.creator === true ? 1 : 0),
            now,
            now,
            inherited?.player_id === null || inherited === null
              ? now + PROVISIONAL_SESSION_TTL_MS
              : now + SESSION_TTL_MS,
          );
          this.touchRoom(now);
        });
        await this.rescheduleAlarm();
        if (due.changed) {
          this.broadcastSnapshots(now);
        }
        return {
          snapshot: this.snapshot(input.sessionHash, now),
          needsProfile: inherited?.player_id === null || inherited === null,
          generation: room.generation,
        };
      }),
    );
  }

  async setProfile(input: SetProfileInput): Promise<RpcResult<SetProfileResponse>> {
    return this.exclusive(() =>
      this.capture(async () => {
        this.requireExistingSchema();
        const now = safeNow(input.now);
        const due = await this.runDueJobs(now);
        if (due.deleted) {
          throw new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.', 404);
        }
        const session = this.requireSession(input.sessionHash, now, false, input.generation);
        const profile = {
          displayName: input.displayName,
          colorSet: input.colorSet,
        };
        const parsed = this.validateProfile(profile);
        const room = this.roomOrThrow();

        if (session.player_id !== null) {
          const existing = this.playerOrThrow(session.player_id);
          if (
            existing.display_name === parsed.displayName &&
            existing.color_primary === parsed.colorSet[0] &&
            existing.color_secondary === parsed.colorSet[1]
          ) {
            this.ctx.storage.transactionSync(() => {
              this.touchSession(input.sessionHash, now);
              this.touchRoom(now);
            });
            await this.rescheduleAlarm();
            if (due.changed) {
              this.broadcastSnapshots(now);
            }
            return { snapshot: this.snapshot(input.sessionHash, now) };
          }
          if (room.game_state !== 'LOBBY') {
            throw new RoomError(
              'PROFILE_LOCKED',
              'Profiles cannot change after the game starts.',
              409,
            );
          }
          this.assertProfileAvailable(parsed, existing.player_id);
          this.ctx.storage.transactionSync(() => {
            this.sql.exec(
              `UPDATE players
							 SET display_name = ?, normalized_name = ?,
							     color_primary = ?, color_secondary = ?
							 WHERE player_id = ?`,
              parsed.displayName,
              normalizeDisplayName(parsed.displayName),
              parsed.colorSet[0],
              parsed.colorSet[1],
              existing.player_id,
            );
            this.bumpRevision(now);
            this.touchSession(input.sessionHash, now);
            this.touchRoom(now);
          });
        } else {
          if (room.game_state !== 'LOBBY') {
            throw new RoomError('ROOM_LOCKED', 'This game has already started.', 409);
          }
          if (this.activePlayers().length >= MAX_PLAYERS) {
            throw new RoomError('ROOM_FULL', 'This room already has eight players.', 409);
          }
          this.assertProfileAvailable(parsed, null);
          const playerId = crypto.randomUUID();
          const czarOrder = this.nextCzarOrder();
          this.ctx.storage.transactionSync(() => {
            this.sql.exec(
              `INSERT INTO players (
								player_id, display_name, normalized_name,
								color_primary, color_secondary, points, czar_order,
								connected, redraws_used, joined_at, left_at, kicked_at
							) VALUES (?, ?, ?, ?, ?, 0, ?, 0, 0, ?, NULL, NULL)`,
              playerId,
              parsed.displayName,
              normalizeDisplayName(parsed.displayName),
              parsed.colorSet[0],
              parsed.colorSet[1],
              czarOrder,
              now,
            );
            this.sql.exec(
              `UPDATE sessions
							 SET player_id = ?, last_seen_at = ?, expires_at = ?
							 WHERE session_hash = ?`,
              playerId,
              now,
              now + SESSION_TTL_MS,
              input.sessionHash,
            );
            if (room.host_player_id === null || session.is_creator === 1) {
              this.sql.exec(
                'UPDATE room_state SET host_player_id = ? WHERE singleton = 1',
                playerId,
              );
            }
            this.systemMessage(`${parsed.displayName} has joined this bitch.`, now);
            this.bumpRevision(now);
            this.touchRoom(now);
          });
        }

        await this.rescheduleAlarm();
        this.broadcastSnapshots(now);
        return { snapshot: this.snapshot(input.sessionHash, now) };
      }),
    );
  }

  async getSessionSnapshot(input: SnapshotInput): Promise<RpcResult<GameSnapshot>> {
    return this.exclusive(() =>
      this.capture(async () => {
        this.requireExistingSchema();
        const now = safeNow(input.now);
        const due = await this.runDueJobs(now);
        if (due.deleted) {
          throw new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.', 404);
        }
        const session = this.requireSession(input.sessionHash, now, false, input.generation);
        const room = this.roomOrThrow();
        if (session.player_id === null && room.game_state !== 'LOBBY') {
          this.ctx.storage.transactionSync(() => {
            this.sql.exec(
              'UPDATE sessions SET revoked_at = ? WHERE session_hash = ? AND revoked_at IS NULL',
              now,
              input.sessionHash,
            );
          });
          throw new RoomError('ROOM_LOCKED', 'This game has already started.', 409);
        }
        await this.rescheduleAlarm();
        if (due.changed) {
          this.broadcastSnapshots(now);
        }
        return this.snapshot(input.sessionHash, now);
      }),
    );
  }

  async getDisplaySnapshot(
    input: DisplaySnapshotInput,
  ): Promise<RpcResult<DisplaySnapshotRpcValue>> {
    return this.exclusive(() =>
      this.capture(async () => {
        this.requireExistingSchema();
        const now = safeNow(input.now);
        const due = await this.runDueJobs(now);
        if (due.deleted) {
          throw new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.', 404);
        }
        const room = this.roomOrThrow();
        if (input.generation !== undefined && input.generation !== room.generation) {
          throw new RoomError(
            'INVALID_SESSION',
            'This display session belongs to an older room.',
            401,
          );
        }
        await this.rescheduleAlarm();
        if (due.changed) {
          this.broadcastSnapshots(now);
        }
        return {
          generation: room.generation,
          snapshot: this.publicSnapshot(now),
        };
      }),
    );
  }

  async fetch(request: Request): Promise<Response> {
    return this.exclusive(async () => {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Not found', { status: 404 });
      }
      if (!this.ensureExistingSchema()) {
        return this.terminalSocket(
          new RoomError('ROOM_NOT_FOUND', 'That room does not exist.', 404),
          4004,
        );
      }

      const role = request.headers.get(INTERNAL_SOCKET_ROLE_HEADER) ?? 'player';
      const generation = request.headers.get(INTERNAL_GENERATION_HEADER);
      if ((role !== 'player' && role !== 'display') || generation === null) {
        return new Response('Unauthorized', { status: 401 });
      }
      const now = Date.now();
      const due = await this.runDueJobs(now);
      if (due.deleted) {
        return this.terminalSocket(
          new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.', 404),
          4004,
        );
      }

      if (role === 'display') {
        const room = this.roomOrThrow();
        if (generation !== room.generation) {
          return this.terminalSocket(
            new RoomError('INVALID_SESSION', 'This display session belongs to an older room.', 401),
            4001,
          );
        }
        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        const attachment: DisplaySocketAttachment = {
          version: 2,
          role: 'display',
          generation,
          connectionId: crypto.randomUUID(),
        };
        server.serializeAttachment(attachment);
        this.ctx.acceptWebSocket(server, [`display:${generation}`]);
        await this.rescheduleAlarm();
        this.sendPublicSnapshot(server, now);
        if (due.changed) {
          this.broadcastSnapshots(now, server);
        }
        return new Response(null, { status: 101, webSocket: client });
      }

      const sessionHash = request.headers.get(INTERNAL_SESSION_HEADER);
      if (sessionHash === null) {
        return new Response('Unauthorized', { status: 401 });
      }

      let session: SessionRow;
      try {
        session = this.requireSession(sessionHash, now, true, generation);
      } catch (error) {
        const roomError = asRoomError(error);
        return this.terminalSocket(roomError, roomError.code === 'KICKED' ? 4003 : 4001);
      }
      if (session.player_id === null) {
        return this.terminalSocket(
          new RoomError('PROFILE_REQUIRED', 'Complete your profile first.', 409),
          4001,
        );
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const attachment: PlayerSocketAttachment = {
        version: 2,
        role: 'player',
        sessionHash,
        playerId: session.player_id,
        connectionId: crypto.randomUUID(),
      };
      server.serializeAttachment(attachment);
      this.ctx.acceptWebSocket(server, [`player:${session.player_id}`, `session:${sessionHash}`]);

      let presenceChanged = false;
      this.ctx.storage.transactionSync(() => {
        const player = this.playerOrThrow(session.player_id ?? '');
        if (player.connected === 0) {
          this.sql.exec('UPDATE players SET connected = 1 WHERE player_id = ?', player.player_id);
          this.bumpRevision(now);
          presenceChanged = true;
        }
        this.deleteJob('disconnect', player.player_id);
        const room = this.roomOrThrow();
        if (
          room.game_state === 'PLAYING' &&
          room.turn_status === 'WAITING_FOR_CARDS' &&
          room.round_id !== null
        ) {
          this.maybeOpenJudging(room.round_id);
        }
        this.touchSession(sessionHash, now);
        this.touchRoom(now);
      });
      await this.rescheduleAlarm();
      this.sendSnapshot(server, sessionHash, now);
      if (due.changed || presenceChanged) {
        this.broadcastSnapshots(now, server);
      }
      return new Response(null, { status: 101, webSocket: client });
    });
  }

  async leaveSession(input: SnapshotInput): Promise<RpcResult<{ left: true }>> {
    return this.exclusive(() =>
      this.capture(async () => {
        if (!this.ensureExistingSchema()) {
          return { left: true };
        }
        const now = safeNow(input.now);
        const due = await this.runDueJobs(now);
        if (due.deleted) {
          return { left: true };
        }
        const session = this.requireSession(input.sessionHash, now, false, input.generation);
        this.ctx.storage.transactionSync(() => {
          if (session.player_id !== null) {
            this.departPlayer(session.player_id, now, false);
          } else {
            this.sql.exec(
              'UPDATE sessions SET revoked_at = ? WHERE session_hash = ?',
              now,
              input.sessionHash,
            );
          }
          this.bumpRevision(now);
          this.touchRoom(now);
        });
        this.closeSessionSockets(input.sessionHash, 4001, 'Session left room');
        await this.rescheduleAlarm();
        this.broadcastSnapshots(now);
        return { left: true };
      }),
    );
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.exclusive(async () => {
      if (!this.ensureExistingSchema()) {
        ws.close(4004, 'Room expired');
        return;
      }
      const attachment = socketAttachment(ws);
      if (attachment === null) {
        ws.close(1008, 'Invalid socket session');
        return;
      }

      const now = Date.now();
      if (await this.expireRoomIfDue(now)) {
        this.sendError(ws, new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.', 404));
        ws.close(4004, 'Room expired');
        return;
      }

      if (attachment.role === 'display') {
        const room = this.roomOrThrow();
        if (attachment.generation !== room.generation) {
          this.sendError(
            ws,
            new RoomError('INVALID_SESSION', 'This display session belongs to an older room.', 401),
          );
          ws.close(4001, 'INVALID_SESSION');
          return;
        }
        this.sendError(
          ws,
          new RoomError('READ_ONLY', 'Display connections cannot send game commands.', 403),
        );
        ws.close(1008, 'READ_ONLY');
        return;
      }

      let session: SessionRow;
      try {
        session = this.requireSession(attachment.sessionHash, now, true);
        if (session.player_id !== attachment.playerId) {
          throw new RoomError('INVALID_SESSION', 'Session no longer belongs to this player.', 401);
        }
      } catch (error) {
        const roomError = asRoomError(error);
        this.sendError(ws, roomError);
        ws.close(roomError.code === 'KICKED' ? 4003 : 4001, roomError.code);
        return;
      }

      let inboundRateError: RoomError | null = null;
      this.ctx.storage.transactionSync(() => {
        inboundRateError = this.consumeInboundRate(attachment.sessionHash, now);
      });
      if (inboundRateError !== null) {
        this.sendError(ws, inboundRateError);
        return;
      }

      if (typeof message !== 'string') {
        this.sendError(ws, new RoomError('INVALID_COMMAND', 'Commands must be JSON text.'));
        return;
      }
      if (new TextEncoder().encode(message).byteLength > MAX_SOCKET_MESSAGE_BYTES) {
        this.sendError(ws, new RoomError('PAYLOAD_TOO_LARGE', 'The command is too large.', 413));
        return;
      }

      let decoded: unknown;
      try {
        decoded = JSON.parse(message);
      } catch {
        this.sendError(ws, new RoomError('INVALID_JSON', 'The command is not valid JSON.'));
        return;
      }

      let command: ClientCommand;
      try {
        command = parseClientCommand(decoded);
      } catch (error) {
        const roomError = asRoomError(error);
        this.sendError(ws, roomError);
        if (roomError.code === 'OUTDATED_CLIENT') {
          ws.close(4001, roomError.code);
        }
        return;
      }

      const digest = await this.commandDigest(command);
      const existing = this.commandReceipt(
        session.room_generation,
        attachment.playerId,
        command.commandId,
      );
      if (existing !== null) {
        if (existing.request_digest !== digest) {
          this.sendError(
            ws,
            new RoomError(
              'IDEMPOTENCY_CONFLICT',
              'This command id was already used for a different command.',
              409,
            ),
            command.commandId,
          );
          return;
        }
        this.sendSerializedFrames(ws, existing.response_json);
        return;
      }

      let outcome: CommandOutcome = {
        changed: false,
        duplicate: false,
        closeSelf: false,
      };
      let frames: ServerSocketMessage[] = [];
      let responseJson = '';
      let dueChanged = false;
      try {
        this.ctx.storage.transactionSync(() => {
          dueChanged = this.processDueJobsSync(now);
          const commandError =
            command.type === 'send_chat' ? this.consumeChatRate(attachment.sessionHash, now) : null;
          if (commandError === null) {
            outcome = this.applyCommand(command, session, attachment.playerId, now);
          } else {
            outcome = { changed: false, duplicate: false, closeSelf: false };
          }
          if (dueChanged || outcome.changed) {
            this.bumpRevision(now);
          }
          this.touchSession(attachment.sessionHash, now);
          this.touchRoom(now);
          frames =
            commandError === null
              ? [
                  { protocolVersion: 1, type: 'ack', commandId: command.commandId },
                  this.snapshotFrame(attachment.sessionHash, now),
                ]
              : [this.errorFrame(commandError, command.commandId)];
          responseJson = this.serializeFrames(frames);
          this.insertCommandReceipt(
            session,
            attachment.playerId,
            command.commandId,
            digest,
            responseJson,
            now,
          );
        });
      } catch (error) {
        const roomError = asRoomError(error);
        outcome = { changed: false, duplicate: false, closeSelf: false };
        this.ctx.storage.transactionSync(() => {
          const rateError =
            command.type === 'send_chat' ? this.consumeChatRate(attachment.sessionHash, now) : null;
          frames = [this.errorFrame(rateError ?? roomError, command.commandId)];
          responseJson = this.serializeFrames(frames);
          this.insertCommandReceipt(
            session,
            attachment.playerId,
            command.commandId,
            digest,
            responseJson,
            now,
          );
        });
      }
      await this.rescheduleAlarm();
      this.sendFrames(ws, frames);
      if (outcome.closePlayerId !== undefined) {
        this.closePlayerSocketsWithError(outcome.closePlayerId);
      }
      if (dueChanged || outcome.changed) {
        this.broadcastSnapshots(now, ws);
      }
      if (outcome.closeSelf) {
        ws.close(1000, 'Left room');
      }
    });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleSocketDeparture(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleSocketDeparture(ws);
  }

  async alarm(): Promise<void> {
    await this.exclusive(async () => {
      if (!this.ensureExistingSchema()) {
        return;
      }
      const now = Date.now();
      const due = await this.runDueJobs(now);
      if (!due.deleted) {
        await this.rescheduleAlarm();
        if (due.changed) {
          this.broadcastSnapshots(now);
        }
      }
    });
  }

  private get sql(): SqlStorage {
    return this.ctx.storage.sql;
  }

  private ensureExistingSchema(): boolean {
    if (this.schemaReady) {
      return true;
    }
    const exists =
      this.sql
        .exec<SqlRow<{ value: number }>>(
          `SELECT COUNT(*) AS value FROM sqlite_master
				 WHERE type = 'table' AND name = 'room_state'`,
        )
        .one().value > 0;
    if (exists) {
      migrate(this.ctx.storage);
      this.schemaReady = true;
    }
    return exists;
  }

  private requireExistingSchema(): void {
    if (!this.ensureExistingSchema()) {
      throw new RoomError('ROOM_NOT_FOUND', 'That room does not exist.', 404);
    }
  }

  private initializeSchema(): void {
    if (!this.ensureExistingSchema()) {
      migrate(this.ctx.storage);
      this.schemaReady = true;
    }
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async capture<T>(operation: () => Promise<T>): Promise<RpcResult<T>> {
    try {
      return { ok: true, value: await operation() };
    } catch (error) {
      return { ok: false, error: asRoomError(error).toPublicError() };
    }
  }

  private room(): RoomRow | null {
    return first(this.sql.exec<RoomRow>('SELECT * FROM room_state WHERE singleton = 1').toArray());
  }

  private roomOrThrow(): RoomRow {
    const room = this.room();
    if (room === null) {
      throw new RoomError('ROOM_NOT_FOUND', 'That room does not exist.', 404);
    }
    return room;
  }

  private activeSession(sessionHash: string, now: number, generation?: string): SessionRow | null {
    if (!/^[a-f0-9]{64}$/u.test(sessionHash)) {
      return null;
    }
    const rows = this.sql
      .exec<SessionRow>(
        `SELECT * FROM sessions
				 WHERE session_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
        sessionHash,
        now,
      )
      .toArray();
    const session = first(rows);
    if (session === null || (generation !== undefined && session.room_generation !== generation)) {
      return null;
    }
    return session;
  }

  private requireSession(
    sessionHash: string,
    now: number,
    requirePlayer: boolean,
    generation?: string,
  ): SessionRow {
    const session = this.activeSession(sessionHash, now, generation);
    if (session === null) {
      const historical = first(
        this.sql
          .exec<SessionRow>('SELECT * FROM sessions WHERE session_hash = ?', sessionHash)
          .toArray(),
      );
      if (historical?.player_id !== null && historical?.player_id !== undefined) {
        const previousPlayer = this.player(historical.player_id, true);
        if (previousPlayer?.kicked_at !== null && previousPlayer?.kicked_at !== undefined) {
          throw new RoomError('KICKED', 'You were removed from this room.', 403);
        }
      }
      throw new RoomError('INVALID_SESSION', 'Your room session is missing or expired.', 401);
    }
    const room = this.roomOrThrow();
    if (session.room_generation !== room.generation) {
      throw new RoomError('INVALID_SESSION', 'This session belongs to an older room.', 401);
    }
    if (requirePlayer && session.player_id === null) {
      throw new RoomError('PROFILE_REQUIRED', 'Complete your profile first.', 409);
    }
    if (session.player_id !== null && this.player(session.player_id, false) === null) {
      throw new RoomError('PLAYER_REMOVED', 'You are no longer in this room.', 403);
    }
    return session;
  }

  private assertSessionHash(sessionHash: string): void {
    if (!/^[a-f0-9]{64}$/u.test(sessionHash)) {
      throw new RoomError('INVALID_SESSION', 'Session is invalid.', 401);
    }
  }

  private player(playerId: string, includeDeparted: boolean): PlayerRow | null {
    const condition = includeDeparted
      ? 'player_id = ?'
      : 'player_id = ? AND left_at IS NULL AND kicked_at IS NULL';
    return first(
      this.sql.exec<PlayerRow>(`SELECT * FROM players WHERE ${condition}`, playerId).toArray(),
    );
  }

  private playerOrThrow(playerId: string): PlayerRow {
    const player = this.player(playerId, false);
    if (player === null) {
      throw new RoomError('PLAYER_REMOVED', 'That player is no longer in this room.', 404);
    }
    return player;
  }

  private activePlayers(): PlayerRow[] {
    return this.sql
      .exec<PlayerRow>(
        `SELECT * FROM players
				 WHERE left_at IS NULL AND kicked_at IS NULL
				 ORDER BY czar_order ASC`,
      )
      .toArray();
  }

  private nextCzarOrder(): number {
    return this.sql
      .exec<SqlRow<{ value: number }>>(
        'SELECT COALESCE(MAX(czar_order), -1) + 1 AS value FROM players',
      )
      .one().value;
  }

  private validateProfile(input: { displayName: string; colorSet: readonly [string, string] }): {
    displayName: string;
    colorSet: readonly [string, string];
  } {
    return parseProfile({
      displayName: input.displayName,
      colorSet: [input.colorSet[0], input.colorSet[1]],
    });
  }

  private assertProfileAvailable(
    profile: { displayName: string; colorSet: readonly [string, string] },
    exceptPlayerId: string | null,
  ): void {
    const normalized = normalizeDisplayName(profile.displayName);
    const nameConflict = first(
      this.sql
        .exec<SqlRow<{ player_id: string }>>(
          `SELECT player_id FROM players
					 WHERE normalized_name = ? AND left_at IS NULL AND kicked_at IS NULL
					   AND (? IS NULL OR player_id <> ?)
					 LIMIT 1`,
          normalized,
          exceptPlayerId,
          exceptPlayerId,
        )
        .toArray(),
    );
    if (nameConflict !== null) {
      throw new RoomError('DISPLAY_NAME_TAKEN', 'Someone in this room already has that name.', 409);
    }

    const colorConflict = first(
      this.sql
        .exec<SqlRow<{ player_id: string }>>(
          `SELECT player_id FROM players
					 WHERE color_primary = ? AND color_secondary = ?
					   AND left_at IS NULL AND kicked_at IS NULL
					   AND (? IS NULL OR player_id <> ?)
					 LIMIT 1`,
          profile.colorSet[0],
          profile.colorSet[1],
          exceptPlayerId,
          exceptPlayerId,
        )
        .toArray(),
    );
    if (colorConflict !== null) {
      throw new RoomError('COLORS_TAKEN', 'Someone in this room already uses those colors.', 409);
    }
  }

  private snapshot(sessionHash: string | null, now: number): GameSnapshot {
    const room = this.roomOrThrow();
    const players = this.activePlayers();
    const session = sessionHash === null ? null : this.activeSession(sessionHash, now);
    const selfPlayer =
      session?.player_id === null || session?.player_id === undefined
        ? null
        : this.player(session.player_id, false);

    const submittedPlayerIds =
      room.round_id === null
        ? []
        : this.sql
            .exec<SqlRow<{ player_id: string }>>(
              `SELECT s.player_id
							 FROM submissions s
							 JOIN players p ON p.player_id = s.player_id
							 WHERE s.round_id = ? ORDER BY p.czar_order ASC`,
              room.round_id,
            )
            .toArray()
            .map((row) => row.player_id);
    const visibleSubmissions =
      room.round_id !== null &&
      (room.turn_status === 'WAITING_FOR_CZAR' || room.turn_status === 'REVEAL')
        ? this.submissions(room.round_id)
        : [];

    const playedCards: PlayedCard[] =
      room.turn_status === 'WAITING_FOR_CARDS'
        ? submittedPlayerIds.map((_playerId, index) => ({
            id: `facedown-${index}`,
            text: '',
          }))
        : visibleSubmissions.map((submission) => ({
            id: submission.submission_id,
            text: submission.custom_text ?? submission.card_text,
            ...(submission.is_blank === 1 ? { blank: true } : {}),
          }));
    const winner =
      room.winning_submission_id === null
        ? null
        : first(
            visibleSubmissions.filter(
              (submission) => submission.submission_id === room.winning_submission_id,
            ),
          );

    const hand: Card[] =
      selfPlayer === null
        ? []
        : this.sql
            .exec<CardRow>(
              `SELECT * FROM card_instances
							 WHERE owner_player_id = ? AND location = 'hand'
							 ORDER BY position ASC`,
              selfPlayer.player_id,
            )
            .toArray()
            .map((card) => ({
              id: card.instance_id,
              text: card.is_blank === 1 ? '%BLANK%' : card.text,
              ...(card.is_blank === 1 ? { blank: true } : {}),
            }));
    const playedThisTurn =
      selfPlayer !== null && room.round_id !== null
        ? this.sql
            .exec<SqlRow<{ value: number }>>(
              `SELECT COUNT(*) AS value FROM submissions
							 WHERE round_id = ? AND player_id = ?`,
              room.round_id,
              selfPlayer.player_id,
            )
            .one().value > 0
        : false;
    const me: PrivatePlayerState | null =
      selfPlayer === null
        ? null
        : {
            sessionStatus: 'ACTIVE',
            playerId: selfPlayer.player_id,
            displayName: selfPlayer.display_name,
            hand,
            isPrivileged: room.host_player_id === selfPlayer.player_id,
            playedThisTurn,
            redrawsUsed: selfPlayer.redraws_used,
          };

    return {
      protocolVersion: 1,
      revision: room.revision,
      serverTime: now,
      room: {
        roomId: room.room_id,
        phase: this.phase(room),
        gameState:
          room.game_state === 'PLAYING'
            ? 'PLAYING'
            : room.game_state === 'FINISHED'
              ? 'FINISHED'
              : 'LOBBY',
        players: players.map(playerSummary),
        settings: this.settings(room),
        turn: {
          roundId: room.round_id ?? '',
          revealDeadline: room.reveal_deadline,
          round: room.round_number,
          status:
            room.turn_status === 'WAITING_FOR_CZAR'
              ? 'WAITING_FOR_CZAR'
              : room.turn_status === 'REVEAL'
                ? 'REVEAL'
                : 'WAITING_FOR_CARDS',
          questionCard: room.question_text ?? '',
          czarPlayerId: room.czar_player_id ?? '',
          playedCards,
          submittedPlayerIds,
          winningCard:
            winner === null
              ? null
              : {
                  id: winner.submission_id,
                  text: winner.custom_text ?? winner.card_text,
                  ...(winner.is_blank === 1 ? { blank: true } : {}),
                  playedByPlayerId: winner.player_id,
                  playedByDisplayName: winner.display_name,
                },
        },
        chatMessages: this.chatMessages(),
        roundHistory: this.roundHistory(),
        finalRecord: this.finalRecord(),
      },
      me,
    };
  }

  private publicSnapshot(now: number): GameSnapshot {
    return this.snapshot(null, now);
  }

  private settings(room: RoomRow): GameSettings {
    return {
      cardsPerHand: room.cards_per_hand,
      pointsToWin: room.points_to_win,
      numBlankCards: room.num_blank_cards,
      guaranteedBlanks: room.guaranteed_blanks,
      allBlanks: room.all_blanks === 1,
      familyMode: room.family_mode === 1,
      numRedraws: room.num_redraws,
      handRedealMode: room.hand_redeal_mode,
    };
  }

  private phase(
    room: RoomRow,
  ): 'LOBBY' | 'COLLECTING' | 'JUDGING' | 'REVEAL' | 'FINISHED' | 'CANCELLED' {
    if (room.game_state === 'LOBBY') {
      return 'LOBBY';
    }
    if (room.game_state === 'FINISHED') {
      return this.sql
        .exec<SqlRow<{ value: number }>>(
          'SELECT COUNT(*) AS value FROM final_players WHERE is_winner = 1',
        )
        .one().value > 0
        ? 'FINISHED'
        : 'CANCELLED';
    }
    if (room.turn_status === 'WAITING_FOR_CZAR') {
      return 'JUDGING';
    }
    if (room.turn_status === 'REVEAL') {
      return 'REVEAL';
    }
    return 'COLLECTING';
  }

  private submissions(roundId: string): SubmissionRow[] {
    return this.sql
      .exec<SubmissionRow>(
        `SELECT s.*, c.text AS card_text, c.is_blank, p.display_name
				 FROM submissions s
				 JOIN card_instances c ON c.instance_id = s.card_instance_id
				 JOIN players p ON p.player_id = s.player_id
				 WHERE s.round_id = ?
				 ORDER BY s.display_order ASC, s.created_at ASC`,
        roundId,
      )
      .toArray();
  }

  private chatMessages(): ChatMessage[] {
    return this.sql
      .exec<MessageRow>(
        `SELECT * FROM (
					SELECT * FROM messages ORDER BY id DESC LIMIT 100
				 ) ORDER BY id ASC`,
      )
      .toArray()
      .map((row) => ({
        id: String(row.id),
        timestamp: row.timestamp,
        type: row.type === 'chat' ? 'chat' : 'system',
        ...(row.sender_player_id === null ? {} : { senderPlayerId: row.sender_player_id }),
        senderDisplayName: row.sender_display_name,
        text: row.text,
      }));
  }

  private roundHistory(): RoundHistoryEntry[] {
    const rounds = this.sql
      .exec<RoundRow>(
        `SELECT * FROM (
					SELECT * FROM rounds ORDER BY round_number DESC LIMIT 100
				 ) ORDER BY round_number ASC`,
      )
      .toArray();
    return rounds.map((round) => {
      const otherAnswers: RoundAnswer[] = this.sql
        .exec<RoundAnswerRow>(
          `SELECT * FROM round_answers
					 WHERE round_number = ? AND is_winner = 0
					 ORDER BY answer_order ASC`,
          round.round_number,
        )
        .toArray()
        .map((answer) => ({
          text: answer.text,
          ...(answer.player_id === null ? {} : { playedByPlayerId: answer.player_id }),
          playedByDisplayName: answer.player_name,
        }));
      return {
        round: round.round_number,
        question: round.question,
        winningAnswer: round.winning_answer,
        ...(round.winning_player_id === null ? {} : { winningPlayerId: round.winning_player_id }),
        winningPlayerDisplayName: round.winning_player_name,
        otherAnswers,
      };
    });
  }

  private finalRecord(): FinalRecord | null {
    const room = this.roomOrThrow();
    if (room.game_state !== 'FINISHED') {
      return null;
    }
    const rows = this.sql
      .exec<FinalPlayerRow>('SELECT * FROM final_players ORDER BY rank ASC')
      .toArray();
    const leaderboard = rows.map((row) =>
      playerSummary({
        player_id: row.player_id,
        display_name: row.display_name,
        normalized_name: '',
        color_primary: row.color_primary,
        color_secondary: row.color_secondary,
        points: row.points,
        czar_order: row.czar_order,
        connected: row.connected,
        redraws_used: 0,
        joined_at: 0,
        left_at: null,
        kicked_at: null,
      }),
    );
    const winningRow = rows.find((row) => row.is_winner === 1) ?? null;
    const winner =
      winningRow === null
        ? null
        : (leaderboard.find((player) => player.playerId === winningRow.player_id) ?? null);
    return {
      outcome: winner === null ? 'cancelled' : 'won',
      winner,
      rounds: room.completed_rounds,
      leaderboard,
    };
  }

  private applyCommand(
    command: ClientCommand,
    session: SessionRow,
    playerId: string,
    now: number,
  ): CommandOutcome {
    const room = this.roomOrThrow();
    const player = this.playerOrThrow(playerId);
    const gameplayCommand =
      command.type === 'submit_card' ||
      command.type === 'submit_blank' ||
      command.type === 'redraw_card' ||
      command.type === 'choose_winner';
    if (gameplayCommand && command.roundId !== room.round_id) {
      throw new RoomError('STALE_ROUND', 'That command belongs to an earlier round.', 409);
    }

    switch (command.type) {
      case 'update_settings':
        this.updateSettings(player, command.payload.settings);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'start_game':
        this.startGame(player, now);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'play_again':
        this.playAgain(player, now);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'submit_card':
        this.submitCard(player, command.payload.cardId, null, now);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'submit_blank':
        this.submitCard(
          player,
          command.payload.cardId,
          this.formatBlankAnswer(command.payload.text),
          now,
        );
        return { changed: true, duplicate: false, closeSelf: false };
      case 'redraw_card':
        this.redrawCard(player, command.payload.cardId);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'choose_winner':
        this.chooseWinner(player, command.payload.cardId, now);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'send_chat':
        this.chatMessage(player, command.payload.text, now);
        return { changed: true, duplicate: false, closeSelf: false };
      case 'kick_player':
        return {
          changed: true,
          duplicate: false,
          closeSelf: false,
          closePlayerId: this.kickPlayer(player, command.payload.playerId, now),
        };
      case 'leave_room':
        this.departPlayer(player.player_id, now, false);
        return { changed: true, duplicate: false, closeSelf: true };
      case 'request_snapshot':
      case 'process_due':
        return { changed: false, duplicate: false, closeSelf: false };
      default:
        command satisfies never;
        throw new RoomError('UNKNOWN_COMMAND', 'This command is not supported.');
    }
  }

  private updateSettings(player: PlayerRow, settings: GameSettings): void {
    const room = this.roomOrThrow();
    if (room.game_state !== 'LOBBY') {
      throw new RoomError(
        'GAME_ALREADY_STARTED',
        'Settings are locked after the game starts.',
        409,
      );
    }
    void player;
    const valid = parseSettings(settings);
    this.sql.exec(
      `UPDATE room_state
			 SET cards_per_hand = ?, points_to_win = ?, num_blank_cards = ?,
			     guaranteed_blanks = ?, all_blanks = ?, family_mode = ?, num_redraws = ?,
			     hand_redeal_mode = ?
			 WHERE singleton = 1`,
      valid.cardsPerHand,
      valid.pointsToWin,
      valid.numBlankCards,
      valid.guaranteedBlanks,
      valid.allBlanks ? 1 : 0,
      valid.familyMode ? 1 : 0,
      valid.numRedraws,
      valid.handRedealMode,
    );
  }

  private startGame(actor: PlayerRow, now: number): void {
    const room = this.roomOrThrow();
    if (room.host_player_id !== actor.player_id) {
      throw new RoomError('HOST_ONLY', 'Only the room host can start the game.', 403);
    }
    if (room.game_state !== 'LOBBY') {
      throw new RoomError('GAME_ALREADY_STARTED', 'This game has already started.', 409);
    }
    const players = this.activePlayers();
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
      throw new RoomError(
        'PLAYER_COUNT',
        `A game needs ${MIN_PLAYERS}–${MAX_PLAYERS} players.`,
        409,
      );
    }
    if (players.some((player) => player.connected === 0)) {
      throw new RoomError(
        'WAITING_FOR_RECONNECT',
        'Wait for every player to reconnect before starting.',
        409,
      );
    }
    const settings = this.settings(room);
    const answers = answerCards(settings.familyMode);
    const questions = questionCards(settings.familyMode);
    const handSlots = players.length * settings.cardsPerHand;
    const guaranteedSlots = players.length * settings.guaranteedBlanks;
    if (
      !settings.allBlanks &&
      answers.length + settings.numBlankCards + guaranteedSlots < handSlots
    ) {
      throw new RoomError(
        'DECK_TOO_SMALL',
        'The selected deck cannot deal every player a full hand.',
        409,
      );
    }
    if (questions.length === 0) {
      throw new RoomError('DECK_TOO_SMALL', 'The selected deck has no question cards.', 409);
    }

    this.sql.exec(
      'UPDATE sessions SET revoked_at = ? WHERE player_id IS NULL AND revoked_at IS NULL',
      now,
    );
    this.sql.exec('DELETE FROM submissions');
    this.sql.exec('DELETE FROM card_instances');
    this.sql.exec('DELETE FROM question_cards');
    this.sql.exec('DELETE FROM round_answers');
    this.sql.exec('DELETE FROM rounds');
    this.sql.exec('DELETE FROM final_players');
    this.deleteJob('reveal', room.round_id ?? '');

    if (!settings.allBlanks) {
      for (const [position, card] of shuffled(answers).entries()) {
        this.sql.exec(
          `INSERT INTO card_instances (
						instance_id, catalog_id, text, is_blank, location,
						owner_player_id, position
					) VALUES (?, ?, ?, 0, 'draw', NULL, ?)`,
          `answer:${card.id}`,
          card.id,
          card.text,
          position,
        );
      }
    }
    const blankCount = settings.allBlanks ? 500 : settings.numBlankCards + guaranteedSlots;
    let answerPosition = settings.allBlanks ? 0 : answers.length;
    for (let index = 0; index < blankCount; index += 1) {
      this.sql.exec(
        `INSERT INTO card_instances (
					instance_id, catalog_id, text, is_blank, location,
					owner_player_id, position
				) VALUES (?, NULL, '', 1, 'draw', NULL, ?)`,
        `blank:${crypto.randomUUID()}`,
        answerPosition,
      );
      answerPosition += 1;
    }
    this.shuffleDrawPile();

    for (const [position, card] of shuffled(questions).entries()) {
      this.sql.exec(
        `INSERT INTO question_cards (
					instance_id, catalog_id, text, state, position
				) VALUES (?, ?, ?, 'draw', ?)`,
        `question:${card.id}`,
        card.id,
        card.text,
        position,
      );
    }

    this.dealHandsForRound(players, true);

    const question = this.takeQuestion();
    const roundId = crypto.randomUUID();
    this.sql.exec('UPDATE players SET points = 0, redraws_used = 0');
    this.sql.exec(
      `UPDATE room_state
			 SET game_state = 'PLAYING', round_number = 1, completed_rounds = 0, round_id = ?,
			     turn_status = 'WAITING_FOR_CARDS', question_id = ?, question_text = ?,
			     czar_player_id = ?, winning_submission_id = NULL, reveal_deadline = NULL
			 WHERE singleton = 1`,
      roundId,
      question.instance_id,
      question.text,
      players[0].player_id,
    );
    this.systemMessage(`Round 1: ${players[0].display_name} is the Czar.`, now);
  }

  private playAgain(actor: PlayerRow, now: number): void {
    const room = this.roomOrThrow();
    if (room.host_player_id !== actor.player_id) {
      throw new RoomError('HOST_ONLY', 'Only the room host can start a rematch.', 403);
    }
    if (room.game_state !== 'FINISHED') {
      throw new RoomError(
        'REMATCH_NOT_AVAILABLE',
        'A rematch is available after the current game ends.',
        409,
      );
    }

    this.sql.exec('DELETE FROM card_instances');
    this.sql.exec('DELETE FROM question_cards');
    this.sql.exec('DELETE FROM submissions');
    this.sql.exec('DELETE FROM rounds');
    this.sql.exec('DELETE FROM round_answers');
    this.sql.exec('DELETE FROM final_players');
    this.sql.exec("DELETE FROM scheduled_jobs WHERE job_type = 'reveal'");
    this.sql.exec('UPDATE players SET points = 0, redraws_used = 0');
    this.sql.exec(
      `UPDATE room_state
			 SET game_state = 'LOBBY', round_number = 0, completed_rounds = 0,
			     round_id = NULL, turn_status = 'WAITING_FOR_CARDS', question_id = NULL,
			     question_text = NULL, czar_player_id = NULL, winning_submission_id = NULL,
			     reveal_deadline = NULL
			 WHERE singleton = 1`,
    );
    this.systemMessage(`${actor.display_name} opened the table for another game.`, now);
  }

  private shuffleDrawPile(): void {
    const ids = this.sql
      .exec<SqlRow<{ instance_id: string }>>(
        `SELECT instance_id FROM card_instances WHERE location = 'draw'`,
      )
      .toArray()
      .map((row) => row.instance_id);
    for (const [position, instanceId] of shuffled(ids).entries()) {
      this.sql.exec(
        'UPDATE card_instances SET position = ? WHERE instance_id = ?',
        position,
        instanceId,
      );
    }
  }

  private reshuffleDiscards(): void {
    const ids = this.sql
      .exec<SqlRow<{ instance_id: string }>>(
        `SELECT instance_id FROM card_instances WHERE location = 'discard'`,
      )
      .toArray()
      .map((row) => row.instance_id);
    for (const [position, instanceId] of shuffled(ids).entries()) {
      this.sql.exec(
        `UPDATE card_instances
				 SET location = 'draw', position = ?
				 WHERE instance_id = ?`,
        position,
        instanceId,
      );
    }
  }

  private drawCard(playerId: string): CardRow {
    let card = first(
      this.sql
        .exec<CardRow>(
          `SELECT * FROM card_instances
					 WHERE location = 'draw' ORDER BY position ASC LIMIT 1`,
        )
        .toArray(),
    );
    if (card === null) {
      this.reshuffleDiscards();
      card = first(
        this.sql
          .exec<CardRow>(
            `SELECT * FROM card_instances
						 WHERE location = 'draw' ORDER BY position ASC LIMIT 1`,
          )
          .toArray(),
      );
    }
    if (card === null) {
      throw new RoomError('DECK_EXHAUSTED', 'There are no cards left to draw.', 409);
    }
    const handPosition = this.sql
      .exec<SqlRow<{ value: number }>>(
        `SELECT COALESCE(MAX(position), -1) + 1 AS value
				 FROM card_instances WHERE location = 'hand' AND owner_player_id = ?`,
        playerId,
      )
      .one().value;
    this.sql.exec(
      `UPDATE card_instances
			 SET location = 'hand', owner_player_id = ?, position = ?
			 WHERE instance_id = ?`,
      playerId,
      handPosition,
      card.instance_id,
    );
    return card;
  }

  private drawBlankCard(playerId: string): CardRow {
    let blank = first(
      this.sql
        .exec<CardRow>(
          `SELECT * FROM card_instances
					 WHERE location = 'draw' AND is_blank = 1
					 ORDER BY position ASC LIMIT 1`,
        )
        .toArray(),
    );
    if (blank === null) {
      const discardedBlanks = this.sql
        .exec<SqlRow<{ instance_id: string }>>(
          `SELECT instance_id FROM card_instances
						 WHERE location = 'discard' AND is_blank = 1`,
        )
        .toArray()
        .map((row) => row.instance_id);
      const nextPosition = this.sql
        .exec<SqlRow<{ value: number }>>(
          `SELECT COALESCE(MAX(position), -1) + 1 AS value
						 FROM card_instances WHERE location = 'draw'`,
        )
        .one().value;
      for (const [offset, instanceId] of shuffled(discardedBlanks).entries()) {
        this.sql.exec(
          `UPDATE card_instances
					 SET location = 'draw', owner_player_id = NULL, position = ?
					 WHERE instance_id = ?`,
          nextPosition + offset,
          instanceId,
        );
      }
      blank = first(
        this.sql
          .exec<CardRow>(
            `SELECT * FROM card_instances
						 WHERE location = 'draw' AND is_blank = 1
						 ORDER BY position ASC LIMIT 1`,
          )
          .toArray(),
      );
    }
    if (blank === null) {
      throw new RoomError('NOT_ENOUGH_BLANKS', 'There are not enough blank cards.', 409);
    }
    const handPosition = this.handSize(playerId);
    this.sql.exec(
      `UPDATE card_instances
			 SET location = 'hand', owner_player_id = ?, position = ?
			 WHERE instance_id = ?`,
      playerId,
      handPosition,
      blank.instance_id,
    );
    return blank;
  }

  private handSize(playerId: string): number {
    return this.sql
      .exec<SqlRow<{ value: number }>>(
        `SELECT COUNT(*) AS value FROM card_instances
				 WHERE location = 'hand' AND owner_player_id = ?`,
        playerId,
      )
      .one().value;
  }

  private takeQuestion(): SqlRow<{ instance_id: string; text: string }> {
    let question = first(
      this.sql
        .exec<SqlRow<{ instance_id: string; text: string }>>(
          `SELECT instance_id, text FROM question_cards
					 WHERE state = 'draw' ORDER BY position ASC LIMIT 1`,
        )
        .toArray(),
    );
    if (question === null) {
      const ids = this.sql
        .exec<SqlRow<{ instance_id: string }>>('SELECT instance_id FROM question_cards')
        .toArray()
        .map((row) => row.instance_id);
      for (const [position, instanceId] of shuffled(ids).entries()) {
        this.sql.exec(
          `UPDATE question_cards SET state = 'draw', position = ?
					 WHERE instance_id = ?`,
          position,
          instanceId,
        );
      }
      question = first(
        this.sql
          .exec<SqlRow<{ instance_id: string; text: string }>>(
            `SELECT instance_id, text FROM question_cards
						 WHERE state = 'draw' ORDER BY position ASC LIMIT 1`,
          )
          .toArray(),
      );
    }
    if (question === null) {
      throw new RoomError('DECK_EXHAUSTED', 'There are no question cards.', 409);
    }
    this.sql.exec(
      `UPDATE question_cards SET state = 'used' WHERE instance_id = ?`,
      question.instance_id,
    );
    return question;
  }

  private maybeOpenJudging(roundId: string): void {
    const room = this.roomOrThrow();
    if (this.activePlayers().some((player) => player.connected === 0)) {
      return;
    }
    const required = this.activePlayers().filter(
      (player) => player.player_id !== room.czar_player_id,
    ).length;
    const submissions = this.sql
      .exec<SqlRow<{ submission_id: string }>>(
        'SELECT submission_id FROM submissions WHERE round_id = ?',
        roundId,
      )
      .toArray();
    if (required === 0 || submissions.length < required) {
      return;
    }
    for (const [displayOrder, submission] of shuffled(submissions).entries()) {
      this.sql.exec(
        'UPDATE submissions SET display_order = ? WHERE submission_id = ?',
        displayOrder,
        submission.submission_id,
      );
    }
    this.sql.exec(`UPDATE room_state SET turn_status = 'WAITING_FOR_CZAR' WHERE singleton = 1`);
  }

  private submitCard(
    player: PlayerRow,
    cardId: string,
    customText: string | null,
    now: number,
  ): void {
    const room = this.roomOrThrow();
    if (room.game_state !== 'PLAYING' || room.turn_status !== 'WAITING_FOR_CARDS') {
      throw new RoomError('SUBMISSIONS_CLOSED', 'Cards cannot be submitted right now.', 409);
    }
    if (room.czar_player_id === player.player_id) {
      throw new RoomError(
        'CZAR_CANNOT_PLAY',
        'The Card Czar judges this round instead of playing.',
        409,
      );
    }
    if (room.round_id === null) {
      throw new RoomError('ROUND_NOT_READY', 'The round is not ready.', 409);
    }
    const alreadySubmitted = this.sql
      .exec<SqlRow<{ value: number }>>(
        'SELECT COUNT(*) AS value FROM submissions WHERE round_id = ? AND player_id = ?',
        room.round_id,
        player.player_id,
      )
      .one().value;
    if (alreadySubmitted > 0) {
      throw new RoomError('ALREADY_SUBMITTED', 'You already played a card this round.', 409);
    }

    const card = first(
      this.sql
        .exec<CardRow>(
          `SELECT * FROM card_instances
					 WHERE instance_id = ? AND owner_player_id = ? AND location = 'hand'`,
          cardId,
          player.player_id,
        )
        .toArray(),
    );
    if (card === null) {
      throw new RoomError('CARD_NOT_IN_HAND', 'That card is not in your hand.', 409);
    }
    if ((card.is_blank === 1) !== (customText !== null)) {
      throw new RoomError(
        card.is_blank === 1 ? 'BLANK_TEXT_REQUIRED' : 'NOT_A_BLANK_CARD',
        card.is_blank === 1
          ? 'Enter text for this blank card.'
          : 'Only blank cards accept custom text.',
        409,
      );
    }

    const submissionId = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO submissions (
				submission_id, round_id, player_id, card_instance_id,
				custom_text, display_order, is_winner, created_at
			) VALUES (?, ?, ?, ?, ?, NULL, 0, ?)`,
      submissionId,
      room.round_id,
      player.player_id,
      card.instance_id,
      customText,
      now,
    );
    this.sql.exec(
      `UPDATE card_instances
			 SET location = 'played', owner_player_id = NULL
			 WHERE instance_id = ?`,
      card.instance_id,
    );
    this.maybeOpenJudging(room.round_id);
  }

  private redrawCard(player: PlayerRow, cardId: string): void {
    const room = this.roomOrThrow();
    if (room.game_state !== 'PLAYING' || room.turn_status !== 'WAITING_FOR_CARDS') {
      throw new RoomError('REDRAW_CLOSED', 'Cards cannot be redrawn right now.', 409);
    }
    if (room.czar_player_id === player.player_id) {
      throw new RoomError('CZAR_CANNOT_REDRAW', 'The Card Czar cannot redraw this round.', 409);
    }
    if (player.redraws_used >= room.num_redraws) {
      throw new RoomError('NO_REDRAWS_LEFT', 'You have no redraws left this game.', 409);
    }
    if (room.round_id === null) {
      throw new RoomError('ROUND_NOT_READY', 'The round is not ready.', 409);
    }
    const submitted = this.sql
      .exec<SqlRow<{ value: number }>>(
        'SELECT COUNT(*) AS value FROM submissions WHERE round_id = ? AND player_id = ?',
        room.round_id,
        player.player_id,
      )
      .one().value;
    if (submitted > 0) {
      throw new RoomError('ALREADY_SUBMITTED', 'You cannot redraw after submitting.', 409);
    }
    const card = first(
      this.sql
        .exec<CardRow>(
          `SELECT * FROM card_instances
					 WHERE instance_id = ? AND owner_player_id = ? AND location = 'hand'`,
          cardId,
          player.player_id,
        )
        .toArray(),
    );
    if (card === null) {
      throw new RoomError('CARD_NOT_IN_HAND', 'That card is not in your hand.', 409);
    }
    if (card.is_blank === 1) {
      throw new RoomError('BLANK_REDRAW_FORBIDDEN', 'Blank cards cannot be redrawn.', 409);
    }
    this.drawCard(player.player_id);
    this.sql.exec(
      `UPDATE card_instances SET location = 'discard', owner_player_id = NULL
			 WHERE instance_id = ?`,
      card.instance_id,
    );
    this.sql.exec(
      'UPDATE players SET redraws_used = redraws_used + 1 WHERE player_id = ?',
      player.player_id,
    );
  }

  private chooseWinner(player: PlayerRow, submissionId: string, now: number): void {
    const room = this.roomOrThrow();
    if (room.game_state !== 'PLAYING' || room.turn_status !== 'WAITING_FOR_CZAR') {
      throw new RoomError('JUDGING_CLOSED', 'A winner cannot be chosen right now.', 409);
    }
    if (this.activePlayers().some((activePlayer) => activePlayer.connected === 0)) {
      throw new RoomError(
        'WAITING_FOR_RECONNECT',
        'Wait for every player to reconnect before choosing a winner.',
        409,
      );
    }
    if (room.czar_player_id !== player.player_id) {
      throw new RoomError('CZAR_ONLY', 'Only the Card Czar can choose the winner.', 403);
    }
    if (room.round_id === null || room.question_text === null) {
      throw new RoomError('ROUND_NOT_READY', 'The round is not ready.', 409);
    }
    const winner = first(
      this.submissions(room.round_id).filter(
        (submission) => submission.submission_id === submissionId,
      ),
    );
    if (winner === null) {
      throw new RoomError('INVALID_SUBMISSION', 'Choose one of the displayed answers.', 409);
    }

    this.sql.exec(
      'UPDATE submissions SET is_winner = 1 WHERE submission_id = ?',
      winner.submission_id,
    );
    this.sql.exec('UPDATE players SET points = points + 1 WHERE player_id = ?', winner.player_id);
    const revealDeadline = now + WINNER_REVEAL_MS;
    this.sql.exec(
      `UPDATE room_state
			 SET turn_status = 'REVEAL', winning_submission_id = ?, reveal_deadline = ?
			 WHERE singleton = 1`,
      winner.submission_id,
      revealDeadline,
    );
    this.recordRound(room, winner, now);
    this.putJob('reveal', room.round_id, revealDeadline);
  }

  private chatMessage(player: PlayerRow, text: string, now: number): void {
    this.sql.exec(
      `INSERT INTO messages (
				timestamp, type, sender_player_id, sender_display_name, text
			) VALUES (?, 'chat', ?, ?, ?)`,
      now,
      player.player_id,
      player.display_name,
      text,
    );
    this.trimMessages();
  }

  private kickPlayer(actor: PlayerRow, targetPlayerId: string, now: number): string {
    const room = this.roomOrThrow();
    if (room.game_state !== 'LOBBY') {
      throw new RoomError(
        'KICK_LOCKED',
        'Players can only be removed before the game starts.',
        409,
      );
    }
    if (room.host_player_id !== actor.player_id) {
      throw new RoomError('HOST_ONLY', 'Only the room host can remove players.', 403);
    }
    if (targetPlayerId === actor.player_id) {
      throw new RoomError('CANNOT_KICK_SELF', 'Use Leave room to leave the game.');
    }
    const target = this.playerOrThrow(targetPlayerId);
    this.departPlayer(target.player_id, now, true);
    return target.player_id;
  }

  private formatBlankAnswer(value: string): string {
    const firstCharacter = value.charAt(0);
    const capitalized = `${firstCharacter.toLocaleUpperCase('en-US')}${value.slice(1)}`;
    return /[.!?()]$/u.test(capitalized) ? capitalized : `${capitalized}.`;
  }

  private recordRound(room: RoomRow, winner: SubmissionRow, now: number): void {
    if (room.round_id === null || room.question_text === null) {
      throw new RoomError('ROUND_NOT_READY', 'The round is not ready.', 409);
    }
    const submissions = this.submissions(room.round_id);
    const winningAnswer = winner.custom_text ?? winner.card_text;
    this.sql.exec(
      `INSERT INTO rounds (
				round_number, round_id, question, winning_answer,
				winning_player_id, winning_player_name, completed_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      room.round_number,
      room.round_id,
      room.question_text,
      winningAnswer,
      winner.player_id,
      winner.display_name,
      now,
    );
    for (const [answerOrder, submission] of submissions.entries()) {
      this.sql.exec(
        `INSERT INTO round_answers (
					round_number, answer_order, text, player_id,
					player_name, is_winner
				) VALUES (?, ?, ?, ?, ?, ?)`,
        room.round_number,
        answerOrder,
        submission.custom_text ?? submission.card_text,
        submission.player_id,
        submission.display_name,
        submission.submission_id === winner.submission_id ? 1 : 0,
      );
    }
    this.sql.exec(
      'UPDATE room_state SET completed_rounds = completed_rounds + 1 WHERE singleton = 1',
    );
    this.trimRounds();
  }

  private nextCzarAfter(czarOrder: number): PlayerRow {
    const players = this.activePlayers();
    const next = players.find((player) => player.czar_order > czarOrder) ?? players[0];
    if (next === undefined) {
      throw new RoomError('PLAYER_COUNT', 'There are no active players.', 409);
    }
    return next;
  }

  private dealHandsForRound(players: PlayerRow[], replaceHands: boolean): void {
    const room = this.roomOrThrow();
    if (replaceHands) {
      this.sql.exec(
        `UPDATE card_instances
				 SET location = 'discard', owner_player_id = NULL
				 WHERE location = 'hand'`,
      );
      for (const player of players) {
        for (let count = 0; count < room.guaranteed_blanks; count += 1) {
          this.drawBlankCard(player.player_id);
        }
      }
    }
    for (const player of players) {
      while (this.handSize(player.player_id) < room.cards_per_hand) {
        this.drawCard(player.player_id);
      }
    }
  }

  private shouldReplaceHands(
    room: RoomRow,
    czarChanged: boolean,
    outgoingCzarOrder: number,
    nextCzar: PlayerRow,
  ): boolean {
    if (room.hand_redeal_mode === 'every_round') {
      return true;
    }
    return (
      room.hand_redeal_mode === 'czar_rotation' &&
      czarChanged &&
      nextCzar.czar_order <= outgoingCzarOrder
    );
  }

  private advanceRound(now: number): void {
    const room = this.roomOrThrow();
    if (room.czar_player_id === null) {
      throw new RoomError('ROUND_NOT_READY', 'The round has no Card Czar.', 409);
    }
    const oldCzar = this.player(room.czar_player_id, true);
    const oldOrder = oldCzar?.czar_order ?? -1;
    this.discardSubmissions();
    const players = this.activePlayers();
    const nextCzar = this.nextCzarAfter(oldOrder);
    this.dealHandsForRound(players, this.shouldReplaceHands(room, true, oldOrder, nextCzar));
    const question = this.takeQuestion();
    const nextRound = room.round_number + 1;
    const roundId = crypto.randomUUID();
    this.sql.exec(
      `UPDATE room_state
			 SET round_number = ?, round_id = ?, turn_status = 'WAITING_FOR_CARDS',
			     question_id = ?, question_text = ?, czar_player_id = ?,
			     winning_submission_id = NULL, reveal_deadline = NULL
			 WHERE singleton = 1`,
      nextRound,
      roundId,
      question.instance_id,
      question.text,
      nextCzar.player_id,
    );
    this.deleteJob('reveal', room.round_id ?? '');
    this.systemMessage(`Round ${nextRound}: ${nextCzar.display_name} is the Czar.`, now);
  }

  private restartRoundAfterDeparture(departed: PlayerRow, now: number): void {
    const room = this.roomOrThrow();
    const currentSubmissions = room.round_id === null ? [] : this.submissions(room.round_id);
    for (const submission of currentSubmissions) {
      if (submission.player_id === departed.player_id) {
        this.sql.exec(
          `UPDATE card_instances SET location = 'discard', owner_player_id = NULL
					 WHERE instance_id = ?`,
          submission.card_instance_id,
        );
      } else {
        this.sql.exec(
          `UPDATE card_instances SET location = 'hand', owner_player_id = ?, position = ?
					 WHERE instance_id = ?`,
          submission.player_id,
          this.handSize(submission.player_id),
          submission.card_instance_id,
        );
      }
    }
    this.sql.exec('DELETE FROM submissions');
    const players = this.activePlayers();
    const czarChanged = room.czar_player_id === departed.player_id;
    const currentCzar = czarChanged
      ? this.nextCzarAfter(departed.czar_order)
      : room.czar_player_id === null
        ? players[0]
        : this.player(room.czar_player_id, false);
    if (currentCzar === null || currentCzar === undefined) {
      throw new RoomError('PLAYER_COUNT', 'There are no active players.', 409);
    }
    this.dealHandsForRound(
      players,
      this.shouldReplaceHands(room, czarChanged, departed.czar_order, currentCzar),
    );
    const question = this.takeQuestion();
    const nextRoundNumber =
      room.turn_status === 'REVEAL' ? room.round_number + 1 : room.round_number;
    this.sql.exec(
      `UPDATE room_state
			 SET round_number = ?, round_id = ?, turn_status = 'WAITING_FOR_CARDS', czar_player_id = ?,
			     question_id = ?, question_text = ?, winning_submission_id = NULL,
			     reveal_deadline = NULL
			 WHERE singleton = 1`,
      nextRoundNumber,
      crypto.randomUUID(),
      currentCzar.player_id,
      question.instance_id,
      question.text,
    );
    this.deleteJob('reveal', room.round_id ?? '');
    this.systemMessage(`Round ${nextRoundNumber}: ${currentCzar.display_name} is the Czar.`, now);
  }

  private discardSubmissions(): void {
    this.sql.exec(
      `UPDATE card_instances SET location = 'discard', owner_player_id = NULL
			 WHERE instance_id IN (SELECT card_instance_id FROM submissions)`,
    );
    this.sql.exec('DELETE FROM submissions');
  }

  private finishGame(
    outcome: 'won' | 'cancelled',
    winnerPlayerId: string | null,
    now: number,
  ): void {
    const room = this.roomOrThrow();
    const rows = this.sql
      .exec<PlayerRow>(
        `SELECT * FROM players
				 WHERE left_at IS NULL AND kicked_at IS NULL
				 ORDER BY points DESC, czar_order ASC`,
      )
      .toArray();
    this.sql.exec('DELETE FROM final_players');
    for (const [rankIndex, player] of rows.entries()) {
      this.sql.exec(
        `INSERT INTO final_players (
					player_id, display_name, color_primary, color_secondary,
					points, czar_order, connected, rank, is_winner
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        player.player_id,
        player.display_name,
        player.color_primary,
        player.color_secondary,
        player.points,
        player.czar_order,
        player.connected,
        rankIndex + 1,
        outcome === 'won' && player.player_id === winnerPlayerId ? 1 : 0,
      );
    }
    this.sql.exec(
      `UPDATE room_state
			 SET game_state = 'FINISHED', winning_submission_id = NULL,
			     reveal_deadline = NULL
			 WHERE singleton = 1`,
    );
    this.deleteJob('reveal', room.round_id ?? '');
    void now;
  }

  private departPlayer(playerId: string, now: number, kicked: boolean): void {
    const room = this.roomOrThrow();
    const player = this.playerOrThrow(playerId);
    this.sql.exec(
      `UPDATE players
			 SET connected = 0, left_at = ?, kicked_at = ?
			 WHERE player_id = ?`,
      now,
      kicked ? now : null,
      player.player_id,
    );
    this.sql.exec(
      `UPDATE sessions SET revoked_at = ?
			 WHERE player_id = ? AND revoked_at IS NULL`,
      now,
      player.player_id,
    );
    this.sql.exec(
      `UPDATE card_instances SET location = 'discard', owner_player_id = NULL
			 WHERE owner_player_id = ? AND location = 'hand'`,
      player.player_id,
    );
    this.deleteJob('disconnect', player.player_id);

    const remaining = this.activePlayers();
    if (room.host_player_id === player.player_id) {
      this.sql.exec(
        'UPDATE room_state SET host_player_id = ? WHERE singleton = 1',
        remaining[0]?.player_id ?? null,
      );
    }
    if (!kicked) {
      this.systemMessage(`${player.display_name} has left the game.`, now);
    }

    if (room.game_state === 'PLAYING') {
      if (remaining.length < MIN_PLAYERS) {
        this.discardSubmissions();
        this.finishGame('cancelled', null, now);
      } else {
        this.restartRoundAfterDeparture(player, now);
      }
    }
  }

  private completeReveal(roundId: string, now: number): boolean {
    const room = this.roomOrThrow();
    if (
      room.game_state !== 'PLAYING' ||
      room.turn_status !== 'REVEAL' ||
      room.round_id !== roundId ||
      room.winning_submission_id === null
    ) {
      return false;
    }
    const winner = first(
      this.submissions(roundId).filter(
        (submission) => submission.submission_id === room.winning_submission_id,
      ),
    );
    if (winner === null) {
      this.restartRoundAfterDeparture(this.playerOrThrow(room.czar_player_id ?? ''), now);
      return true;
    }
    const winnerPlayer = this.player(winner.player_id, false);
    if (winnerPlayer !== null && winnerPlayer.points >= room.points_to_win) {
      this.finishGame('won', winnerPlayer.player_id, now);
    } else {
      this.advanceRound(now);
    }
    return true;
  }

  private async runDueJobs(now: number): Promise<DueResult> {
    if (await this.expireRoomIfDue(now)) {
      return { changed: false, deleted: true };
    }
    if (this.room() === null) {
      return { changed: false, deleted: false };
    }
    let changed = false;
    this.ctx.storage.transactionSync(() => {
      changed = this.processDueJobsSync(now);
      if (changed) {
        this.bumpRevision(now);
        this.touchRoom(now);
      }
    });
    return { changed, deleted: false };
  }

  private async expireRoomIfDue(now: number): Promise<boolean> {
    const room = this.room();
    if (room === null || room.expires_at > now) {
      return false;
    }
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(4004, 'Room expired');
      } catch {
        // Socket is already gone.
      }
    }
    await this.ctx.storage.deleteAll();
    this.schemaReady = false;
    return true;
  }

  private processDueJobsSync(now: number): boolean {
    const dueJobs = this.sql
      .exec<JobRow>(
        `SELECT job_type, job_key, due_at FROM scheduled_jobs
				 WHERE due_at <= ? AND job_type <> 'ttl'
				 ORDER BY due_at ASC LIMIT 100`,
        now,
      )
      .toArray();
    let changed = false;
    for (const job of dueJobs) {
      if (job.job_type === 'reveal') {
        changed = this.completeReveal(job.job_key, now) || changed;
      } else if (job.job_type === 'disconnect') {
        const player = this.player(job.job_key, false);
        const hasSocket = this.ctx
          .getWebSockets(`player:${job.job_key}`)
          .some((socket) => socket.readyState === WebSocket.OPEN);
        if (player !== null && player.connected === 0 && !hasSocket) {
          this.departPlayer(player.player_id, now, false);
          changed = true;
        }
      }
      this.deleteJob(job.job_type, job.job_key);
    }
    return changed;
  }

  private async handleSocketDeparture(ws: WebSocket): Promise<void> {
    await this.exclusive(async () => {
      if (!this.ensureExistingSchema()) {
        return;
      }
      const attachment = socketAttachment(ws);
      if (attachment === null || this.room() === null) {
        return;
      }
      if (attachment.role === 'display') {
        return;
      }
      const stillConnected = this.ctx
        .getWebSockets(`player:${attachment.playerId}`)
        .some((candidate) => candidate !== ws && candidate.readyState === WebSocket.OPEN);
      if (stillConnected) {
        return;
      }
      const now = Date.now();
      let changed = false;
      this.ctx.storage.transactionSync(() => {
        const player = this.player(attachment.playerId, false);
        if (player === null || player.connected === 0) {
          return;
        }
        this.sql.exec('UPDATE players SET connected = 0 WHERE player_id = ?', player.player_id);
        this.putJob('disconnect', player.player_id, now + DISCONNECT_GRACE_MS);
        this.bumpRevision(now);
        this.touchRoom(now);
        changed = true;
      });
      await this.rescheduleAlarm();
      if (changed) {
        this.broadcastSnapshots(now);
      }
    });
  }

  private touchSession(sessionHash: string, now: number): void {
    const session = this.activeSession(sessionHash, now);
    if (session === null) {
      return;
    }
    this.sql.exec(
      `UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE session_hash = ?`,
      now,
      session.player_id === null ? now + PROVISIONAL_SESSION_TTL_MS : now + SESSION_TTL_MS,
      sessionHash,
    );
  }

  private touchRoom(now: number): void {
    const totalPlayers = this.sql
      .exec<SqlRow<{ value: number }>>('SELECT COUNT(*) AS value FROM players')
      .one().value;
    const expiresAt = now + (totalPlayers === 0 ? UNCLAIMED_ROOM_TTL_MS : ACTIVE_ROOM_TTL_MS);
    this.sql.exec(
      'UPDATE room_state SET updated_at = ?, expires_at = ? WHERE singleton = 1',
      now,
      expiresAt,
    );
    this.putJob('ttl', 'room', expiresAt);
  }

  private bumpRevision(now: number): void {
    this.sql.exec(
      `UPDATE room_state SET revision = revision + 1, updated_at = ? WHERE singleton = 1`,
      now,
    );
  }

  private putJob(jobType: string, jobKey: string, dueAt: number): void {
    this.sql.exec(
      `INSERT INTO scheduled_jobs (job_type, job_key, due_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(job_type, job_key) DO UPDATE SET due_at = excluded.due_at`,
      jobType,
      jobKey,
      dueAt,
    );
  }

  private deleteJob(jobType: string, jobKey: string): void {
    this.sql.exec('DELETE FROM scheduled_jobs WHERE job_type = ? AND job_key = ?', jobType, jobKey);
  }

  private async rescheduleAlarm(): Promise<void> {
    if (!this.schemaReady) {
      return;
    }
    const next = first(
      this.sql
        .exec<SqlRow<{ due_at: number }>>(
          'SELECT due_at FROM scheduled_jobs ORDER BY due_at ASC LIMIT 1',
        )
        .toArray(),
    );
    if (next === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(next.due_at);
    }
  }

  private systemMessage(text: string, now: number): void {
    this.sql.exec(
      `INSERT INTO messages (
				timestamp, type, sender_player_id, sender_display_name, text
			) VALUES (?, 'system', NULL, ?, ?)`,
      now,
      GAME_LABEL,
      text,
    );
    this.trimMessages();
  }

  private trimMessages(): void {
    this.sql.exec(
      `DELETE FROM messages
			 WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)`,
    );
  }

  private trimRounds(): void {
    this.sql.exec(
      `DELETE FROM round_answers
			 WHERE round_number NOT IN (
				SELECT round_number FROM rounds ORDER BY round_number DESC LIMIT 200
			 )`,
    );
    this.sql.exec(
      `DELETE FROM rounds
			 WHERE round_number NOT IN (
				SELECT round_number FROM rounds ORDER BY round_number DESC LIMIT 200
			 )`,
    );
  }

  private commandReceipt(
    generation: string,
    playerId: string,
    commandId: string,
  ): ReceiptRow | null {
    return first(
      this.sql
        .exec<ReceiptRow>(
          `SELECT * FROM command_receipts
					 WHERE room_generation = ? AND player_id = ? AND command_id = ?`,
          generation,
          playerId,
          commandId,
        )
        .toArray(),
    );
  }

  private consumeInboundRate(sessionHash: string, now: number): RoomError | null {
    const existing = first(
      this.sql
        .exec<SqlRow<{ tokens: number; last_refill_at: number }>>(
          'SELECT tokens, last_refill_at FROM inbound_rate_limits WHERE session_hash = ?',
          sessionHash,
        )
        .toArray(),
    );
    const elapsed = Math.max(0, now - (existing?.last_refill_at ?? now));
    const replenished = Math.min(
      COMMAND_BURST,
      (existing?.tokens ?? COMMAND_BURST) + (elapsed * COMMANDS_PER_SECOND) / 1_000,
    );
    if (replenished < 1) {
      this.sql.exec(
        `INSERT INTO inbound_rate_limits(session_hash, tokens, last_refill_at)
				 VALUES (?, ?, ?)
				 ON CONFLICT(session_hash) DO UPDATE
				 SET tokens = excluded.tokens, last_refill_at = excluded.last_refill_at`,
        sessionHash,
        replenished,
        now,
      );
      return new RoomError('RATE_LIMITED', 'You are sending commands too quickly.', 429);
    }
    this.sql.exec(
      `INSERT INTO inbound_rate_limits(session_hash, tokens, last_refill_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(session_hash) DO UPDATE
			 SET tokens = excluded.tokens, last_refill_at = excluded.last_refill_at`,
      sessionHash,
      replenished - 1,
      now,
    );
    return null;
  }

  private consumeChatRate(sessionHash: string, now: number): RoomError | null {
    this.sql.exec(
      'DELETE FROM chat_rate_events WHERE session_hash = ? AND occurred_at <= ?',
      sessionHash,
      now - CHAT_WINDOW_MS,
    );
    const chatCount = this.sql
      .exec<SqlRow<{ value: number }>>(
        'SELECT COUNT(*) AS value FROM chat_rate_events WHERE session_hash = ?',
        sessionHash,
      )
      .one().value;
    if (chatCount >= CHAT_WINDOW_LIMIT) {
      return new RoomError(
        'RATE_LIMITED',
        'Chat is limited to five messages every ten seconds.',
        429,
      );
    }
    this.sql.exec(
      'INSERT INTO chat_rate_events(session_hash, occurred_at) VALUES (?, ?)',
      sessionHash,
      now,
    );
    return null;
  }

  private insertCommandReceipt(
    session: SessionRow,
    playerId: string,
    commandId: string,
    requestDigest: string,
    responseJson: string,
    now: number,
  ): void {
    this.sql.exec(
      `INSERT INTO command_receipts (
				room_generation, player_id, command_id, request_digest,
				response_json, processed_at, revision
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      session.room_generation,
      playerId,
      commandId,
      requestDigest,
      responseJson,
      now,
      this.roomOrThrow().revision,
    );
    this.sql.exec('DELETE FROM command_receipts WHERE processed_at < ?', now - SESSION_TTL_MS);
  }

  private async commandDigest(command: ClientCommand): Promise<string> {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(command)),
    );
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  private snapshotFrame(sessionHash: string, now: number): SnapshotMessage {
    return {
      protocolVersion: 1,
      type: 'snapshot',
      snapshot: this.snapshot(sessionHash, now),
    };
  }

  private publicSnapshotFrame(now: number): SnapshotMessage {
    return {
      protocolVersion: 1,
      type: 'snapshot',
      snapshot: this.publicSnapshot(now),
    };
  }

  private errorFrame(error: RoomError, commandId?: string): ErrorMessage {
    return {
      protocolVersion: 1,
      type: 'error',
      ...(commandId === undefined ? {} : { commandId }),
      error: {
        code: error.code,
        message: error.message,
        ...(error.title === undefined ? {} : { title: error.title }),
      },
    };
  }

  private serializeFrames(frames: readonly ServerSocketMessage[]): string {
    return JSON.stringify(frames.map((frame) => JSON.stringify(frame)));
  }

  private sendSerializedFrames(ws: WebSocket, serialized: string): void {
    let decoded: unknown;
    try {
      decoded = JSON.parse(serialized);
    } catch {
      this.sendError(
        ws,
        new RoomError('INTERNAL_ERROR', 'A saved command response is corrupt.', 500),
      );
      return;
    }
    if (!Array.isArray(decoded) || !decoded.every((frame) => typeof frame === 'string')) {
      this.sendError(
        ws,
        new RoomError('INTERNAL_ERROR', 'A saved command response is corrupt.', 500),
      );
      return;
    }
    for (const frame of decoded) {
      try {
        ws.send(frame);
      } catch {
        return;
      }
    }
  }

  private sendFrames(ws: WebSocket, frames: readonly ServerSocketMessage[]): void {
    for (const frame of frames) {
      try {
        ws.send(JSON.stringify(frame));
      } catch {
        return;
      }
    }
  }

  private sendError(ws: WebSocket, error: RoomError, commandId?: string): void {
    this.sendFrames(ws, [this.errorFrame(error, commandId)]);
  }

  private sendSnapshot(ws: WebSocket, sessionHash: string, now: number): void {
    this.sendSerializedSnapshot(ws, JSON.stringify(this.snapshotFrame(sessionHash, now)));
  }

  private sendPublicSnapshot(ws: WebSocket, now: number): void {
    this.sendSerializedSnapshot(ws, JSON.stringify(this.publicSnapshotFrame(now)));
  }

  private sendSerializedSnapshot(ws: WebSocket, serialized: string): void {
    try {
      ws.send(serialized);
    } catch {
      // Player departure or display reconnect handling owns a failed socket.
    }
  }

  private terminalSocket(error: RoomError, closeCode: number): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    server.send(JSON.stringify(this.errorFrame(error)));
    server.close(closeCode, error.code);
    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcastSnapshots(now: number, except?: WebSocket): void {
    const generation = this.roomOrThrow().generation;
    let serializedPublicSnapshot: string | null = null;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except || ws.readyState !== WebSocket.OPEN) {
        continue;
      }
      const attachment = socketAttachment(ws);
      if (attachment === null) {
        ws.close(1008, 'Invalid socket session');
        continue;
      }
      if (attachment.role === 'display') {
        if (attachment.generation !== generation) {
          ws.close(4001, 'Display session expired');
          continue;
        }
        serializedPublicSnapshot ??= JSON.stringify(this.publicSnapshotFrame(now));
        this.sendSerializedSnapshot(ws, serializedPublicSnapshot);
        continue;
      }
      if (this.activeSession(attachment.sessionHash, now) === null) {
        ws.close(4001, 'Session expired');
        continue;
      }
      this.sendSnapshot(ws, attachment.sessionHash, now);
    }
  }

  private closeSessionSockets(sessionHash: string, code: number, reason: string): void {
    for (const ws of this.ctx.getWebSockets(`session:${sessionHash}`)) {
      try {
        ws.close(code, reason);
      } catch {
        // Socket is already gone.
      }
    }
  }

  private closePlayerSocketsWithError(playerId: string): void {
    for (const ws of this.ctx.getWebSockets(`player:${playerId}`)) {
      try {
        ws.send(
          JSON.stringify(
            this.errorFrame(new RoomError('KICKED', 'You were removed from this room.', 403)),
          ),
        );
        ws.close(4003, 'KICKED');
      } catch {
        // Socket is already gone.
      }
    }
  }
}
