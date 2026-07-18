import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createScreenWakeLockController,
  shouldKeepScreenAwake,
  type ScreenWakeLockSentinel,
} from '@/composables/useScreenWakeLock';

class FakeVisibility {
  visibilityState: DocumentVisibilityState = 'visible';
  private readonly listeners = new Set<() => void>();

  addEventListener(type: 'visibilitychange', listener: () => void): void {
    if (type === 'visibilitychange') this.listeners.add(listener);
  }

  removeEventListener(type: 'visibilitychange', listener: () => void): void {
    if (type === 'visibilitychange') this.listeners.delete(listener);
  }

  setVisibility(state: DocumentVisibilityState): void {
    this.visibilityState = state;
    for (const listener of this.listeners) listener();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

class FakeSentinel extends EventTarget implements ScreenWakeLockSentinel {
  released = false;
  readonly release = vi.fn(async () => {
    if (this.released) return;
    this.released = true;
    this.dispatchEvent(new Event('release'));
  });
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('screen wake lock controller', () => {
  it('only stays awake for an open connection in an active game', () => {
    expect(shouldKeepScreenAwake('ABCDE', 'open', 'PLAYING')).toBe(true);
    expect(shouldKeepScreenAwake('ABCDE', 'open', 'LOBBY')).toBe(false);
    expect(shouldKeepScreenAwake('ABCDE', 'reconnecting', 'PLAYING')).toBe(false);
    expect(shouldKeepScreenAwake('ABCDE', 'open', 'FINISHED')).toBe(false);
    expect(shouldKeepScreenAwake(null, 'open', 'PLAYING')).toBe(false);
  });

  it('acquires while active and releases when the game is no longer active', async () => {
    const visibility = new FakeVisibility();
    const lock = new FakeSentinel();
    const request = vi.fn().mockResolvedValue(lock);
    const controller = createScreenWakeLockController({ request }, visibility);

    controller.setActive(true);
    await flushPromises();

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith('screen');

    controller.setActive(false);

    expect(lock.release).toHaveBeenCalledOnce();
  });

  it('releases when hidden and reacquires when the page becomes visible', async () => {
    const visibility = new FakeVisibility();
    const firstLock = new FakeSentinel();
    const secondLock = new FakeSentinel();
    const request = vi.fn().mockResolvedValueOnce(firstLock).mockResolvedValueOnce(secondLock);
    const controller = createScreenWakeLockController({ request }, visibility);

    controller.setActive(true);
    await flushPromises();
    visibility.setVisibility('hidden');

    expect(firstLock.release).toHaveBeenCalledOnce();

    visibility.setVisibility('visible');
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(2);
    expect(secondLock.release).not.toHaveBeenCalled();
  });

  it('does nothing when the Screen Wake Lock API is unavailable', () => {
    const visibility = new FakeVisibility();
    const controller = createScreenWakeLockController(undefined, visibility);

    expect(() => {
      controller.setActive(true);
      visibility.setVisibility('hidden');
      visibility.setVisibility('visible');
      controller.dispose();
    }).not.toThrow();
    expect(visibility.listenerCount).toBe(0);
  });

  it('swallows request failures and can retry after visibility returns', async () => {
    const visibility = new FakeVisibility();
    const lock = new FakeSentinel();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce(lock);
    const controller = createScreenWakeLockController({ request }, visibility);

    controller.setActive(true);
    await flushPromises();
    visibility.setVisibility('hidden');
    visibility.setVisibility('visible');
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(2);
    expect(lock.release).not.toHaveBeenCalled();
  });

  it('releases a pending lock that resolves after the game finishes', async () => {
    const visibility = new FakeVisibility();
    const lock = new FakeSentinel();
    const pendingRequest = deferred<ScreenWakeLockSentinel>();
    const request = vi.fn().mockReturnValue(pendingRequest.promise);
    const controller = createScreenWakeLockController({ request }, visibility);

    controller.setActive(true);
    controller.setActive(false);
    pendingRequest.resolve(lock);
    await flushPromises();

    expect(lock.release).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();
  });

  it('replaces a stale pending lock when the game becomes active again', async () => {
    const visibility = new FakeVisibility();
    const staleLock = new FakeSentinel();
    const currentLock = new FakeSentinel();
    const pendingRequest = deferred<ScreenWakeLockSentinel>();
    const request = vi
      .fn()
      .mockReturnValueOnce(pendingRequest.promise)
      .mockResolvedValueOnce(currentLock);
    const controller = createScreenWakeLockController({ request }, visibility);

    controller.setActive(true);
    controller.setActive(false);
    controller.setActive(true);
    pendingRequest.resolve(staleLock);
    await flushPromises();
    await flushPromises();

    expect(staleLock.release).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(currentLock.release).not.toHaveBeenCalled();

    controller.dispose();
    expect(currentLock.release).toHaveBeenCalledOnce();
  });
});
