import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '@/views/Home';
import Lobby from '@/views/Lobby';
import Game from '@/views/Game';
import GameOver from '@/views/GameOver';
import GameManager from '@/gameManager';
import store from '@/store';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    beforeEnter: async (to, from, next) => {
      // If our state indicates that we are in a room, leave it.
      await GameManager.isInitialized;
      if(store.state.room.roomId !== null) GameManager.leaveRoom();
      next();
    }
  },
  {
    path: '/join/:roomId',
    name: 'lobby',
    component: Lobby,
    beforeEnter: async (to, from, next) => {
      await GameManager.isInitialized;
      GameManager.joinRoom(to.params.roomId)
      .then(() => next())
      .catch((e) => {
        if(e === 'ROOM_DOES_NOT_EXIST') {
          store.dispatch('error', { title: 'Invalid Room ID', message: `No room exists with the ID ${to.params.roomId}` })
          next('/');
          return;
        }
        console.error(e);
        store.dispatch('error', { message: `${e.code}: ${e.message}` });
        next('/');
      });
    }
  },
  {
    path: '/game',
    name: 'game',
    component: Game,
    beforeEnter: (to, from, next) => { // https://router.vuejs.org/guide/advanced/navigation-guards.html
      if(store.state.room.roomId !== null && store.state.room.gameState === 'PLAYING') {
        // Verify that our state dictates we should be here
        next();
      } else next('/');
    }
  },
  {
    path: '/gameover',
    name: 'gameover',
    component: GameOver,
    beforeEnter: (to, from, next) => {
      if(store.state.room.roomId !== null && store.state.room.gameState === 'FINISHED') {
        // Verify that our state dictates we should be here
        next();
      } else next('/');
    }
  }
];

const router = new VueRouter({
  routes,
  mode: 'history'
});

export default router;