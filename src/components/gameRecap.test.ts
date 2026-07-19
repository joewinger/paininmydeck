import { describe, expect, it } from 'vitest';
import type { PlayerSummary, RoundHistoryEntry } from '@/shared/protocol';
import { buildGameRecapModel, buildStepPath, scoreTicks } from './gameRecap';

const players: PlayerSummary[] = [
  {
    playerId: 'a',
    displayName: 'Alex',
    colorSet: ['#c83f31', '#ffd64a'],
    points: 3,
    czarOrder: 0,
    connected: true,
  },
  {
    playerId: 'b',
    displayName: 'Blair',
    colorSet: ['#72a9dc', '#57cdbd'],
    points: 3,
    czarOrder: 1,
    connected: true,
  },
];

function round(roundNumber: number, winnerId: string, winnerName: string): RoundHistoryEntry {
  return {
    round: roundNumber,
    question: `Question ${roundNumber} _`,
    winningAnswer: `Answer ${roundNumber}`,
    winningPlayerId: winnerId,
    winningPlayerDisplayName: winnerName,
    winningAnswerApplause: 0,
    otherAnswers: [],
  };
}

describe('game recap model', () => {
  it('builds cumulative scores, preserves final ties, and identifies lead changes and streaks', () => {
    const model = buildGameRecapModel(players, [
      round(4, 'b', 'Blair'),
      round(1, 'a', 'Alex'),
      round(2, 'a', 'Alex'),
      round(3, 'b', 'Blair'),
      round(5, 'b', 'Blair'),
      round(6, 'a', 'Alex'),
    ]);

    expect(model.rounds.map((entry) => entry.round)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(model.players[0].scorePoints.map((point) => point.score)).toEqual([0, 1, 2, 2, 2, 2, 3]);
    expect(model.players[1].scorePoints.map((point) => point.score)).toEqual([0, 0, 0, 1, 2, 3, 3]);
    expect(model.finalLeaders.map((player) => player.displayName)).toEqual(['Alex', 'Blair']);
    expect(model.leadChanges).toBe(1);
    expect(model.longestStreak).toMatchObject({
      displayName: 'Blair',
      length: 3,
      firstRound: 3,
      lastRound: 5,
    });
  });

  it('supports eight players and name fallback without reusing color as identity', () => {
    const crowded = Array.from({ length: 8 }, (_, index): PlayerSummary => ({
      playerId: `player-${index + 1}`,
      displayName: `Player ${index + 1}`,
      colorSet: ['#c83f31', '#ffd64a'],
      points: index === 7 ? 1 : 0,
      czarOrder: index,
      connected: true,
    }));
    const history = [round(1, '', 'Player 8')];
    delete history[0].winningPlayerId;

    const model = buildGameRecapModel(crowded, history);

    expect(model.players).toHaveLength(8);
    expect(new Set(model.players.map((player) => player.identity)).size).toBe(8);
    expect(new Set(model.players.map((player) => player.dashPattern)).size).toBe(8);
    expect(model.players[7].scorePoints.at(-1)?.score).toBe(1);
  });

  it('creates a horizontal-then-vertical step path and bounded axis ticks', () => {
    expect(
      buildStepPath(
        [
          { round: 0, score: 0 },
          { round: 1, score: 1 },
          { round: 2, score: 1 },
        ],
        { left: 10, right: 110, top: 10, bottom: 110, firstRound: 0, lastRound: 2, maxScore: 2 },
      ),
    ).toBe('M 10.00 110.00 H 60.00 V 60.00 H 110.00 V 60.00');
    expect(scoreTicks(3)).toEqual([0, 1, 2, 3]);
    expect(scoreTicks(13)).toEqual([0, 3, 6, 9, 12, 13]);
  });
});
