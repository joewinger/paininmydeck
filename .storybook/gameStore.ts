import type { ConnectionState, GameSnapshot } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';
import { useUiStore, type NotificationOptions } from '@/stores/ui';
import { fn } from 'storybook/test';

type GameStore = ReturnType<typeof useGameStore>;
type UiStore = ReturnType<typeof useUiStore>;

export interface GameStoryFixture {
  snapshot: GameSnapshot;
  state?: Partial<{
    needsProfile: boolean;
    connectionState: ConnectionState;
    cardActionPending: boolean;
    beingKicked: boolean;
    terminalExit: 'INVALID_ROOM' | null;
  }>;
}

export interface UiStoryFixture {
  error?: UiStore['error'];
  interstitial?: UiStore['interstitial'];
}

/** Observable transport doubles used by interaction stories. */
export const storyActions = {
  submitCard: fn(async (cardId: string): Promise<void> => void cardId),
  submitBlank: fn(async (cardId: string, text: string): Promise<void> => void [cardId, text]),
  redrawCard: fn(async (cardId: string): Promise<void> => void cardId),
  chooseWinner: fn(async (cardId: string): Promise<void> => void cardId),
  setApplause: fn(async (cardId: string, count: number): Promise<void> => void [cardId, count]),
  sendChat: fn(async (text: string): Promise<void> => void text),
};

function resetStoryActions(): void {
  Object.values(storyActions).forEach((action) => action.mockClear());
}

export function seedStoryStores(
  game: GameStore,
  ui: UiStore,
  fixture?: GameStoryFixture,
  uiFixture?: UiStoryFixture,
): void {
  resetStoryActions();
  game.$reset();
  ui.$reset();

  if (fixture) {
    const snapshot = structuredClone(fixture.snapshot);
    game.$patch({
      room: snapshot.room,
      self: snapshot.me,
      revision: snapshot.revision,
      needsProfile: false,
      connectionState: 'open',
      cardActionPending: false,
      beingKicked: false,
      terminalExit: null,
      ...fixture.state,
    });
  }

  if (uiFixture?.error) ui.error = structuredClone(uiFixture.error);
  if (uiFixture?.interstitial) ui.interstitial = structuredClone(uiFixture.interstitial);
}

/** Replace network-backed actions with local, deterministic story doubles. */
export function stubStoryTransport(game: GameStore): void {
  game.createRoom = async () => game.roomId ?? 'ABCDE';
  game.enterRoom = async () => undefined;
  game.setProfile = async () => undefined;
  game.connectSocket = () => undefined;
  game.leaveRoom = async () => undefined;
  game.updateSettings = async () => undefined;
  game.startGame = async () => undefined;
  game.submitCard = storyActions.submitCard;
  game.submitBlank = storyActions.submitBlank;
  game.redrawCard = storyActions.redrawCard;
  game.chooseWinner = storyActions.chooseWinner;
  game.setApplause = storyActions.setApplause;
  game.sendChat = storyActions.sendChat;
  game.kickPlayer = async () => undefined;
  game.send = async () => undefined;
}

/** Keep notifications deterministic instead of starting the production timers. */
export function stubStoryUi(ui: UiStore): void {
  ui.notify = (options: NotificationOptions = {}) => {
    if (!options.message) {
      ui.error = {};
      return;
    }
    ui.error = {
      title: options.title ?? 'Error',
      message: options.message,
      type: options.type ?? 'ERROR',
    };
  };
  ui.notifyException = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
    ui.notify({ message: error instanceof Error ? error.message : fallback });
  };
  ui.closeNotification = () => {
    ui.error = {};
  };
  ui.showInterstitial = (title: string, subtitle = '') => {
    ui.interstitial = { title, subtitle };
  };
}
