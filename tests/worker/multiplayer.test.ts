/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env, reset, runInDurableObject } from 'cloudflare:test';
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
  actionTimerSeconds: 20,
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
    protocolVersion: 2,
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
  return { protocolVersion: 2, commandId, type, payload: {} };
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
      protocolVersion: 2,
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
      protocolVersion: 2,
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
      protocolVersion: 2,
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
        protocolVersion: 2,
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

  it('authoritatively submits stock cards, picks a random winner, and ignores a stale round job', async () => {
    const lobby = await createLobby('ACDEF', 3);
    const sockets = await Promise.all(lobby.players.map((_, index) => connect(lobby, index)));
    const timedSettings: GameSettings = {
      ...QUICK_SETTINGS,
      actionTimerSeconds: 5,
      pointsToWin: 2,
    };
    await sockets[1].command({
      protocolVersion: 2,
      commandId: 'timed-settings',
      type: 'update_settings',
      payload: { settings: timedSettings },
    });

    const started = snapshotFrom(
      await sockets[0].command(simpleCommand('start-timed-game', 'start_game')),
    );
    const collectingDeadline = started.room.turn.actionDeadline;
    if (collectingDeadline === null) throw new Error('Expected a collecting deadline.');
    expect(collectingDeadline - started.serverTime).toBe(5_000);

    const playerThreeStart = await sockets[2].waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING' && snapshot.me?.hand.length === 3,
    );
    if (playerThreeStart.frame.type !== 'snapshot') throw new Error('Expected a dealt hand.');
    const manualCard = playerThreeStart.frame.snapshot.me?.hand[0];
    if (manualCard === undefined) throw new Error('Expected a manual answer card.');
    await sockets[2].command({
      protocolVersion: 2,
      commandId: 'one-before-timeout',
      type: 'submit_card',
      roundId: started.room.turn.roundId,
      payload: { cardId: manualCard.id },
    });

    const judging = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: collectingDeadline + 1,
      }),
    );
    expect(judging.room).toMatchObject({
      phase: 'JUDGING',
      turn: {
        automaticSubmissionPlayerIds: [lobby.players[1].playerId],
        winnerSelectionSource: null,
      },
    });
    expect(judging.room.turn.playedCards).toHaveLength(2);
    expect(judging.room.chatMessages.at(-1)?.text).toBe(
      `Time! The timer played a card for ${lobby.players[1].name}.`,
    );
    const automaticSubmission = await runInDurableObject(lobby.stub, (_instance, state) =>
      state.storage.sql
        .exec<{ is_blank: number; is_automatic: number; player_id: string }>(
          `SELECT c.is_blank, s.is_automatic, s.player_id
             FROM submissions s
             JOIN card_instances c ON c.instance_id = s.card_instance_id
             WHERE s.is_automatic = 1`,
        )
        .one(),
    );
    expect(automaticSubmission).toEqual({
      is_blank: 0,
      is_automatic: 1,
      player_id: lobby.players[1].playerId,
    });

    const judgingDeadline = judging.room.turn.actionDeadline;
    if (judgingDeadline === null) throw new Error('Expected a judging deadline.');
    expect(judgingDeadline - (collectingDeadline + 1)).toBe(5_000);
    const reveal = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: judgingDeadline + 1,
      }),
    );
    expect(reveal.room).toMatchObject({
      phase: 'REVEAL',
      turn: { actionDeadline: null, winnerSelectionSource: 'TIMEOUT' },
    });
    expect(reveal.room.turn.playedCards.map((card) => card.id)).toContain(
      reveal.room.turn.winningCard?.id,
    );
    expect(reveal.room.chatMessages.at(-1)?.text).toMatch(
      /^Time! The timer picked Player [23]'s card at random\.$/u,
    );

    const revealDeadline = reveal.room.turn.revealDeadline;
    if (revealDeadline === null) throw new Error('Expected a reveal deadline.');
    const nextRound = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: revealDeadline + 1,
      }),
    );
    expect(nextRound.room).toMatchObject({
      phase: 'COLLECTING',
      turn: { round: 2, playedCards: [], automaticSubmissionPlayerIds: [] },
    });
    expect(nextRound.room.turn.roundId).not.toBe(started.room.turn.roundId);

    const staleKey = `${started.room.turn.roundId}:WAITING_FOR_CARDS:${collectingDeadline}`;
    await runInDurableObject(lobby.stub, (_instance, state) => {
      state.storage.sql.exec(
        `INSERT INTO scheduled_jobs(job_type, job_key, due_at)
         VALUES ('action', ?, ?)`,
        staleKey,
        revealDeadline + 1,
      );
    });
    const afterStaleJob = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: revealDeadline + 2,
      }),
    );
    expect(afterStaleJob.room).toMatchObject({
      phase: 'COLLECTING',
      turn: {
        roundId: nextRound.room.turn.roundId,
        playedCards: [],
        actionDeadline: nextRound.room.turn.actionDeadline,
      },
    });
    const staleJobs = await runInDurableObject(
      lobby.stub,
      (_instance, state) =>
        state.storage.sql
          .exec<{ value: number }>(
            `SELECT COUNT(*) AS value FROM scheduled_jobs WHERE job_key = ?`,
            staleKey,
          )
          .one().value,
    );
    expect(staleJobs).toBe(0);
  });

  it('commits a due timeout even when the triggering player command is rejected', async () => {
    const lobby = await createLobby('ACDFE', 3);
    const sockets = await Promise.all(lobby.players.map((_, index) => connect(lobby, index)));
    await sockets[1].command({
      protocolVersion: 2,
      commandId: 'deadline-race-settings',
      type: 'update_settings',
      payload: { settings: { ...QUICK_SETTINGS, actionTimerSeconds: 5, pointsToWin: 2 } },
    });
    const started = snapshotFrom(
      await sockets[0].command(simpleCommand('start-deadline-race', 'start_game')),
    );
    const playerTwoStart = await sockets[1].waitForSnapshot(
      (snapshot) => snapshot.room.phase === 'COLLECTING' && snapshot.me?.hand.length === 3,
    );
    if (playerTwoStart.frame.type !== 'snapshot') throw new Error('Expected a dealt hand.');
    const attemptedCard = playerTwoStart.frame.snapshot.me?.hand[0];
    if (attemptedCard === undefined) throw new Error('Expected an answer card.');

    const pastDeadline = Date.now() - 1;
    await runInDurableObject(lobby.stub, (_instance, state) => {
      state.storage.transactionSync(() => {
        state.storage.sql.exec(
          'UPDATE room_state SET action_deadline = ? WHERE singleton = 1',
          pastDeadline,
        );
        state.storage.sql.exec("DELETE FROM scheduled_jobs WHERE job_type = 'action'");
        state.storage.sql.exec(
          `INSERT INTO scheduled_jobs(job_type, job_key, due_at)
           VALUES ('action', ?, ?)`,
          `${started.room.turn.roundId}:WAITING_FOR_CARDS:${pastDeadline}`,
          pastDeadline,
        );
      });
    });

    const rejected = await sockets[1].command({
      protocolVersion: 2,
      commandId: 'too-late-submission',
      type: 'submit_card',
      roundId: started.room.turn.roundId,
      payload: { cardId: attemptedCard.id },
    });
    expectError(rejected, 'SUBMISSIONS_CLOSED');

    const judging = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[1].sessionHash,
        generation: lobby.generation,
        now: Date.now(),
      }),
    );
    expect(judging.room).toMatchObject({
      phase: 'JUDGING',
      turn: { automaticSubmissionPlayerIds: expect.arrayContaining([lobby.players[1].playerId]) },
    });
    expect(judging.me).toMatchObject({ playedThisTurn: true });
  });

  it('uses a safe joke answer when every outstanding hand contains only blanks', async () => {
    const lobby = await createLobby('ACDFG', 3);
    const sockets = await Promise.all(lobby.players.map((_, index) => connect(lobby, index)));
    await sockets[1].command({
      protocolVersion: 2,
      commandId: 'all-blank-timer-settings',
      type: 'update_settings',
      payload: {
        settings: {
          ...QUICK_SETTINGS,
          actionTimerSeconds: 5,
          pointsToWin: 2,
          allBlanks: true,
        },
      },
    });
    const started = snapshotFrom(
      await sockets[0].command(simpleCommand('start-all-blank-timer', 'start_game')),
    );
    const deadline = started.room.turn.actionDeadline;
    if (deadline === null) throw new Error('Expected a collecting deadline.');

    const judging = unwrap(
      await lobby.stub.getSessionSnapshot({
        sessionHash: lobby.players[0].sessionHash,
        generation: lobby.generation,
        now: deadline + 1,
      }),
    );
    expect(judging.room.phase).toBe('JUDGING');
    expect(judging.room.turn.automaticSubmissionPlayerIds).toHaveLength(2);
    expect(judging.room.turn.automaticSubmissionPlayerIds).toEqual(
      expect.arrayContaining([lobby.players[1].playerId, lobby.players[2].playerId]),
    );
    const safeFallbacks = new Set([
      'Me, apparently not playing a card.',
      'The timer doing my homework.',
      'A brave and extremely last-second guess.',
      'My card arriving fashionably late.',
    ]);
    expect(judging.room.turn.playedCards).toHaveLength(2);
    for (const card of judging.room.turn.playedCards) {
      expect(card.blank).toBe(true);
      expect(safeFallbacks.has(card.text)).toBe(true);
    }
  });

  it('keeps action jobs disabled when the room timer is set to zero', async () => {
    const lobby = await createLobby('ACDFH', 3);
    const sockets = await Promise.all(lobby.players.map((_, index) => connect(lobby, index)));
    await sockets[1].command({
      protocolVersion: 2,
      commandId: 'timer-off-settings',
      type: 'update_settings',
      payload: { settings: { ...QUICK_SETTINGS, actionTimerSeconds: 0 } },
    });
    const started = snapshotFrom(
      await sockets[0].command(simpleCommand('start-without-timer', 'start_game')),
    );
    expect(started.room.turn.actionDeadline).toBeNull();
    const actionJobs = await runInDurableObject(
      lobby.stub,
      (_instance, state) =>
        state.storage.sql
          .exec<{ value: number }>(
            `SELECT COUNT(*) AS value FROM scheduled_jobs WHERE job_type = 'action'`,
          )
          .one().value,
    );
    expect(actionJobs).toBe(0);
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
        protocolVersion: 2,
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
        protocolVersion: 2,
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
        protocolVersion: 2,
        commandId: 'redraw-twice',
        type: 'redraw_card',
        roundId: redraw.room.turn.roundId,
        payload: { cardId: secondStock.id },
      }),
      'NO_REDRAWS_LEFT',
    );

    const blankSubmission = snapshotFrom(
      await playerTwo.command({
        protocolVersion: 2,
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
        protocolVersion: 2,
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
        protocolVersion: 2,
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
      protocolVersion: 2,
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
          protocolVersion: 2,
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
        protocolVersion: 2,
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
      protocolVersion: 2,
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
      protocolVersion: 2,
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
