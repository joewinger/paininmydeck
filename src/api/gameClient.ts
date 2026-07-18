import type {
  ApiErrorBody,
  ClientCommand,
  ClientCommandDraft,
  ConnectionState,
  CreateRoomResponse,
  EnterRoomResponse,
  GameSnapshot,
  RoomId,
  ServerSocketMessage,
  SetProfileRequest,
  SetProfileResponse,
  WatchRoomResponse,
} from '@/shared/protocol';
import { isRoomId, normalizeRoomId } from '@/shared/protocol';
import { getTurnstileToken } from '@/api/turnstile';
import { commitHash } from '@/config';

export class GameApiError extends Error {
  readonly code: string;
  readonly title?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; title?: string; status?: number } = {}) {
    super(message);
    this.name = 'GameApiError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.title = options.title;
    this.status = options.status;
  }
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9_500);
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      payload = undefined;
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GameApiError('The server did not respond. Please try again.', {
        code: 'REQUEST_TIMEOUT',
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const apiError = (payload as Partial<ApiErrorBody> | undefined)?.error;
    throw new GameApiError(apiError?.message ?? `Request failed (${response.status})`, {
      code: apiError?.code ?? `HTTP_${response.status}`,
      title: apiError?.title,
      status: response.status,
    });
  }

  return payload as T;
}

function checkedRoomId(value: unknown): RoomId {
  const roomId = normalizeRoomId(value);
  if (!isRoomId(roomId)) {
    throw new GameApiError('Room IDs contain exactly five letters (without I or O).', {
      code: 'INVALID_ROOM_ID',
      title: 'Invalid Room ID',
    });
  }
  return roomId;
}

export const gameApi = {
  async createRoom(): Promise<CreateRoomResponse> {
    const turnstileToken = import.meta.env.VITE_TURNSTILE_SITE_KEY
      ? await getTurnstileToken('create_room')
      : '';
    return postJson<CreateRoomResponse>('/api/rooms', { turnstileToken });
  },

  async enterRoom(roomId: string): Promise<EnterRoomResponse> {
    const id = checkedRoomId(roomId);
    const path = `/api/rooms/${id}/enter`;
    try {
      return await postJson<EnterRoomResponse>(path, {});
    } catch (error) {
      if (!(error instanceof GameApiError) || error.code !== 'TURNSTILE_REQUIRED') throw error;
      return postJson<EnterRoomResponse>(path, {
        turnstileToken: await getTurnstileToken('enter_room'),
      });
    }
  },

  async watchRoom(roomId: string): Promise<WatchRoomResponse> {
    const id = checkedRoomId(roomId);
    const path = `/api/rooms/${id}/watch`;
    try {
      return await postJson<WatchRoomResponse>(path, {});
    } catch (error) {
      if (!(error instanceof GameApiError) || error.code !== 'TURNSTILE_REQUIRED') throw error;
      return postJson<WatchRoomResponse>(path, {
        turnstileToken: await getTurnstileToken('watch_room'),
      });
    }
  },

  setProfile(roomId: string, profile: SetProfileRequest): Promise<SetProfileResponse> {
    const id = checkedRoomId(roomId);
    return postJson<SetProfileResponse>(`/api/rooms/${id}/profile`, profile);
  },
};

export interface RoomSocketHandlers {
  onSnapshot(snapshot: GameSnapshot): void;
  onError(error: GameApiError): void;
  onTerminalError(error: GameApiError): void;
  onConnectionState(state: ConnectionState): void;
}

export interface RoomSocketOptions {
  endpoint?: 'socket' | 'watch-socket';
  readOnly?: boolean;
}

interface PendingCommand {
  message: ClientCommand;
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 5_000, 10_000] as const;
const COMMAND_TIMEOUT_MS = 9_500;

export class RoomSocket {
  private readonly roomId: RoomId;
  private readonly handlers: RoomSocketHandlers;
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private connectTimeoutId: number | null = null;
  private reconnectAttempt = 0;
  private reportedConnectionFailure = false;
  private shouldReconnect = false;
  private pending = new Map<string, PendingCommand>();
  private readonly endpoint: NonNullable<RoomSocketOptions['endpoint']>;
  private readonly readOnly: boolean;

  constructor(roomId: string, handlers: RoomSocketHandlers, options: RoomSocketOptions = {}) {
    this.roomId = checkedRoomId(roomId);
    this.handlers = handlers;
    this.endpoint = options.endpoint ?? 'socket';
    this.readOnly = options.readOnly ?? false;
  }

  connect(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    )
      return;
    this.shouldReconnect = true;
    this.openSocket(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting');
  }

  close(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.clearConnectTimeout();
    this.socket?.close(1000, 'Client left room');
    this.socket = null;
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeoutId);
      pending.reject(
        new GameApiError('The room connection was closed.', { code: 'CONNECTION_CLOSED' }),
      );
    }
    this.pending.clear();
    this.handlers.onConnectionState('closed');
  }

  send(command: ClientCommandDraft): Promise<void> {
    if (this.readOnly) {
      return Promise.reject(
        new GameApiError('This room display is read-only.', { code: 'READ_ONLY_SESSION' }),
      );
    }
    if (!this.shouldReconnect) {
      return Promise.reject(
        new GameApiError('You are not connected to a room.', { code: 'NOT_CONNECTED' }),
      );
    }

    const commandId = createCommandId();
    const message = {
      ...command,
      protocolVersion: 1 as const,
      commandId,
    } as ClientCommand;

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pending.delete(commandId);
        reject(
          new GameApiError('The room did not respond. Please try again.', {
            code: 'COMMAND_TIMEOUT',
          }),
        );
      }, COMMAND_TIMEOUT_MS);

      this.pending.set(commandId, { message, resolve, reject, timeoutId });
      this.sendFrame(message);
    });
  }

  private openSocket(state: ConnectionState): void {
    this.handlers.onConnectionState(state);
    const url = new URL(`/api/rooms/${this.roomId}/${this.endpoint}`, window.location.origin);
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;
    this.clearConnectTimeout();
    this.connectTimeoutId = window.setTimeout(() => {
      if (this.socket !== socket || socket.readyState !== WebSocket.CONNECTING) return;
      this.socket = null;
      this.clearConnectTimeout();
      try {
        socket.close();
      } catch {
        // A stalled browser handshake may reject close while still connecting.
      }
      if (!this.reportedConnectionFailure) {
        this.reportedConnectionFailure = true;
        this.handlers.onError(
          new GameApiError('The room connection did not respond. Retrying…', {
            code: 'CONNECTION_TIMEOUT',
          }),
        );
      }
      if (this.shouldReconnect) this.scheduleReconnect();
    }, COMMAND_TIMEOUT_MS);

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      this.clearConnectTimeout();
      this.reconnectAttempt = 0;
      this.reportedConnectionFailure = false;
      this.handlers.onConnectionState('open');
      for (const pending of this.pending.values()) this.sendFrame(pending.message);
    });

    socket.addEventListener('message', (event) => {
      // Closing or replacing a socket does not cancel already-queued browser
      // message events. Ignore those frames so a post-leave snapshot cannot
      // restore an old room or interfere with a newly-entered room.
      if (this.socket !== socket || !this.shouldReconnect) return;
      this.onMessage(event);
    });

    socket.addEventListener('close', (event) => {
      if (this.socket !== socket) return;
      this.clearConnectTimeout();
      const terminalError = terminalErrorForClose(event);
      if (terminalError) {
        this.terminate(terminalError);
        this.handlers.onTerminalError(terminalError);
        return;
      }
      this.socket = null;
      if (this.shouldReconnect) this.scheduleReconnect();
      else this.handlers.onConnectionState('closed');
    });

    socket.addEventListener('error', () => {
      // The close event owns reconnection. Browser WebSocket errors contain no
      // actionable details, so reporting them here would produce duplicate toasts.
    });
  }

  private onMessage(event: MessageEvent): void {
    let message: ServerSocketMessage;
    try {
      const decoded = JSON.parse(String(event.data)) as unknown;
      if (typeof decoded !== 'object' || decoded === null) throw new Error('Invalid frame');
      message = decoded as ServerSocketMessage;
    } catch {
      this.handlers.onError(
        new GameApiError('The room sent an invalid response.', { code: 'INVALID_MESSAGE' }),
      );
      return;
    }

    if (message.protocolVersion !== 1) {
      this.handleProtocolMismatch((message as { protocolVersion?: unknown }).protocolVersion);
      return;
    }

    if (message.type === 'snapshot') {
      if (message.snapshot.protocolVersion !== 1) {
        this.handleProtocolMismatch(message.snapshot.protocolVersion);
        return;
      }
      if (message.snapshot.room.roomId !== this.roomId) {
        this.handlers.onError(
          new GameApiError('The room sent a snapshot for a different room.', {
            code: 'INVALID_MESSAGE',
          }),
        );
        return;
      }
      this.handlers.onSnapshot(message.snapshot);
      return;
    }

    if (message.type === 'ack') {
      const pending = this.pending.get(message.commandId);
      if (!pending) return;
      window.clearTimeout(pending.timeoutId);
      this.pending.delete(message.commandId);
      pending.resolve();
      return;
    }

    if (message.type === 'error') {
      const error = new GameApiError(message.error.message, {
        code: message.error.code,
        title: message.error.title,
      });
      if (error.code === 'OUTDATED_CLIENT') {
        this.handleProtocolMismatch('server');
        return;
      }
      if (['KICKED_SESSION', 'LOST_SESSION', 'ROOM_EXPIRED', 'INVALID_ROOM'].includes(error.code)) {
        this.terminate(error);
        this.handlers.onTerminalError(error);
        return;
      }
      let matchedCommand = false;
      if (message.commandId) {
        const pending = this.pending.get(message.commandId);
        if (pending) {
          matchedCommand = true;
          window.clearTimeout(pending.timeoutId);
          this.pending.delete(message.commandId);
          pending.reject(error);
        }
      }
      if (!matchedCommand) this.handlers.onError(error);
    }
  }

  private sendFrame(message: ClientCommand): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private handleProtocolMismatch(receivedVersion: unknown): void {
    const error = new GameApiError('This game was updated. Reload to use the latest version.', {
      code: 'OUTDATED_CLIENT',
      title: 'Update Required',
    });
    this.terminate(error);
    this.handlers.onError(error);
    const guardKey = `paininmydeck:protocol-reload:${commitHash}:${String(receivedVersion ?? 'unknown')}`;
    let shouldReload = false;
    try {
      if (sessionStorage.getItem(guardKey) === '1') return;
      sessionStorage.setItem(guardKey, '1');
      shouldReload = true;
    } catch {
      // History state survives a reload in the same tab and prevents a reload
      // loop in browsers that block session storage.
      try {
        const state = (window.history.state ?? {}) as Record<string, unknown>;
        if (state.__pidProtocolReload === guardKey) return;
        window.history.replaceState({ ...state, __pidProtocolReload: guardKey }, '');
        shouldReload = true;
      } catch {
        // Keep the actionable update error visible if neither guard is usable.
      }
    }
    if (shouldReload) window.setTimeout(() => window.location.reload(), 750);
  }

  private terminate(error: GameApiError): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.clearConnectTimeout();
    const socket = this.socket;
    this.socket = null;
    socket?.close(4000, 'Terminal room session');
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pending.clear();
    this.handlers.onConnectionState('closed');
  }

  private scheduleReconnect(): void {
    this.handlers.onConnectionState('reconnecting');
    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) this.openSocket('reconnecting');
    }, delay);
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutId !== null) window.clearTimeout(this.connectTimeoutId);
    this.connectTimeoutId = null;
  }
}

function createCommandId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function terminalErrorForClose(event: CloseEvent): GameApiError | null {
  if (event.code === 4003) {
    return new GameApiError("You've been kicked :(", { code: 'KICKED_SESSION', title: 'Kicked!' });
  }
  if (event.code === 4004) {
    return new GameApiError('This room has expired.', {
      code: 'ROOM_EXPIRED',
      title: 'Invalid Room',
    });
  }
  if (event.code === 4001 || event.code === 1008) {
    return new GameApiError('This room session is no longer available.', {
      code: 'LOST_SESSION',
      title: 'Invalid Room',
    });
  }
  return null;
}
