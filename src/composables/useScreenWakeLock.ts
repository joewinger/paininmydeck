import { onBeforeUnmount, watch, type Ref } from 'vue';
import type { ConnectionState, GameState } from '@/shared/protocol';

export function shouldKeepScreenAwake(
  roomId: string | null,
  connectionState: ConnectionState,
  gameState: GameState,
): boolean {
  return roomId !== null && connectionState === 'open' && gameState === 'PLAYING';
}

export interface ScreenWakeLockSentinel extends EventTarget {
  readonly released: boolean;
  release(): Promise<void>;
}

interface ScreenWakeLockProvider {
  request(type: 'screen'): Promise<ScreenWakeLockSentinel>;
}

interface VisibilitySource {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

interface ScreenWakeLockController {
  setActive(active: boolean): void;
  dispose(): void;
}

const NOOP_CONTROLLER: ScreenWakeLockController = {
  setActive: () => undefined,
  dispose: () => undefined,
};

export function createScreenWakeLockController(
  wakeLock: ScreenWakeLockProvider | undefined,
  visibility: VisibilitySource,
): ScreenWakeLockController {
  if (!wakeLock) return NOOP_CONTROLLER;

  let active = false;
  let disposed = false;
  let generation = 0;
  let pendingGeneration: number | null = null;
  let sentinel: ScreenWakeLockSentinel | null = null;

  const canAcquire = () => active && !disposed && visibility.visibilityState === 'visible';

  const release = (lock: ScreenWakeLockSentinel | null) => {
    if (!lock || lock.released) return;
    void lock.release().catch(() => undefined);
  };

  const releaseCurrent = () => {
    generation += 1;
    const current = sentinel;
    sentinel = null;
    release(current);
  };

  const acquire = () => {
    if (!canAcquire() || sentinel || pendingGeneration !== null) return;

    const requestGeneration = ++generation;
    pendingGeneration = requestGeneration;

    let request: Promise<ScreenWakeLockSentinel>;
    try {
      request = wakeLock.request('screen');
    } catch {
      pendingGeneration = null;
      return;
    }

    void request
      .then((lock) => {
        if (requestGeneration !== generation || !canAcquire()) {
          release(lock);
          return;
        }

        sentinel = lock;
        lock.addEventListener(
          'release',
          () => {
            if (sentinel === lock) sentinel = null;
          },
          { once: true },
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (pendingGeneration === requestGeneration) pendingGeneration = null;

        // A pending request cannot be cancelled. If state changed while it was in flight,
        // release its stale result above before requesting a lock for the current state.
        if (requestGeneration !== generation && canAcquire() && !sentinel) acquire();
      });
  };

  const handleVisibilityChange = () => {
    if (visibility.visibilityState === 'visible') acquire();
    else releaseCurrent();
  };

  visibility.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    setActive(nextActive) {
      if (disposed) return;
      active = nextActive;
      if (canAcquire()) acquire();
      else releaseCurrent();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      visibility.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseCurrent();
    },
  };
}

export function useScreenWakeLock(active: Readonly<Ref<boolean>>): void {
  const wakeLockNavigator = navigator as Navigator & { wakeLock?: ScreenWakeLockProvider };
  const controller = createScreenWakeLockController(wakeLockNavigator.wakeLock, document);
  const stopWatching = watch(active, (isActive) => controller.setActive(isActive), {
    immediate: true,
  });

  onBeforeUnmount(() => {
    stopWatching();
    controller.dispose();
  });
}
