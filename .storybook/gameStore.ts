import type { ConnectionState, GameSnapshot } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';
import { useUiStore, type NotificationOptions } from '@/stores/ui';

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

export function seedStoryStores(
  game: GameStore,
  ui: UiStore,
  fixture?: GameStoryFixture,
  uiFixture?: UiStoryFixture,
): void {
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
  game.submitCard = async () => undefined;
  game.submitBlank = async () => undefined;
  game.redrawCard = async () => undefined;
  game.chooseWinner = async () => undefined;
  game.sendChat = async () => undefined;
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
