import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SOUND_VOLUME_PERCENT,
  GameSoundCoordinator,
  SOUND_MUTED_PREFERENCE_KEY,
  SOUND_VOLUME_PREFERENCE_KEY,
  SoundEffects,
  readSoundPreferences,
  shouldPlayHiddenChatCue,
  writeSoundMutedPreference,
  writeSoundVolumePreference,
} from '@/soundEffects';

const NOW = 100_000;

class FakeAudioParam {
  readonly changes: Array<{ method: 'set' | 'ramp'; value: number; time: number }> = [];

  setValueAtTime(value: number, time: number): this {
    this.changes.push({ method: 'set', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.changes.push({ method: 'ramp', value, time });
    return this;
  }
}

class FakeOscillator {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeAudioParam();
  readonly connect = vi.fn();
  readonly start = vi.fn();
  readonly stop = vi.fn();
}

class FakeGain {
  readonly gain = new FakeAudioParam();
  readonly connect = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = 'suspended';
  readonly destination = {};
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly resume = vi.fn(async () => {
    this.state = 'running';
  });
  readonly close = vi.fn(async () => {
    this.state = 'closed';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  get currentTime(): number {
    return (Date.now() - NOW) / 1_000;
  }

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

describe('procedural sound effects', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('creates and resumes audio only after an explicit unlock gesture', async () => {
    const sounds = new SoundEffects();

    expect(sounds.play('confirmation')).toBe(false);
    expect(FakeAudioContext.instances).toHaveLength(0);

    await sounds.unlock();
    const context = FakeAudioContext.instances[0];
    expect(context?.resume).toHaveBeenCalledOnce();
    expect(sounds.play('confirmation')).toBe(true);
    expect(context?.oscillators).toHaveLength(2);
    expect(
      context?.oscillators.map((oscillator) => oscillator.frequency.changes[0]?.value),
    ).toEqual([440, 659]);
  });

  it('silently stays disabled when Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const sounds = new SoundEffects();

    await expect(sounds.unlock()).resolves.toBeUndefined();
    expect(sounds.play('message')).toBe(false);
  });

  it('drops overlapping and rapidly repeated cues instead of building a sound queue', async () => {
    const sounds = new SoundEffects();
    await sounds.unlock();
    const context = FakeAudioContext.instances[0];

    expect(sounds.play('message')).toBe(true);
    expect(sounds.play('confirmation')).toBe(false);
    expect(sounds.play('message')).toBe(false);
    expect(context?.oscillators).toHaveLength(2);

    vi.advanceTimersByTime(1_500);
    expect(sounds.play('message')).toBe(true);
    expect(context?.oscillators).toHaveLength(4);
  });

  it('serializes a winner celebration behind a short cue instead of losing it', async () => {
    const sounds = new SoundEffects();
    await sounds.unlock();
    const context = FakeAudioContext.instances[0];

    expect(sounds.play('message')).toBe(true);
    expect(sounds.play('round-winner')).toBe(true);
    expect(context?.oscillators).toHaveLength(6);

    const messageStop = context?.oscillators[1]?.stop.mock.calls[0]?.[0] as number;
    const celebrationStart = context?.oscillators[2]?.start.mock.calls[0]?.[0] as number;
    expect(celebrationStart).toBeGreaterThan(messageStop);
  });

  it('honors mute and volume while swallowing Web Audio failures', async () => {
    const sounds = new SoundEffects();
    await sounds.unlock();
    const context = FakeAudioContext.instances[0];

    sounds.configure({ muted: true, volumePercent: 40 });
    expect(sounds.play('round-winner')).toBe(false);
    sounds.configure({ muted: false, volumePercent: 0 });
    expect(sounds.play('round-winner')).toBe(false);

    sounds.configure({ muted: false, volumePercent: 40 });
    if (context)
      context.createOscillator = () => {
        throw new Error('Audio hardware disappeared.');
      };
    expect(() => sounds.play('round-winner')).not.toThrow();
    expect(sounds.play('round-winner')).toBe(false);
  });

  it('closes its context without making cleanup blocking', async () => {
    const sounds = new SoundEffects();
    await sounds.unlock();
    const context = FakeAudioContext.instances[0];

    sounds.dispose();

    expect(context?.close).toHaveBeenCalledOnce();
    expect(sounds.play('message')).toBe(false);
  });
});

describe('game sound selection', () => {
  const baseState = {
    connected: true,
    playerId: 'rowan',
    phase: 'COLLECTING' as const,
    winningCardId: null,
    finalWinnerId: null,
  };

  it('plays only new winner reveals', () => {
    const play = vi.fn();
    const coordinator = new GameSoundCoordinator({ play });
    coordinator.sync(baseState);
    expect(play).not.toHaveBeenCalled();

    coordinator.sync({
      ...baseState,
      phase: 'REVEAL',
      winningCardId: 'winner-1',
    });
    expect(play).toHaveBeenLastCalledWith('round-winner');

    coordinator.sync({
      ...baseState,
      phase: 'FINISHED',
      finalWinnerId: 'rowan',
    });
    expect(play).toHaveBeenLastCalledWith('game-winner');
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('keeps initial, repeated, disconnected, and Czar snapshots silent', () => {
    const play = vi.fn();
    const coordinator = new GameSoundCoordinator({ play });
    const reveal = { ...baseState, phase: 'REVEAL' as const, winningCardId: 'winner-1' };
    coordinator.sync(reveal);
    coordinator.sync(reveal);
    coordinator.sync({ ...baseState, connected: false, phase: 'FINISHED', finalWinnerId: 'rowan' });
    coordinator.sync({ ...baseState, phase: 'FINISHED', finalWinnerId: 'rowan' });
    expect(play).not.toHaveBeenCalled();
  });
});

describe('hidden chat sound selection', () => {
  const incomingMessage = {
    previousMessageId: 'message-1',
    messageId: 'message-2',
    messageType: 'chat' as const,
    senderPlayerId: 'jules',
    selfPlayerId: 'rowan',
    chatVisible: false,
  };

  it('only cues a new incoming chat message while chat is hidden', () => {
    expect(shouldPlayHiddenChatCue(incomingMessage)).toBe(true);
    expect(shouldPlayHiddenChatCue({ ...incomingMessage, chatVisible: true })).toBe(false);
    expect(shouldPlayHiddenChatCue({ ...incomingMessage, messageType: 'system' })).toBe(false);
    expect(shouldPlayHiddenChatCue({ ...incomingMessage, senderPlayerId: 'rowan' })).toBe(false);
    expect(shouldPlayHiddenChatCue({ ...incomingMessage, selfPlayerId: undefined })).toBe(false);
    expect(shouldPlayHiddenChatCue({ ...incomingMessage, previousMessageId: undefined })).toBe(
      false,
    );
  });
});

describe('sound preferences', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults locally, clamps volume, and persists mute separately', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });

    expect(readSoundPreferences()).toEqual({
      muted: false,
      volumePercent: DEFAULT_SOUND_VOLUME_PERCENT,
    });
    writeSoundMutedPreference(true);
    expect(writeSoundVolumePreference(150)).toBe(100);
    expect(values.get(SOUND_MUTED_PREFERENCE_KEY)).toBe('true');
    expect(values.get(SOUND_VOLUME_PREFERENCE_KEY)).toBe('100');
    expect(readSoundPreferences()).toEqual({ muted: true, volumePercent: 100 });
  });
});
