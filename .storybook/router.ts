import { createMemoryHistory, createRouter } from 'vue-router';

import Game from '@/views/Game.vue';
import GameOver from '@/views/GameOver.vue';
import Home from '@/views/Home.vue';
import Lobby from '@/views/Lobby/index.vue';

/**
 * A guard-free router for stories. The production guards enter rooms and open
 * sockets; stories only need route identity and the real screen components.
 */
export const storyRouter = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/join/:roomId', name: 'lobby', component: Lobby },
    { path: '/join/:roomId/game', name: 'game', component: Game },
    { path: '/join/:roomId/results', name: 'gameover', component: GameOver },
  ],
});
