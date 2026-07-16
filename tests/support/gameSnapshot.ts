import type { GameSettings, GameSnapshot, RoomState, TurnState } from '@/shared/protocol';

type RoomOverrides = Omit<Partial<RoomState>, 'settings' | 'turn'> & {
  settings?: Partial<GameSettings>;
  turn?: Partial<TurnState>;
};

export type GameSnapshotOverrides = Omit<Partial<GameSnapshot>, 'room'> & {
  room?: RoomOverrides;
};

/**
 * A deterministic protocol fixture with explicit nested overrides. It does not
 * infer phase invariants, which keeps malformed-state tests possible and makes
 * every visual scenario say exactly which server state it represents.
 */
export function makeGameSnapshot(overrides: GameSnapshotOverrides = {}): GameSnapshot {
  const { room: roomOverrides = {}, ...snapshotOverrides } = overrides;
  const { settings: settingsOverrides, turn: turnOverrides, ...room } = roomOverrides;

  return {
    protocolVersion: 1,
    revision: 1,
    serverTime: 1_000,
    me: null,
    ...snapshotOverrides,
    room: {
      roomId: 'ABCDE',
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
        ...settingsOverrides,
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
        ...turnOverrides,
      },
      chatMessages: [],
      roundHistory: [],
      finalRecord: null,
      ...room,
    },
  };
}
