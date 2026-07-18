import type {
  Card,
  ChatMessage,
  PlayerSummary,
  PrivatePlayerState,
  RevealedCard,
  RoundHistoryEntry,
} from '@/shared/protocol';
import type { GameStoryFixture } from '../../../.storybook/gameStore';
import { makeGameSnapshot } from '../../../tests/support/gameSnapshot';

export const ROOM_ID = 'DECKS';

export const players: PlayerSummary[] = [
  {
    playerId: 'alex',
    displayName: 'Alex',
    colorSet: ['#EE796E', '#FAB4AD'],
    points: 3,
    czarOrder: 0,
    connected: true,
  },
  {
    playerId: 'rowan',
    displayName: 'Rowan',
    colorSet: ['#5E87C5', '#8FAFE0'],
    points: 2,
    czarOrder: 1,
    connected: true,
  },
  {
    playerId: 'jules',
    displayName: 'Jules',
    colorSet: ['#65C294', '#96DFBB'],
    points: 1,
    czarOrder: 2,
    connected: true,
  },
  {
    playerId: 'sam',
    displayName: 'Sam',
    colorSet: ['#BE7CB5', '#DEABD7'],
    points: 1,
    czarOrder: 3,
    connected: true,
  },
];

const hand: Card[] = [
  { id: 'answer-1', text: 'An aggressively enthusiastic thumbs-up.' },
  { id: 'answer-2', text: 'Trying to look casual while everything is on fire.' },
  { id: 'blank-1', text: '%BLANK%' },
  { id: 'answer-3', text: 'A group chat that should have stayed private.' },
  { id: 'answer-4', text: 'The exact opposite of a soft launch.' },
  { id: 'answer-5', text: 'One suspiciously damp sock.' },
  { id: 'answer-6', text: 'Putting the team on my back and immediately falling over.' },
];

const playedCards: Card[] = [
  { id: 'played-rowan', text: 'A group chat that should have stayed private.' },
  { id: 'played-jules', text: 'The confidence of a man with the wrong answer.' },
  { id: 'played-sam', text: 'Calling it “networking” so nobody asks questions.', blank: true },
];

const winningCard: RevealedCard = {
  ...playedCards[2],
  applauseCount: 2,
  playedByPlayerId: 'sam',
  playedByDisplayName: 'Sam',
};

const chatMessages: ChatMessage[] = [
  {
    id: 'chat-1',
    timestamp: 1_700_000_000_000,
    type: 'system',
    senderDisplayName: 'Game',
    text: 'Alex started the game.',
  },
  {
    id: 'chat-2',
    timestamp: 1_700_000_001_000,
    type: 'chat',
    senderPlayerId: 'rowan',
    senderDisplayName: 'Rowan',
    text: 'This round was made for me.',
  },
  {
    id: 'chat-3',
    timestamp: 1_700_000_002_000,
    type: 'chat',
    senderPlayerId: 'jules',
    senderDisplayName: 'Jules',
    text: 'That is exactly what worries me.',
  },
];

const roundHistory: RoundHistoryEntry[] = [
  {
    round: 1,
    question: 'The secret ingredient is _.',
    winningAnswer: 'One suspiciously damp sock.',
    winningPlayerId: 'alex',
    winningPlayerDisplayName: 'Alex',
    winningAnswerApplause: 1,
    otherAnswers: [
      {
        text: 'An aggressively enthusiastic thumbs-up.',
        playedByPlayerId: 'rowan',
        playedByDisplayName: 'Rowan',
        applauseCount: 3,
      },
      {
        text: 'A tiny horse with a huge mortgage.',
        playedByPlayerId: 'jules',
        playedByDisplayName: 'Jules',
        applauseCount: 0,
      },
    ],
  },
  {
    round: 2,
    question: 'My five-year plan mostly involves _.',
    winningAnswer: 'The exact opposite of a soft launch.',
    winningPlayerId: 'rowan',
    winningPlayerDisplayName: 'Rowan',
    winningAnswerApplause: 2,
    otherAnswers: [
      {
        text: 'Calling it networking so nobody asks questions.',
        playedByPlayerId: 'sam',
        playedByDisplayName: 'Sam',
        applauseCount: 2,
      },
      {
        text: 'Putting the team on my back and immediately falling over.',
        playedByPlayerId: 'alex',
        playedByDisplayName: 'Alex',
        applauseCount: 1,
      },
    ],
  },
];

const completedGameHistory: RoundHistoryEntry[] = [
  ...roundHistory,
  {
    round: 3,
    question: 'The group chat went silent right after _.',
    winningAnswer: 'Someone replied-all with a personality test.',
    winningPlayerId: 'alex',
    winningPlayerDisplayName: 'Alex',
    winningAnswerApplause: 1,
    otherAnswers: [],
  },
  {
    round: 4,
    question: 'Nothing ruins a first impression like _.',
    winningAnswer: 'Introducing your emotional-support spreadsheet.',
    winningPlayerId: 'jules',
    winningPlayerDisplayName: 'Jules',
    winningAnswerApplause: 2,
    otherAnswers: [],
  },
  {
    round: 5,
    question: 'I knew the party was over when _.',
    winningAnswer: 'Someone brought a spreadsheet.',
    winningPlayerId: 'sam',
    winningPlayerDisplayName: 'Sam',
    winningAnswerApplause: 3,
    otherAnswers: [],
  },
  {
    round: 6,
    question: 'My villain origin story started with _.',
    winningAnswer: 'A calendar invite titled “quick sync.”',
    winningPlayerId: 'rowan',
    winningPlayerDisplayName: 'Rowan',
    winningAnswerApplause: 1,
    otherAnswers: [],
  },
  {
    round: 7,
    question: 'The real treasure was _ all along.',
    winningAnswer: 'The snacks we hid from everybody else.',
    winningPlayerId: 'alex',
    winningPlayerDisplayName: 'Alex',
    winningAnswerApplause: 1,
    otherAnswers: [],
  },
];

const cancelledPlayers = players.map((player, index) => ({
  ...player,
  points: [2, 1, 1, 0][index],
}));

function privatePlayer(
  playerId: string,
  options: Partial<PrivatePlayerState> = {},
): PrivatePlayerState {
  const player = players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new Error(`Unknown story player: ${playerId}`);

  return {
    sessionStatus: 'ACTIVE',
    playerId,
    displayName: player.displayName,
    hand: structuredClone(hand),
    isPrivileged: playerId === 'alex',
    playedThisTurn: false,
    redrawsUsed: 1,
    ownSubmissionId: null,
    applauseBySubmissionId: {},
    ...options,
  };
}

function lobbyFixture(
  playerId: string,
  options: { needsProfile?: boolean; disconnectedPlayerId?: string } = {},
): GameStoryFixture {
  return {
    snapshot: makeGameSnapshot({
      room: {
        roomId: ROOM_ID,
        players: players.map((player) => ({
          ...player,
          connected: player.playerId !== options.disconnectedPlayerId,
        })),
        chatMessages,
      },
      me: options.needsProfile ? null : privatePlayer(playerId),
    }),
    state: {
      needsProfile: options.needsProfile ?? false,
      connectionState: options.needsProfile ? 'idle' : 'open',
    },
  };
}

function playingFixture(
  playerId: string,
  options: {
    phase?: 'COLLECTING' | 'JUDGING' | 'REVEAL';
    playedThisTurn?: boolean;
    cardActionPending?: boolean;
    connectionState?: 'open' | 'reconnecting';
    disconnectedPlayerId?: string;
    applauseBySubmissionId?: Record<string, number>;
  } = {},
): GameStoryFixture {
  const phase = options.phase ?? 'COLLECTING';
  const submittedPlayerIds =
    phase === 'COLLECTING' && !options.playedThisTurn
      ? ['jules', 'sam']
      : ['rowan', 'jules', 'sam'];
  const submittedCards =
    phase === 'COLLECTING' && !options.playedThisTurn ? playedCards.slice(1) : playedCards;

  return {
    snapshot: makeGameSnapshot({
      revision: 12,
      serverTime: 1_700_000_010_000,
      room: {
        roomId: ROOM_ID,
        phase,
        gameState: 'PLAYING',
        players: players.map((player) => ({
          ...player,
          connected: player.playerId !== options.disconnectedPlayerId,
        })),
        turn: {
          roundId: 'round-3',
          round: 3,
          status:
            phase === 'COLLECTING'
              ? 'WAITING_FOR_CARDS'
              : phase === 'JUDGING'
                ? 'WAITING_FOR_CZAR'
                : 'REVEAL',
          questionCard: 'My five-year plan mostly involves _.',
          czarPlayerId: 'alex',
          playedCards:
            phase === 'REVEAL'
              ? submittedCards.map((card, index) => ({ ...card, applauseCount: [3, 1, 2][index] }))
              : submittedCards,
          submittedPlayerIds,
          winningCard: phase === 'REVEAL' ? winningCard : null,
        },
        chatMessages,
        roundHistory,
      },
      me: privatePlayer(playerId, {
        playedThisTurn: options.playedThisTurn ?? phase !== 'COLLECTING',
        ownSubmissionId:
          phase === 'COLLECTING' || playerId === 'alex' ? null : `played-${playerId}`,
        applauseBySubmissionId: options.applauseBySubmissionId ?? {},
      }),
    }),
    state: {
      connectionState: options.connectionState ?? 'open',
      cardActionPending: options.cardActionPending ?? false,
    },
  };
}

export const gameScenarios = {
  profileRequired: lobbyFixture('rowan', { needsProfile: true }),
  lobbyHost: lobbyFixture('alex'),
  lobbyGuest: lobbyFixture('rowan'),
  lobbyDisconnected: lobbyFixture('alex', { disconnectedPlayerId: 'sam' }),
  playerCollecting: playingFixture('rowan'),
  playerActionPending: playingFixture('rowan', { cardActionPending: true }),
  playerSubmitted: playingFixture('rowan', { playedThisTurn: true }),
  playerReconnecting: playingFixture('rowan', { connectionState: 'reconnecting' }),
  playerWaitingForReconnect: playingFixture('rowan', { disconnectedPlayerId: 'sam' }),
  czarCollecting: playingFixture('alex'),
  czarJudging: playingFixture('alex', { phase: 'JUDGING' }),
  playerJudging: playingFixture('rowan', {
    phase: 'JUDGING',
    applauseBySubmissionId: { 'played-jules': 2 },
  }),
  winnerReveal: playingFixture('alex', { phase: 'REVEAL' }),
  gameWon: {
    snapshot: makeGameSnapshot({
      revision: 20,
      room: {
        roomId: ROOM_ID,
        phase: 'FINISHED',
        gameState: 'FINISHED',
        players,
        chatMessages,
        roundHistory: completedGameHistory,
        finalRecord: {
          outcome: 'won',
          winner: players[0],
          rounds: 7,
          leaderboard: players,
          applauseRecap: {
            totalApplause: 11,
            crowdFavorites: [
              { playerId: 'rowan', displayName: 'Rowan', applauseCount: 4 },
              { playerId: 'sam', displayName: 'Sam', applauseCount: 4 },
            ],
            mostApplaudedAnswers: [
              {
                round: 1,
                question: 'The secret ingredient is _.',
                answer: 'An aggressively enthusiastic thumbs-up.',
                playedByPlayerId: 'rowan',
                playedByDisplayName: 'Rowan',
                applauseCount: 3,
              },
              {
                round: 5,
                question: 'I knew the party was over when _.',
                answer: 'Someone brought a spreadsheet.',
                playedByPlayerId: 'sam',
                playedByDisplayName: 'Sam',
                applauseCount: 3,
              },
            ],
          },
        },
      },
      me: privatePlayer('alex'),
    }),
    state: { connectionState: 'open' },
  },
  gameCancelled: {
    snapshot: makeGameSnapshot({
      revision: 20,
      room: {
        roomId: ROOM_ID,
        phase: 'CANCELLED',
        gameState: 'FINISHED',
        players: cancelledPlayers,
        chatMessages,
        roundHistory: completedGameHistory.slice(0, 4),
        finalRecord: {
          outcome: 'cancelled',
          winner: null,
          rounds: 4,
          leaderboard: cancelledPlayers,
          applauseRecap: {
            totalApplause: 0,
            crowdFavorites: [],
            mostApplaudedAnswers: [],
          },
        },
      },
      me: privatePlayer('rowan'),
    }),
    state: { connectionState: 'open' },
  },
} satisfies Record<string, GameStoryFixture>;
