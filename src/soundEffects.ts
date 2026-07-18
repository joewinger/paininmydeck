import type { GamePhase } from '@/shared/protocol';

export const SOUND_MUTED_PREFERENCE_KEY = 'pimd:sound-muted';
export const SOUND_VOLUME_PREFERENCE_KEY = 'pimd:sound-volume';
export const DEFAULT_SOUND_VOLUME_PERCENT = 40;
export const SOUND_GLOBAL_COOLDOWN_MS = 250;

export type SoundCue = 'confirmation' | 'message' | 'round-winner' | 'game-winner';

interface SoundPreferences {
  muted: boolean;
  volumePercent: number;
}

interface GameSoundState {
  connected: boolean;
  playerId: string | null;
  phase: GamePhase;
  winningCardId: string | null;
  finalWinnerId: string | null;
}

interface HiddenChatCueState {
  messageId: string | undefined;
  previousMessageId: string | undefined;
  messageType: 'chat' | 'system' | undefined;
  senderPlayerId: string | undefined;
  selfPlayerId: string | undefined;
  chatVisible: boolean;
}

interface SoundPlayer {
  play(cue: SoundCue): unknown;
}

interface Tone {
  frequency: number;
  offset: number;
  duration: number;
  strength: number;
  type?: OscillatorType;
}

const CUE_TONES: Record<SoundCue, readonly Tone[]> = {
  confirmation: [
    { frequency: 440, offset: 0, duration: 0.07, strength: 0.08 },
    { frequency: 659, offset: 0.075, duration: 0.09, strength: 0.09 },
  ],
  message: [
    { frequency: 880, offset: 0, duration: 0.055, strength: 0.055 },
    { frequency: 659, offset: 0.06, duration: 0.075, strength: 0.045 },
  ],
  'round-winner': [
    { frequency: 523, offset: 0, duration: 0.14, strength: 0.1, type: 'triangle' },
    { frequency: 659, offset: 0.1, duration: 0.15, strength: 0.11, type: 'triangle' },
    { frequency: 784, offset: 0.2, duration: 0.17, strength: 0.12, type: 'triangle' },
    { frequency: 1047, offset: 0.31, duration: 0.24, strength: 0.1, type: 'triangle' },
  ],
  'game-winner': [
    { frequency: 392, offset: 0, duration: 0.15, strength: 0.1, type: 'triangle' },
    { frequency: 523, offset: 0.11, duration: 0.16, strength: 0.11, type: 'triangle' },
    { frequency: 659, offset: 0.22, duration: 0.18, strength: 0.12, type: 'triangle' },
    { frequency: 784, offset: 0.34, duration: 0.2, strength: 0.13, type: 'triangle' },
    { frequency: 1047, offset: 0.48, duration: 0.32, strength: 0.12, type: 'triangle' },
  ],
};

const CUE_COOLDOWN_MS: Record<SoundCue, number> = {
  confirmation: 500,
  message: 1_500,
  'round-winner': 1_000,
  'game-winner': 1_500,
};

function clampVolumePercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SOUND_VOLUME_PERCENT;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function readSoundPreferences(): SoundPreferences {
  try {
    const storedVolume = localStorage.getItem(SOUND_VOLUME_PREFERENCE_KEY);
    return {
      muted: localStorage.getItem(SOUND_MUTED_PREFERENCE_KEY) === 'true',
      volumePercent:
        storedVolume === null
          ? DEFAULT_SOUND_VOLUME_PERCENT
          : clampVolumePercent(Number(storedVolume)),
    };
  } catch {
    return { muted: false, volumePercent: DEFAULT_SOUND_VOLUME_PERCENT };
  }
}

export function writeSoundMutedPreference(muted: boolean): void {
  try {
    localStorage.setItem(SOUND_MUTED_PREFERENCE_KEY, String(muted));
  } catch {
    // Local preferences are best-effort in hardened/private browser contexts.
  }
}

export function writeSoundVolumePreference(volumePercent: number): number {
  const normalized = clampVolumePercent(volumePercent);
  try {
    localStorage.setItem(SOUND_VOLUME_PREFERENCE_KEY, String(normalized));
  } catch {
    // Local preferences are best-effort in hardened/private browser contexts.
  }
  return normalized;
}

export function shouldPlayHiddenChatCue(state: HiddenChatCueState): boolean {
  return Boolean(
    !state.chatVisible &&
    state.previousMessageId &&
    state.messageId &&
    state.messageId !== state.previousMessageId &&
    state.messageType === 'chat' &&
    state.senderPlayerId &&
    state.selfPlayerId &&
    state.senderPlayerId !== state.selfPlayerId,
  );
}

function audioContextConstructor(): typeof AudioContext | undefined {
  const browser = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  return browser.AudioContext ?? browser.webkitAudioContext;
}

export class SoundEffects implements SoundPlayer {
  private context: AudioContext | null = null;
  private muted = false;
  private volume = DEFAULT_SOUND_VOLUME_PERCENT / 100;
  private busyUntil = 0;
  private lastCueAt = Number.NEGATIVE_INFINITY;
  private readonly lastCueByType = new Map<SoundCue, number>();

  configure(preferences: SoundPreferences): void {
    this.muted = preferences.muted;
    this.volume = clampVolumePercent(preferences.volumePercent) / 100;
  }

  async unlock(): Promise<void> {
    try {
      if (this.context?.state === 'closed') this.context = null;
      if (this.context === null) {
        const AudioContextConstructor = audioContextConstructor();
        if (!AudioContextConstructor) return;
        this.context = new AudioContextConstructor();
        this.busyUntil = 0;
      }
      if (this.context.state !== 'running' && this.context.state !== 'closed') {
        await this.context.resume();
      }
    } catch {
      // Audio support and autoplay policy failures never interrupt game play.
    }
  }

  play(cue: SoundCue): boolean {
    const context = this.context;
    if (this.muted || this.volume <= 0 || context?.state !== 'running') return false;

    const now = Date.now();
    const isCelebration = cue === 'round-winner' || cue === 'game-winner';
    if (!isCelebration && now - this.lastCueAt < SOUND_GLOBAL_COOLDOWN_MS) return false;
    if (now - (this.lastCueByType.get(cue) ?? Number.NEGATIVE_INFINITY) < CUE_COOLDOWN_MS[cue])
      return false;

    try {
      let startAt = context.currentTime + 0.01;
      if (this.busyUntil > context.currentTime) {
        if (!isCelebration) return false;
        startAt = this.busyUntil + 0.03;
      }
      let endAt = startAt;
      for (const tone of CUE_TONES[cue]) {
        const toneStart = startAt + tone.offset;
        const toneEnd = toneStart + tone.duration;
        this.scheduleTone(context, tone, toneStart, toneEnd);
        endAt = Math.max(endAt, toneEnd);
      }
      this.busyUntil = endAt;
      this.lastCueAt = now;
      this.lastCueByType.set(cue, now);
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    const context = this.context;
    this.context = null;
    this.busyUntil = 0;
    this.lastCueAt = Number.NEGATIVE_INFINITY;
    this.lastCueByType.clear();
    if (context === null) return;
    try {
      void context.close().catch(() => undefined);
    } catch {
      // Closing audio is cleanup only.
    }
  }

  private scheduleTone(context: AudioContext, tone: Tone, startAt: number, endAt: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type ?? 'sine';
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.volume * tone.strength),
      startAt + Math.min(0.018, tone.duration / 3),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.01);
  }
}

export class GameSoundCoordinator {
  private previous: GameSoundState | null = null;

  constructor(private readonly sounds: SoundPlayer) {}

  sync(state: GameSoundState): void {
    const previous = this.previous;
    this.previous = state;
    if (
      previous === null ||
      !previous.connected ||
      !state.connected ||
      state.playerId === null ||
      previous.playerId !== state.playerId
    )
      return;

    if (
      state.phase === 'FINISHED' &&
      state.finalWinnerId !== null &&
      (previous.phase !== 'FINISHED' || previous.finalWinnerId !== state.finalWinnerId)
    ) {
      this.sounds.play('game-winner');
      return;
    }

    if (
      state.phase === 'REVEAL' &&
      state.winningCardId !== null &&
      (previous.phase !== 'REVEAL' || previous.winningCardId !== state.winningCardId)
    ) {
      this.sounds.play('round-winner');
      return;
    }
  }
}

export const soundEffects = new SoundEffects();
