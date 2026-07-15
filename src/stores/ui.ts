import { defineStore } from 'pinia';
import { GameApiError } from '@/api/gameClient';

export interface NotificationOptions {
  title?: string;
  message?: string;
  type?: 'ERROR' | 'INFO';
  durationMs?: number;
}

let errorTimer: number | undefined;
let interstitialTimer: number | undefined;

export const useUiStore = defineStore('ui', {
  state: () => ({
    error: {} as { title?: string; message?: string; type?: 'ERROR' | 'INFO' },
    interstitial: {} as { title?: string; subtitle?: string },
  }),
  actions: {
    notify(options: NotificationOptions = {}) {
      if (errorTimer !== undefined) window.clearTimeout(errorTimer);
      if (!options.message) {
        this.error = {};
        return;
      }

      this.error = {
        title: options.title ?? 'Error',
        message: options.message,
        type: options.type ?? 'ERROR',
      };
      errorTimer = window.setTimeout(() => {
        this.error = {};
        errorTimer = undefined;
      }, options.durationMs ?? 5_000);
    },

    notifyException(error: unknown, fallback = 'Something went wrong. Please try again.') {
      if (error instanceof GameApiError) {
        this.notify({ title: error.title, message: error.message });
        return;
      }
      this.notify({ message: error instanceof Error ? error.message : fallback });
    },

    closeNotification() {
      this.notify();
    },

    showInterstitial(title: string, subtitle = '') {
      if (interstitialTimer !== undefined) window.clearTimeout(interstitialTimer);
      this.interstitial = { title, subtitle };
      interstitialTimer = window.setTimeout(() => {
        this.interstitial = {};
        interstitialTimer = undefined;
      }, 4_000);
    },
  },
});
