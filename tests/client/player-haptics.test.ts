import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CZAR_HAPTIC_PATTERN,
  DEADLINE_HAPTIC_PATTERN,
  HAPTICS_PREFERENCE_KEY,
  HAPTIC_MIN_INTERVAL_MS,
  HAPTIC_WARNING_LEAD_MS,
  PlayerHaptics,
  playerActionOutstanding,
  readHapticsPreference,
  writeHapticsPreference,
} from '@/playerHaptics';

type HapticState = Parameters<PlayerHaptics['sync']>[0];

const NOW = 100_000;
const BASE_STATE: HapticState = {
  enabled: true,
  connected: true,
  roundId: 'round-1',
  phase: 'COLLECTING',
  isCzar: false,
  actionOutstanding: false,
  actionDeadline: null,
  serverNow: NOW,
};

describe('player haptics', () => {
  const vibrate = vi.fn(() => true);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vibrate.mockClear();
    vi.stubGlobal('navigator', { vibrate });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('cues each new Czar round once without replaying repeated snapshots', () => {
    const haptics = new PlayerHaptics();

    haptics.sync(BASE_STATE);
    haptics.sync({ ...BASE_STATE, isCzar: true });
    haptics.sync({ ...BASE_STATE, isCzar: true });

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([...CZAR_HAPTIC_PATTERN]);

    vi.advanceTimersByTime(2_000);
    haptics.sync({ ...BASE_STATE, roundId: 'round-2', isCzar: true, serverNow: NOW + 2_000 });
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('rate-limits distinct cues that arrive too close together', () => {
    const haptics = new PlayerHaptics();

    haptics.sync({ ...BASE_STATE, isCzar: true });
    haptics.sync({ ...BASE_STATE, roundId: 'round-2', isCzar: true });
    expect(vibrate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(HAPTIC_MIN_INTERVAL_MS);
    haptics.sync({ ...BASE_STATE, roundId: 'round-3', isCzar: true });
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('warns shortly before a submission deadline and does not replay the same warning', () => {
    const haptics = new PlayerHaptics();
    const deadline = NOW + 10_000;
    const state = {
      ...BASE_STATE,
      actionOutstanding: true,
      actionDeadline: deadline,
    };

    haptics.sync(state);
    vi.advanceTimersByTime(10_000 - HAPTIC_WARNING_LEAD_MS - 1);
    expect(vibrate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(vibrate).toHaveBeenCalledWith([...DEADLINE_HAPTIC_PATTERN]);

    haptics.sync({ ...state, serverNow: NOW + 8_000 });
    vi.advanceTimersByTime(5_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending warning as soon as the player action is complete', () => {
    const haptics = new PlayerHaptics();
    haptics.sync({
      ...BASE_STATE,
      actionOutstanding: true,
      actionDeadline: NOW + 10_000,
    });

    vi.advanceTimersByTime(4_000);
    haptics.sync({ ...BASE_STATE, serverNow: NOW + 4_000 });
    vi.advanceTimersByTime(10_000);

    expect(vibrate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('warns a Czar whose judging decision is still outstanding', () => {
    const haptics = new PlayerHaptics();
    haptics.sync({
      ...BASE_STATE,
      phase: 'JUDGING',
      isCzar: true,
      actionOutstanding: true,
      actionDeadline: NOW + 7_000,
    });

    expect(vibrate).toHaveBeenNthCalledWith(1, [...CZAR_HAPTIC_PATTERN]);
    vi.advanceTimersByTime(4_000);
    expect(vibrate).toHaveBeenNthCalledWith(2, [...DEADLINE_HAPTIC_PATTERN]);
  });

  it('does nothing when the Vibration API is unavailable', () => {
    vi.stubGlobal('navigator', {});
    const haptics = new PlayerHaptics();

    expect(() => {
      haptics.sync({ ...BASE_STATE, isCzar: true });
      haptics.sync({
        ...BASE_STATE,
        isCzar: true,
        actionOutstanding: true,
        actionDeadline: NOW + HAPTIC_WARNING_LEAD_MS,
      });
      vi.runAllTimers();
    }).not.toThrow();
  });
});

describe('haptics preference', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults on and persists an explicit local opt-out', () => {
    const getItem = vi.fn(() => null as string | null);
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem, setItem });

    expect(readHapticsPreference()).toBe(true);
    writeHapticsPreference(false);
    expect(setItem).toHaveBeenCalledWith(HAPTICS_PREFERENCE_KEY, 'false');

    getItem.mockReturnValue('false');
    expect(readHapticsPreference()).toBe(false);
  });
});

describe('outstanding player actions', () => {
  const base = {
    connected: true,
    hasPlayer: true,
    phase: 'COLLECTING' as const,
    isCzar: false,
    playedThisTurn: false,
    cardActionPending: false,
    hasWinningCard: false,
  };

  it('stops submission warnings on tap, acknowledgement, or disconnect', () => {
    expect(playerActionOutstanding(base)).toBe(true);
    expect(playerActionOutstanding({ ...base, cardActionPending: true })).toBe(false);
    expect(playerActionOutstanding({ ...base, playedThisTurn: true })).toBe(false);
    expect(playerActionOutstanding({ ...base, connected: false })).toBe(false);
  });

  it('only treats the Czar as outstanding during judging', () => {
    expect(playerActionOutstanding({ ...base, phase: 'JUDGING', isCzar: true })).toBe(true);
    expect(playerActionOutstanding({ ...base, phase: 'JUDGING', isCzar: false })).toBe(false);
    expect(
      playerActionOutstanding({
        ...base,
        phase: 'JUDGING',
        isCzar: true,
        hasWinningCard: true,
      }),
    ).toBe(false);
  });
});
