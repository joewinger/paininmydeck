import type { PlayerSummary, RoundHistoryEntry } from '@/shared/protocol';

export interface RecapScorePoint {
  round: number;
  score: number;
}

export interface RecapPlayer {
  playerId: string;
  displayName: string;
  identity: number;
  color: string;
  dashPattern: string;
  finalPoints: number;
  wonRounds: number[];
  scorePoints: RecapScorePoint[];
}

export interface RecapStreak {
  playerId: string;
  displayName: string;
  length: number;
  firstRound: number;
  lastRound: number;
}

export interface GameRecapModel {
  players: RecapPlayer[];
  rounds: RoundHistoryEntry[];
  roundCount: number;
  maxScore: number;
  leadChanges: number;
  longestStreak: RecapStreak | null;
  finalLeaders: RecapPlayer[];
}

const DASH_PATTERNS = ['', '12 5', '3 4', '16 4 3 4', '2 3', '9 3 2 3', '18 6', '5 3 1 3'] as const;

function playerForRound(
  round: RoundHistoryEntry,
  playersById: ReadonlyMap<string, RecapPlayer>,
  playersByName: ReadonlyMap<string, RecapPlayer>,
): RecapPlayer | undefined {
  if (round.winningPlayerId) {
    const identified = playersById.get(round.winningPlayerId);
    if (identified) return identified;
  }

  return playersByName.get(round.winningPlayerDisplayName.trim().toLocaleLowerCase());
}

export function buildGameRecapModel(
  leaderboard: readonly PlayerSummary[],
  roundHistory: readonly RoundHistoryEntry[],
): GameRecapModel {
  const rounds = [...roundHistory].sort((first, second) => first.round - second.round);
  const players: RecapPlayer[] = leaderboard.map((player, index) => ({
    playerId: player.playerId,
    displayName: player.displayName,
    identity: index + 1,
    color: player.colorSet[0],
    dashPattern: DASH_PATTERNS[index % DASH_PATTERNS.length],
    finalPoints: player.points,
    wonRounds: [],
    scorePoints: [{ round: 0, score: 0 }],
  }));
  const playersById = new Map(players.map((player) => [player.playerId, player]));
  const playersByName = new Map(
    players.map((player) => [player.displayName.trim().toLocaleLowerCase(), player]),
  );
  const scores = new Map(players.map((player) => [player.playerId, 0]));
  let previousSoleLeaderId: string | null = null;
  let leadChanges = 0;
  let streakPlayerId: string | null = null;
  let streakLength = 0;
  let streakFirstRound = 0;
  let longestStreak: RecapStreak | null = null;

  for (const round of rounds) {
    const winner = playerForRound(round, playersById, playersByName);
    if (winner) {
      scores.set(winner.playerId, (scores.get(winner.playerId) ?? 0) + 1);
      winner.wonRounds.push(round.round);

      if (streakPlayerId === winner.playerId) {
        streakLength += 1;
      } else {
        streakPlayerId = winner.playerId;
        streakLength = 1;
        streakFirstRound = round.round;
      }
      if (!longestStreak || streakLength > longestStreak.length) {
        longestStreak = {
          playerId: winner.playerId,
          displayName: winner.displayName,
          length: streakLength,
          firstRound: streakFirstRound,
          lastRound: round.round,
        };
      }
    } else {
      streakPlayerId = null;
      streakLength = 0;
    }

    for (const player of players) {
      player.scorePoints.push({ round: round.round, score: scores.get(player.playerId) ?? 0 });
    }

    const highScore = Math.max(0, ...scores.values());
    const leaders = players.filter((player) => scores.get(player.playerId) === highScore);
    if (highScore > 0 && leaders.length === 1) {
      const soleLeaderId = leaders[0].playerId;
      if (previousSoleLeaderId && previousSoleLeaderId !== soleLeaderId) leadChanges += 1;
      previousSoleLeaderId = soleLeaderId;
    }
  }

  const finalHighScore = Math.max(0, ...players.map((player) => player.finalPoints));

  return {
    players,
    rounds,
    roundCount: rounds.length,
    maxScore: Math.max(
      1,
      finalHighScore,
      ...players.flatMap((player) => player.scorePoints.map((point) => point.score)),
    ),
    leadChanges,
    longestStreak,
    finalLeaders: players.filter((player) => player.finalPoints === finalHighScore),
  };
}

export function buildStepPath(
  points: readonly RecapScorePoint[],
  options: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    firstRound: number;
    lastRound: number;
    maxScore: number;
  },
): string {
  if (points.length === 0) return '';
  const roundRange = Math.max(1, options.lastRound - options.firstRound);
  const scoreRange = Math.max(1, options.maxScore);
  const x = (round: number) =>
    options.left + ((round - options.firstRound) / roundRange) * (options.right - options.left);
  const y = (score: number) =>
    options.bottom - (score / scoreRange) * (options.bottom - options.top);

  const [first, ...rest] = points;
  const commands = [`M ${x(first.round).toFixed(2)} ${y(first.score).toFixed(2)}`];
  for (const point of rest) {
    commands.push(`H ${x(point.round).toFixed(2)}`, `V ${y(point.score).toFixed(2)}`);
  }
  return commands.join(' ');
}

export function scoreTicks(maxScore: number): number[] {
  if (maxScore <= 5) return Array.from({ length: maxScore + 1 }, (_, index) => index);
  const step = Math.ceil(maxScore / 5);
  const ticks = Array.from({ length: Math.floor(maxScore / step) + 1 }, (_, index) => index * step);
  if (ticks.at(-1) !== maxScore) ticks.push(maxScore);
  return ticks;
}
