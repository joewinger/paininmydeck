import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Lobby from '@/views/Lobby/index.vue';
import Game from '@/views/Game.vue';
import GameOver from '@/views/GameOver.vue';
import Tv from '@/views/Tv.vue';
import { pinia } from '@/stores';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';
import { GameApiError } from '@/api/gameClient';
import { isRoomId, normalizeRoomId } from '@/shared/protocol';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      beforeEnter: async () => {
        const game = useGameStore(pinia);
        if (game.roomId !== null) await game.leaveRoom();
      },
    },
    {
      path: '/tv',
      name: 'tv-create',
      component: Tv,
      meta: { layout: 'tv' },
      beforeEnter: async () => {
        const game = useGameStore(pinia);
        try {
          const roomId = await game.createRoom();
          return { name: 'tv', params: { roomId }, replace: true };
        } catch {
          return { name: 'home' };
        }
      },
    },
    {
      path: '/tv/:roomId',
      name: 'tv',
      component: Tv,
      meta: { layout: 'tv' },
      beforeEnter: async (to) => {
        const game = useGameStore(pinia);
        const ui = useUiStore(pinia);
        const roomId = normalizeRoomId(
          Array.isArray(to.params.roomId) ? to.params.roomId[0] : to.params.roomId,
        );
        if (!isRoomId(roomId)) {
          ui.notify({
            title: 'Invalid Room ID',
            message: 'Room IDs contain exactly five letters (without I or O).',
          });
          return { name: 'home' };
        }
        if (to.params.roomId !== roomId) {
          return { name: 'tv', params: { roomId }, replace: true };
        }
        try {
          if (game.roomId !== roomId || !game.displayMode) await game.watchRoom(roomId);
          return true;
        } catch (error) {
          game.resetRoom();
          ui.notifyException(error, 'This room is no longer available.');
          return { name: 'home' };
        }
      },
    },
    {
      path: '/join/:roomId',
      name: 'lobby',
      component: Lobby,
      beforeEnter: async (to) => {
        const game = useGameStore(pinia);
        const ui = useUiStore(pinia);
        const roomId = normalizeRoomId(
          Array.isArray(to.params.roomId) ? to.params.roomId[0] : to.params.roomId,
        );

        if (!isRoomId(roomId)) {
          ui.notify({
            title: 'Invalid Room ID',
            message: 'Room IDs contain exactly five letters (without I or O).',
          });
          return { name: 'home' };
        }
        if (to.params.roomId !== roomId)
          return { name: 'lobby', params: { roomId }, replace: true };

        try {
          await game.enterRoom(roomId);
          if (['COLLECTING', 'JUDGING', 'REVEAL'].includes(game.phase)) {
            return { name: 'game', params: { roomId } };
          }
          if (['FINISHED', 'CANCELLED'].includes(game.phase)) {
            return { name: 'gameover', params: { roomId } };
          }
        } catch (error) {
          game.resetRoom();
          if (
            error instanceof GameApiError &&
            ['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'INVALID_ROOM'].includes(error.code)
          ) {
            ui.notify({
              title: 'Invalid Room ID',
              message: `No room exists with the ID ${roomId}.`,
            });
          } else ui.notifyException(error, `No room exists with the ID ${roomId}.`);
          return { name: 'home' };
        }
      },
    },
    {
      path: '/join/:roomId/game',
      name: 'game',
      component: Game,
      beforeEnter: async (to) => {
        const game = useGameStore(pinia);
        const ui = useUiStore(pinia);
        const roomId = normalizeRoomId(
          Array.isArray(to.params.roomId) ? to.params.roomId[0] : to.params.roomId,
        );
        if (!isRoomId(roomId)) return { name: 'home' };
        if (to.params.roomId !== roomId) {
          return { name: 'game', params: { roomId }, replace: true };
        }
        try {
          if (game.roomId !== roomId || game.displayMode) await game.enterRoom(roomId);
        } catch (error) {
          game.resetRoom();
          ui.notifyException(error, 'This room is no longer available.');
          return { name: 'home' };
        }
        if (['COLLECTING', 'JUDGING', 'REVEAL'].includes(game.phase)) return true;
        if (['FINISHED', 'CANCELLED'].includes(game.phase)) {
          return { name: 'gameover', params: { roomId } };
        }
        return { name: 'lobby', params: { roomId } };
      },
    },
    {
      path: '/join/:roomId/results',
      name: 'gameover',
      component: GameOver,
      beforeEnter: async (to) => {
        const game = useGameStore(pinia);
        const ui = useUiStore(pinia);
        const roomId = normalizeRoomId(
          Array.isArray(to.params.roomId) ? to.params.roomId[0] : to.params.roomId,
        );
        if (!isRoomId(roomId)) return { name: 'home' };
        if (to.params.roomId !== roomId) {
          return { name: 'gameover', params: { roomId }, replace: true };
        }
        try {
          if (game.roomId !== roomId || game.displayMode) await game.enterRoom(roomId);
        } catch (error) {
          game.resetRoom();
          ui.notifyException(error, 'This room is no longer available.');
          return { name: 'home' };
        }
        if (['FINISHED', 'CANCELLED'].includes(game.phase)) return true;
        if (['COLLECTING', 'JUDGING', 'REVEAL'].includes(game.phase)) {
          return { name: 'game', params: { roomId } };
        }
        return { name: 'lobby', params: { roomId } };
      },
    },
  ],
});

export default router;
