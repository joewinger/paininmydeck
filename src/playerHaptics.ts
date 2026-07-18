export const HAPTICS_PREFERENCE_KEY = 'pimd:haptics-enabled';
export const HAPTIC_WARNING_LEAD_MS = 3_000;
export const HAPTIC_MIN_INTERVAL_MS = 1_500;

export const CZAR_HAPTIC_PATTERN = [70, 50, 70] as const;
export const DEADLINE_HAPTIC_PATTERN = [120] as const;

interface HapticAttentionState {
  enabled: boolean;
  connected: boolean;
  roundId: string;
  phase: 'LOBBY' | 'COLLECTING' | 'JUDGING' | 'REVEAL' | 'FINISHED' | 'CANCELLED';
  isCzar: boolean;
  actionOutstanding: boolean;
  actionDeadline: number | null;
  serverNow: number;
}

interface PlayerActionState {
  connected: boolean;
  hasPlayer: boolean;
  phase: HapticAttentionState['phase'];
  isCzar: boolean;
  playedThisTurn: boolean;
  cardActionPending: boolean;
  hasWinningCard: boolean;
}

export function readHapticsPreference(): boolean {
  try {
    return localStorage.getItem(HAPTICS_PREFERENCE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function writeHapticsPreference(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_PREFERENCE_KEY, String(enabled));
  } catch {
    // The preference is best-effort in hardened/private browser contexts.
  }
}

export function playerActionOutstanding(state: PlayerActionState): boolean {
  if (!state.connected || !state.hasPlayer || state.cardActionPending) return false;
  if (state.phase === 'COLLECTING') return !state.isCzar && !state.playedThisTurn;
  if (state.phase === 'JUDGING') return state.isCzar && !state.hasWinningCard;
  return false;
}

function vibrate(pattern: readonly number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate([...pattern]);
  } catch {
    // Haptics must never interrupt game play when the browser rejects a cue.
  }
}

export class PlayerHaptics {
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private warningKey: string | null = null;
  private seenCzarRound: string | null = null;
  private lastCueAt = Number.NEGATIVE_INFINITY;
  private currentState: HapticAttentionState | null = null;
  private disposed = false;

  sync(state: HapticAttentionState): void {
    if (this.disposed) return;
    this.currentState = state;

    const czarRound = state.connected && state.isCzar && state.roundId ? state.roundId : null;
    if (czarRound !== null && czarRound !== this.seenCzarRound) {
      this.seenCzarRound = czarRound;
      if (state.enabled) this.cue(CZAR_HAPTIC_PATTERN);
    }

    const nextWarningKey =
      state.enabled &&
      state.connected &&
      state.actionOutstanding &&
      state.actionDeadline !== null &&
      state.roundId
        ? `${state.roundId}:${state.phase}:${state.actionDeadline}`
        : null;

    if (nextWarningKey === this.warningKey) return;
    this.cancelWarning();
    if (nextWarningKey === null || state.actionDeadline === null) return;

    this.warningKey = nextWarningKey;
    const delay = Math.max(0, state.actionDeadline - state.serverNow - HAPTIC_WARNING_LEAD_MS);
    this.warningTimer = setTimeout(() => this.deliverWarning(nextWarningKey), delay);
  }

  dispose(): void {
    this.disposed = true;
    this.currentState = null;
    this.cancelWarning();
  }

  private deliverWarning(key: string): void {
    this.warningTimer = null;
    const state = this.currentState;
    if (
      this.warningKey !== key ||
      state === null ||
      !state.enabled ||
      !state.connected ||
      !state.actionOutstanding
    )
      return;
    this.cue(DEADLINE_HAPTIC_PATTERN);
  }

  private cancelWarning(): void {
    if (this.warningTimer !== null) clearTimeout(this.warningTimer);
    this.warningTimer = null;
    this.warningKey = null;
  }

  private cue(pattern: readonly number[]): void {
    const now = Date.now();
    if (now - this.lastCueAt < HAPTIC_MIN_INTERVAL_MS) return;
    this.lastCueAt = now;
    vibrate(pattern);
  }
}
