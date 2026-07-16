import { createPinia } from 'pinia';
import { setup, type Preview } from '@storybook/vue3-vite';

import IonIcon from '@/components/IonIcon';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';
import 'normalize.css';
import '@/assets/variables.css';
import '@/assets/global.css';
import './preview.css';

import {
  seedStoryStores,
  stubStoryTransport,
  stubStoryUi,
  type GameStoryFixture,
  type UiStoryFixture,
} from './gameStore';
import { storyRouter } from './router';

const storyPinia = createPinia();
const game = useGameStore(storyPinia);
const ui = useUiStore(storyPinia);

stubStoryTransport(game);
stubStoryUi(ui);
// Story navigation is not an attempt to leave a real in-progress room.
window.confirm = () => true;

setup((app) => {
  app.component('ion-icon', IonIcon);
  app.use(storyPinia);
  app.use(storyRouter);
});

function clearRememberedUsername(): void {
  try {
    sessionStorage.removeItem('username');
  } catch {
    // Storage can be disabled in hardened browser contexts.
  }
  try {
    localStorage.removeItem('username');
  } catch {
    // Storage can be disabled in hardened browser contexts.
  }
}

const preview = {
  loaders: [
    async ({ parameters }) => {
      clearRememberedUsername();
      seedStoryStores(
        game,
        ui,
        parameters.game as GameStoryFixture | undefined,
        parameters.ui as UiStoryFixture | undefined,
      );
      await storyRouter.replace((parameters.route as string | undefined) ?? '/');
      return {};
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    a11y: { test: 'todo' },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile (390 × 844)',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        desktop: {
          name: 'Desktop (1440 × 900)',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },
    options: {
      storySort: {
        order: ['Screens', 'Components'],
      },
    },
  },
} satisfies Preview;

export default preview;
