import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gameApi, GameApiError, RoomSocket } from '@/api/gameClient';
import type { GameSnapshot } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';

const ROOM_ID = 'ABCDE';

function makeSnapshot(revision = 1): GameSnapshot {
  return {
    protocolVersion: 1,
    revision,
    serverTime: 1_000,
    room: {
      roomId: ROOM_ID,
      phase: 'LOBBY',
      gameState: 'LOBBY',
      players: [],
      settings: {
        cardsPerHand: 7,
        pointsToWin: 10,
        numBlankCards: 0,
        guaranteedBlanks: 0,
        allBlanks: false,
        familyMode: false,
        numRedraws: 4,
      },
      turn: {
        roundId: '',
        revealDeadline: null,
        round: 0,
        status: 'WAITING_FOR_CARDS',
        questionCard: '',
        czarPlayerId: '',
        playedCards: [],
        submittedPlayerIds: [],
        winningCard: null,
      },
      chatMessages: [],
      roundHistory: [],
      finalRecord: null,
    },
    me: null,
  };
}

describe('provisional profile failures', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', globalThis);
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    ['ROOM_FULL', 'This room is already full.'],
    ['ROOM_LOCKED', 'This game has already started.'],
    ['PROFILE_LOCKED', 'This game has already started.'],
    ['GAME_ALREADY_STARTED', 'This game has already started.'],
    ['ROOM_EXPIRED', 'This room is no longer available.'],
    ['ROOM_NOT_FOUND', 'This room is no longer available.'],
    ['INVALID_SESSION', 'This room is no longer available.'],
    ['LOST_SESSION', 'This room is no longer available.'],
  ])('exits the modal flow and maps %s to its existing join toast', async (code, message) => {
    const game = useGameStore();
    const ui = useUiStore();
    game.room.roomId = ROOM_ID;
    game.needsProfile = true;
    const rejection = new GameApiError('Server detail must not leak into this flow.', { code });
    vi.spyOn(gameApi, 'setProfile').mockRejectedValueOnce(rejection);

    await expect(game.setProfile('Friend', ['#111111', '#222222'])).rejects.toBe(rejection);

    expect(game.terminalExit).toBe('INVALID_ROOM');
    expect(game.needsProfile).toBe(true);
    expect(ui.error).toEqual({
      title: 'Unable to Join',
      message,
      type: 'ERROR',
    });
  });
});

type SocketEventListener = (event: unknown) => void;

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];
  private readonly listeners = new Map<string, SocketEventListener[]>();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: SocketEventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  send(frame: string): void {
    this.sent.push(frame);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.emit('open', {});
  }

  disconnect(code = 1006): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close', { code });
  }

  receive(data: unknown): void {
    this.emit('message', { data: JSON.stringify(data) });
  }

  private emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('RoomSocket replacement races', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      location: {
        origin: 'http://127.0.0.1:5173',
        protocol: 'http:',
      },
    });
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ignores a queued snapshot from a socket after reconnect replaces it', async () => {
    const onSnapshot = vi.fn();
    const onError = vi.fn();
    const socket = new RoomSocket(ROOM_ID, {
      onSnapshot,
      onError,
      onTerminalError: vi.fn(),
      onConnectionState: vi.fn(),
    });

    socket.connect();
    const first = FakeWebSocket.instances[0];
    first.open();
    first.disconnect();

    await vi.advanceTimersByTimeAsync(500);
    const replacement = FakeWebSocket.instances[1];
    replacement.open();

    const frame = {
      protocolVersion: 1,
      type: 'snapshot',
      snapshot: makeSnapshot(),
    };
    first.receive(frame);

    expect(onSnapshot).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    replacement.receive(frame);
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith(frame.snapshot);

    socket.close();
  });
});
