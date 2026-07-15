const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const LOCAL_TEST_SITE_KEY = '1x00000000000000000000AA';
const CHALLENGE_TIMEOUT_MS = 60_000;

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  execution: 'execute';
  appearance: 'interaction-only';
  callback(token: string): void;
  'error-callback'(code: string): void;
  'expired-callback'(): void;
  'timeout-callback'(): void;
  'before-interactive-callback'(): void;
  'after-interactive-callback'(): void;
}

interface TurnstileApi {
  ready(callback: () => void): void;
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  execute(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    const timeoutId = window.setTimeout(
      () => fail(new Error('Security verification took too long to load.')),
      9_500,
    );
    const fail = (error: Error) => {
      window.clearTimeout(timeoutId);
      script.remove();
      scriptPromise = null;
      reject(error);
    };
    const onReady = () => {
      if (!window.turnstile) {
        fail(new Error('Turnstile loaded without exposing its browser API.'));
        return;
      }
      // The load event already means api.js is ready. Cloudflare rejects
      // turnstile.ready() when the dynamically injected script is async.
      window.clearTimeout(timeoutId);
      resolve(window.turnstile);
    };
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener(
      'error',
      () => fail(new Error('Security verification could not be loaded.')),
      { once: true },
    );
    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });

  return scriptPromise;
}

export async function getTurnstileToken(action: 'create_room' | 'enter_room'): Promise<string> {
  const sitekey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? LOCAL_TEST_SITE_KEY : '');
  if (!sitekey) throw new Error('Security verification is not configured.');
  const turnstile = await loadTurnstile();

  return new Promise<string>((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'turnstile-overlay';
    const container = document.createElement('div');
    container.className = 'turnstile-container';
    overlay.append(container);
    document.body.append(overlay);

    let widgetId = '';
    let settled = false;
    const timeoutId = window.setTimeout(
      () => finish(new Error('Security verification timed out.')),
      CHALLENGE_TIMEOUT_MS,
    );

    const finish = (result: string | Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (widgetId) turnstile.remove(widgetId);
      overlay.remove();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    try {
      widgetId = turnstile.render(container, {
        sitekey,
        action,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token) => finish(token),
        'error-callback': (code) => finish(new Error(`Security verification failed (${code}).`)),
        'expired-callback': () =>
          finish(new Error('Security verification expired. Please try again.')),
        'timeout-callback': () =>
          finish(new Error('Security verification timed out. Please try again.')),
        'before-interactive-callback': () => {
          overlay.classList.add('interactive');
        },
        'after-interactive-callback': () => {
          overlay.classList.remove('interactive');
        },
      });
      if (!settled) turnstile.execute(widgetId);
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Security verification failed.'));
    }
  });
}
