/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env, reset } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ClientCommand,
  GameSettings,
  GameSnapshot,
  ServerSocketMessage,
} from '../../src/shared/protocol';
import type { RpcResult } from '../../worker/errors';
import { GameRoom } from '../../worker/game-room';

const rooms = env.GAME_ROOMS as DurableObjectNamespace<GameRoom>;

const COLORS = [
  ['#EE796E', '#FAB4AD'],
  ['#F2A971', '#FCD4B5'],
  ['#F4C876', '#FDE6B9'],
  ['#ADD787', '#CAEBAD'],
  ['#65C294', '#96DFBB'],
  ['#5E87C5', '#8FAFE0'],
  ['#5561AF', '#808BD0'],
  ['#7E67AF', '#A793D2'],
  ['#BE7CB5', '#DEABD7'],
] as const;

const QUICK_SETTINGS: GameSettings = {
  cardsPerHand: 3,
  pointsToWin: 1,
  numBlankCards: 0,
  guaranteedBlanks: 0,
  allBlanks: false,
  familyMode: false,
  numRedraws: 1,
};

interface TestPlayer {
  name: string;
  playerId: string;
  sessionHash: string;
}

interface TestLobby {
  generation: string;
  players: TestPlayer[];
  stub: DurableObjectStub<GameRoom>;
}

interface ObservedFrame {
  frame: ServerSocketMessage;
  index: number;
}

interface CommandResult {
  response: ObservedFrame;
  snapshot?: ObservedFrame;
}

function unwrap<T>(result: RpcResult<T>): T {
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.value;
}

function sessionHash(index: number): string {
  return ((index + 1) % 16).toString(16).repeat(64);
}

class SocketHarness {
  readonly frames: ServerSocketMessage[] = [];

  constructor(readonly socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      this.frames.push(JSON.parse(String(event.data)) as ServerSocketMessage);
    });
    socket.accept();
  }

  async waitFor(
    predicate: (frame: ServerSocketMessage) => boolean,
    afterIndex = 0,
  ): Promise<ObservedFrame> {
    const find = (): ObservedFrame | null => {
      const index = this.frames.findIndex(
        (frame, candidateIndex) => candidateIndex >= afterIndex && predicate(frame),
      );
      return index < 0 ? null : { frame: this.frames[index], index };
    };
    const existing = find();
    if (existing !== null) {
      return existing;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket.removeEventListener('message', onMessage);
        reject(new Error(`Timed out waiting for socket frame after ${afterIndex}.`));
      }, 2_000);
      const onMessage = (): void => {
        const observed = find();
        if (observed === null) {
          return;
        }
        clearTimeout(timeout);
        this.socket.removeEventListener('message', onMessage);
        resolve(observed);
      };
      this.socket.addEventListener('message', onMessage);
    });
  }

  async initialSnapshot(): Promise<GameSnapshot> {
    const observed = await this.waitFor((frame) => frame.type === 'snapshot');
    if (observed.frame.type !== 'snapshot') {
      throw new Error('Expected a snapshot frame.');
    }
    return observed.frame.snapshot;
  }

  async waitForSnapshot(
    predicate: (snapshot: GameSnapshot) => boolean,
    afterIndex = 0,
  ): Promise<ObservedFrame> {
    return this.waitFor(
      (frame) => frame.type === 'snapshot' && predicate(frame.snapshot),
      afterIndex,
    );
  }

  async command(command: ClientCommand): Promise<CommandResult> {
    const afterIndex = this.frames.length;
    this.socket.send(JSON.stringify(command));
    const response = await this.waitFor(
      (frame) =>
        (frame.type === 'ack' || frame.type === 'error') && frame.commandId === command.commandId,
      afterIndex,
    );
    if (response.frame.type === 'error') {
      return { response };
    }
    const snapshot = await this.waitFor((frame) => frame.type === 'snapshot', response.index + 1);
    return { response, snapshot };
  }
}

function snapshotFrom(result: CommandResult): GameSnapshot {
  const frame = result.snapshot?.frame;
  if (frame?.type !== 'snapshot') {
    throw new Error('Command did not return a snapshot.');
  }
  return frame.snapshot;
}

function expectError(result: CommandResult, code: string): void {
  expect(result.response.frame).toMatchObject({
    protocolVersion: 1,
    type: 'error',
    error: { code },
  });
  expect(result.snapshot).toBeUndefined();
}

async function createLobby(roomId: string, count: number): Promise<TestLobby> {
  const stub = rooms.getByName(roomId);
  const generation = crypto.randomUUID();
  const now = Date.now();
  const hashes = Array.from({ length: count }, (_, index) => sessionHash(index));

  unwrap(
    await stub.createRoom({
      roomId,
      generation,
      provisionalSessionHash: hashes[0],
      now,
    }),
  );

  const players: TestPlayer[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index > 0) {
      unwrap(
        await stub.enterRoom({
          sessionHash: hashes[index],
          now: now + index * 2,
        }),
      );
    }
    const profile = unwrap(
      await stub.setProfile({
        sessionHash: hashes[index],
        generation,
        displayName: `Player ${index + 1}`,
        colorSet: COLORS[index],
        now: now + index * 2 + 1,
      }),
    );
    if (profile.snapshot.me === null) {
      throw new Error('Expected a player profile.');
    }
    players.push({
      name: profile.snapshot.me.displayName,
      playerId: profile.snapshot.me.playerId,
      sessionHash: hashes[index],
    });
  }
  return { generation, players, stub };
}

async function connect(lobby: TestLobby, playerIndex: number): Promise<SocketHarness> {
  const response = await lobby.stub.fetch(
    new Request('https://game-room.internal/socket', {
      headers: {
        Upgrade: 'websocket',
        'X-PID-Session-Hash': lobby.players[playerIndex].sessionHash,
        'X-PID-Room-Generation': lobby.generation,
      },
    }),
  );
  expect(response.status).toBe(101);
  if (response.webSocket === null) {
    throw new Error('Expected a WebSocket response.');
  }
  const harness = new SocketHarness(response.webSocket);
  await harness.initialSnapshot();
  return harness;
}

function simpleCommand(
  commandId: string,
  type: 'start_game' | 'leave_room' | 'request_snapshot' | 'process_due',
): ClientCommand {
  return { protocolVersion: 1, commandId, type, payload: {} };
}

afterEach(async () => {
  await reset();
});

describe('GameRoom multiplayer contract', () => {
  it('enforces start gates, protects private state, and completes a real three-player game', async () => {
    const lobby = await createLobby('ABCDE', 3);
    const host = await connect(lobby, 0);
    const playerTwo = await connect(lobby, 1);

    expectError(
      await playerTwo.command(simpleCommand('non-host-start', 'start_game')),
      'HOST_ONLY',
    );
    expectError(
      await host.command(simpleCommand('start-while-disconnected', 'start_game')),
      'WAITING_FOR_RECONNECT',
    );

    const settingsResult = await playerTwo.command({
      protocolVersion: 1,
      commandId: 'quick-settings',
      type: 'update_settings',
      payload: { settings: QUICK_SETTINGS },
    });
    expect(snapshotFrom(settingsResult).room.settings).toEqual(QUICK_SETTINGS);

    const playerThree = await connect(lobby, 2);
    const startResult = await host.command(simpleCommand('start-connected', 'start_game'));
    const hostStart = snapshotFrom(startResult);
    expect(hostStart.room).toMatchObject({
      phase: 'COLLECTING',
      gameState: 'PLAYING',
      turn: { round: 1, czarPlayerId: lobby.players[0].playerId, playedCards: [] },
    });
    expect(hostStart.me?.hand).toHaveLength(3);
    expect(JSON.stringify(hostStart.room)).not.toContain('answer:');

    const playerTwoStartFrame = await playerTwo.waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING',
    );
    const playerThreeStartFrame = await playerThree.waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING',
    );
    if (
      playerTwoStartFrame.frame.type !== 'snapshot' ||
      playerThreeStartFrame.frame.type !== 'snapshot'
    ) {
      throw new Error('Expected personalized start snapshots.');
    }
    const playerTwoStart = playerTwoStartFrame.frame.snapshot;
    const playerThreeStart = playerThreeStartFrame.frame.snapshot;
    expect(playerTwoStart.me?.hand).toHaveLength(3);
    expect(playerThreeStart.me?.hand).toHaveLength(3);
    for (const card of playerThreeStart.me?.hand ?? []) {
      expect(JSON.stringify(playerTwoStart)).not.toContain(card.id);
    }

    const firstCard = playerTwoStart.me?.hand[0];
    const conflictingCard = playerTwoStart.me?.hand[1];
    if (firstCard === undefined || conflictingCard === undefined) {
      throw new Error('Expected dealt cards.');
    }
    const firstSubmission: ClientCommand = {
      protocolVersion: 1,
      commandId: 'player-two-submit',
      type: 'submit_card',
      roundId: playerTwoStart.room.turn.roundId,
      payload: { cardId: firstCard.id },
    };
    const submitted = await playerTwo.command(firstSubmission);
    const afterFirstSubmission = snapshotFrom(submitted);
    expect(afterFirstSubmission).toMatchObject({
      room: {
        phase: 'COLLECTING',
        turn: { playedCards: [{ id: 'facedown-0', text: '' }] },
      },
      me: { playedThisTurn: true },
    });
    expect(afterFirstSubmission.me?.hand).toHaveLength(2);

    const exactRetry = await playerTwo.command(firstSubmission);
    expect(exactRetry.response.frame).toEqual(submitted.response.frame);
    expect(snapshotFrom(exactRetry)).toEqual(afterFirstSubmission);

    const conflict = await playerTwo.command({
      ...firstSubmission,
      payload: { cardId: conflictingCard.id },
    });
    expectError(conflict, 'IDEMPOTENCY_CONFLICT');
    const afterConflict = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[1].sessionHash,
        generation: lobby.generation,
        now: Date.now(),
      }),
    );
    expect(afterConflict.me?.hand).toHaveLength(2);
    expect(afterConflict.room.turn.playedCards).toHaveLength(1);

    const secondCard = playerThreeStart.me?.hand[0];
    if (secondCard === undefined) {
      throw new Error('Expected a third-player card.');
    }
    const secondSubmission = await playerThree.command({
      protocolVersion: 1,
      commandId: 'player-three-submit',
      type: 'submit_card',
      roundId: playerThreeStart.room.turn.roundId,
      payload: { cardId: secondCard.id },
    });
    const judging = snapshotFrom(secondSubmission);
    expect(judging.room.phase).toBe('JUDGING');
    expect(judging.room.turn.playedCards).toHaveLength(2);
    for (const card of judging.room.turn.playedCards) {
      expect(card.id).not.toContain('answer:');
      expect(card).not.toHaveProperty('playedByPlayerId');
      expect(card).not.toHaveProperty('playedByDisplayName');
    }
    expect(judging.room.turn.winningCard).toBeNull();

    const hostJudgingFrame = await host.waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'JUDGING',
      startResult.snapshot?.index ?? 0,
    );
    if (hostJudgingFrame.frame.type !== 'snapshot') {
      throw new Error('Expected the Czar judging snapshot.');
    }
    const chosenSubmission = hostJudgingFrame.frame.snapshot.room.turn.playedCards[0];
    if (chosenSubmission === undefined) {
      throw new Error('Expected a submission to judge.');
    }
    const reveal = snapshotFrom(
      await host.command({
        protocolVersion: 1,
        commandId: 'choose-round-one',
        type: 'choose_winner',
        roundId: hostJudgingFrame.frame.snapshot.room.turn.roundId,
        payload: { cardId: chosenSubmission.id },
      }),
    );
    expect(reveal.room.phase).toBe('REVEAL');
    expect(reveal.room.turn.winningCard).toMatchObject({ id: chosenSubmission.id });
    expect(reveal.room.turn.winningCard?.playedByPlayerId).toBeTruthy();
    expect(reveal.room.roundHistory).toHaveLength(1);
    const revealDeadline = reveal.room.turn.revealDeadline;
    if (revealDeadline === null) {
      throw new Error('Expected a durable reveal deadline.');
    }

    const finished = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: revealDeadline + 1,
      }),
    );
    expect(finished.room).toMatchObject({
      phase: 'FINISHED',
      gameState: 'FINISHED',
      finalRecord: { outcome: 'won', rounds: 1 },
    });
    expect(finished.room.finalRecord?.winner?.points).toBe(1);
    expect(finished.room.roundHistory).toHaveLength(1);
  });

  it('preserves blank-card and redraw rules configured by a non-host lobby member', async () => {
    const lobby = await createLobby('FGHJK', 3);
    const host = await connect(lobby, 0);
    const playerTwo = await connect(lobby, 1);
    const playerThree = await connect(lobby, 2);
    const blankSettings: GameSettings = {
      ...QUICK_SETTINGS,
      pointsToWin: 2,
      guaranteedBlanks: 1,
      familyMode: true,
    };

    const updated = snapshotFrom(
      await playerTwo.command({
        protocolVersion: 1,
        commandId: 'member-settings',
        type: 'update_settings',
        payload: { settings: blankSettings },
      }),
    );
    expect(updated.room.settings).toEqual(blankSettings);
    const started = snapshotFrom(
      await host.command(simpleCommand('start-blank-game', 'start_game')),
    );
    expect(started.room.phase).toBe('COLLECTING');

    const playerTwoFrame = await playerTwo.waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING' && snapshot.me?.hand.length === 3,
    );
    const playerThreeFrame = await playerThree.waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING' && snapshot.me?.hand.length === 3,
    );
    if (playerTwoFrame.frame.type !== 'snapshot' || playerThreeFrame.frame.type !== 'snapshot') {
      throw new Error('Expected dealt hands.');
    }
    const playerTwoHand = playerTwoFrame.frame.snapshot.me?.hand ?? [];
    const blank = playerTwoHand.find((card) => card.blank === true);
    const stock = playerTwoHand.find((card) => card.blank !== true);
    if (blank === undefined || stock === undefined) {
      throw new Error('Expected one guaranteed blank and stock cards.');
    }

    const redraw = snapshotFrom(
      await playerTwo.command({
        protocolVersion: 1,
        commandId: 'redraw-once',
        type: 'redraw_card',
        roundId: playerTwoFrame.frame.snapshot.room.turn.roundId,
        payload: { cardId: stock.id },
      }),
    );
    expect(redraw.me).toMatchObject({ redrawsUsed: 1 });
    expect(redraw.me?.hand).toHaveLength(3);
    expect(redraw.me?.hand.map((card) => card.id)).not.toContain(stock.id);
    const secondStock = redraw.me?.hand.find((card) => card.blank !== true);
    if (secondStock === undefined) {
      throw new Error('Expected a stock card after redraw.');
    }
    expectError(
      await playerTwo.command({
        protocolVersion: 1,
        commandId: 'redraw-twice',
        type: 'redraw_card',
        roundId: redraw.room.turn.roundId,
        payload: { cardId: secondStock.id },
      }),
      'NO_REDRAWS_LEFT',
    );

    const blankSubmission = snapshotFrom(
      await playerTwo.command({
        protocolVersion: 1,
        commandId: 'submit-blank',
        type: 'submit_blank',
        roundId: redraw.room.turn.roundId,
        payload: { cardId: blank.id, text: 'my odd answer' },
      }),
    );
    expect(blankSubmission.room.turn.playedCards).toEqual([{ id: 'facedown-0', text: '' }]);

    const playerThreeCard = playerThreeFrame.frame.snapshot.me?.hand.find(
      (card) => card.blank !== true,
    );
    if (playerThreeCard === undefined) {
      throw new Error('Expected a stock card for Player 3.');
    }
    const judging = snapshotFrom(
      await playerThree.command({
        protocolVersion: 1,
        commandId: 'submit-stock',
        type: 'submit_card',
        roundId: playerThreeFrame.frame.snapshot.room.turn.roundId,
        payload: { cardId: playerThreeCard.id },
      }),
    );
    const formattedBlank = judging.room.turn.playedCards.find(
      (card) => card.text === 'My odd answer.',
    );
    expect(formattedBlank).toMatchObject({ blank: true });
    if (formattedBlank === undefined) {
      throw new Error('Expected the formatted blank submission.');
    }

    const reveal = snapshotFrom(
      await host.command({
        protocolVersion: 1,
        commandId: 'choose-blank',
        type: 'choose_winner',
        roundId: judging.room.turn.roundId,
        payload: { cardId: formattedBlank.id },
      }),
    );
    expect(reveal.room.turn.winningCard).toMatchObject({
      text: 'My odd answer.',
      blank: true,
      playedByPlayerId: lobby.players[1].playerId,
      playedByDisplayName: lobby.players[1].name,
    });
  });

  it('runs an eight-player game while refusing a ninth active member', async () => {
    const lobby = await createLobby('VWXYZ', 8);
    const ninthSession = sessionHash(8);
    const now = Date.now();
    unwrap(await lobby.stub.enterRoom({ sessionHash: ninthSession, now }));
    expect(
      await lobby.stub.setProfile({
        sessionHash: ninthSession,
        generation: lobby.generation,
        displayName: 'Player 9',
        colorSet: COLORS[8],
        now: now + 1,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });

    const sockets = await Promise.all(lobby.players.map((_, index) => connect(lobby, index)));
    await sockets[1].command({
      protocolVersion: 1,
      commandId: 'eight-player-settings',
      type: 'update_settings',
      payload: { settings: QUICK_SETTINGS },
    });
    const started = snapshotFrom(
      await sockets[0].command(simpleCommand('eight-player-start', 'start_game')),
    );
    expect(started.room.players).toHaveLength(8);

    const dealtSnapshots = await Promise.all(
      sockets.map(async (socket) => {
        const observed = await socket.waitForSnapshot(
          (snapshot) => snapshot.room.phase === 'COLLECTING' && snapshot.me?.hand.length === 3,
        );
        if (observed.frame.type !== 'snapshot') {
          throw new Error('Expected an eight-player dealt hand.');
        }
        return observed.frame.snapshot;
      }),
    );
    let judging: GameSnapshot | null = null;
    for (let index = 1; index < sockets.length; index += 1) {
      const card = dealtSnapshots[index].me?.hand[0];
      if (card === undefined) {
        throw new Error('Expected a card for every non-Czar.');
      }
      judging = snapshotFrom(
        await sockets[index].command({
          protocolVersion: 1,
          commandId: `eight-player-submit-${index}`,
          type: 'submit_card',
          roundId: dealtSnapshots[index].room.turn.roundId,
          payload: { cardId: card.id },
        }),
      );
    }
    expect(judging?.room.phase).toBe('JUDGING');
    expect(judging?.room.turn.playedCards).toHaveLength(7);

    const hostJudging = await sockets[0].waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'JUDGING',
    );
    if (hostJudging.frame.type !== 'snapshot') {
      throw new Error('Expected an eight-player judging snapshot.');
    }
    const choice = hostJudging.frame.snapshot.room.turn.playedCards[0];
    if (choice === undefined) {
      throw new Error('Expected one of seven submissions.');
    }
    const reveal = snapshotFrom(
      await sockets[0].command({
        protocolVersion: 1,
        commandId: 'eight-player-winner',
        type: 'choose_winner',
        roundId: hostJudging.frame.snapshot.room.turn.roundId,
        payload: { cardId: choice.id },
      }),
    );
    if (reveal.room.turn.revealDeadline === null) {
      throw new Error('Expected a reveal deadline.');
    }
    const finished = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: reveal.room.turn.revealDeadline + 1,
      }),
    );
    expect(finished.room).toMatchObject({
      phase: 'FINISHED',
      finalRecord: { outcome: 'won', rounds: 1 },
    });
    expect(finished.room.finalRecord?.leaderboard).toHaveLength(8);
    expect(finished.room.roundHistory[0]?.otherAnswers).toHaveLength(6);
  });

  it('restarts a round immediately after an explicit host departure, then cancels below three', async () => {
    const lobby = await createLobby('KLMNP', 4);
    const sockets = await Promise.all(lobby.players.map((_, index) => connect(lobby, index)));
    await sockets[1].command({
      protocolVersion: 1,
      commandId: 'departure-settings',
      type: 'update_settings',
      payload: { settings: { ...QUICK_SETTINGS, pointsToWin: 10 } },
    });
    await sockets[0].command(simpleCommand('departure-start', 'start_game'));

    const playerTwoStartFrame = await sockets[1].waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING' && snapshot.me?.hand.length === 3,
    );
    if (playerTwoStartFrame.frame.type !== 'snapshot') {
      throw new Error('Expected a collecting snapshot.');
    }
    const beforeDeparture = playerTwoStartFrame.frame.snapshot;
    const submittedCard = beforeDeparture.me?.hand[0];
    if (submittedCard === undefined) {
      throw new Error('Expected a card to submit.');
    }
    await sockets[1].command({
      protocolVersion: 1,
      commandId: 'submit-before-host-leaves',
      type: 'submit_card',
      roundId: beforeDeparture.room.turn.roundId,
      payload: { cardId: submittedCard.id },
    });

    const priorFrameCount = sockets[1].frames.length;
    await sockets[0].command(simpleCommand('host-leaves', 'leave_room'));
    const restartedFrame = await sockets[1].waitForSnapshot(
      (snapshot) =>
        snapshot.room.phase === 'COLLECTING' &&
        snapshot.room.turn.roundId !== beforeDeparture.room.turn.roundId,
      priorFrameCount,
    );
    if (restartedFrame.frame.type !== 'snapshot') {
      throw new Error('Expected a restarted round snapshot.');
    }
    const restarted = restartedFrame.frame.snapshot;
    expect(restarted.room.players).toHaveLength(3);
    expect(restarted.room.turn).toMatchObject({
      czarPlayerId: lobby.players[1].playerId,
      playedCards: [],
      submittedPlayerIds: [],
    });
    expect(restarted.me).toMatchObject({ isPrivileged: true, playedThisTurn: false });
    expect(restarted.me?.hand.map((card) => card.id)).toContain(submittedCard.id);
    expect(restarted.room.roundHistory).toEqual([]);

    const staleHost = await lobby.stub.getSessionSnapshot({
      sessionHash: lobby.players[0].sessionHash,
      generation: lobby.generation,
      now: Date.now(),
    });
    expect(staleHost).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION' } });

    const beforeCancellation = sockets[1].frames.length;
    await sockets[3].command(simpleCommand('fourth-player-leaves', 'leave_room'));
    const cancelledFrame = await sockets[1].waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'CANCELLED',
      beforeCancellation,
    );
    if (cancelledFrame.frame.type !== 'snapshot') {
      throw new Error('Expected a cancelled result.');
    }
    expect(cancelledFrame.frame.snapshot.room).toMatchObject({
      gameState: 'FINISHED',
      finalRecord: { outcome: 'cancelled', winner: null },
    });
    expect(cancelledFrame.frame.snapshot.room.players).toHaveLength(2);
    expect(cancelledFrame.frame.snapshot.room.finalRecord?.leaderboard).toHaveLength(2);
  });

  it('reuses an expired room code without accepting the stale room generation', async () => {
    const stub = rooms.getByName('QRSTU');
    const firstGeneration = crypto.randomUUID();
    const secondGeneration = crypto.randomUUID();
    const firstSession = 'a'.repeat(64);
    const secondSession = 'b'.repeat(64);
    const now = Date.now();

    unwrap(
      await stub.createRoom({
        roomId: 'QRSTU',
        generation: firstGeneration,
        provisionalSessionHash: firstSession,
        now,
      }),
    );
    unwrap(
      await stub.createRoom({
        roomId: 'QRSTU',
        generation: secondGeneration,
        provisionalSessionHash: secondSession,
        now: now + 5 * 60_000 + 1,
      }),
    );

    expect(
      await stub.getSessionSnapshot({
        sessionHash: firstSession,
        generation: firstGeneration,
        now: now + 5 * 60_000 + 2,
      }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION' } });
    expect(
      await stub.getSessionSnapshot({
        sessionHash: secondSession,
        generation: firstGeneration,
        now: now + 5 * 60_000 + 2,
      }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION' } });

    const current = unwrap(
      await stub.enterRoom({
        sessionHash: secondSession,
        existingSessionHash: secondSession,
        generation: secondGeneration,
        now: now + 5 * 60_000 + 2,
      }),
    );
    expect(current).toMatchObject({
      generation: secondGeneration,
      needsProfile: true,
      snapshot: { room: { roomId: 'QRSTU', phase: 'LOBBY' }, me: null },
    });
  });
});
