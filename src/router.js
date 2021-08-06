import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '@/views/Home';
import Lobby from '@/views/Lobby';
import Game from '@/views/Game';
import EndGame from '@/views/EndGame';
import GameManager from '@/gameManager';
import store from '@/store';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    beforeEnter: (to, from, next) => {
      // If our state indicates that we are in a room, leave it.
      if(store.state.room.roomId !== null) GameManager.leaveRoom();
      next();
    }
  },
  {
    path: '/join/:roomId',
    name: 'lobby',
    component: Lobby,
    beforeEnter: (to, from, next) => {
      GameManager.joinRoom(to.params.roomId)
      .then(() => next())
      .catch((e) => {
        console.log(e);
        if(e === 'ALREADY_IN_THIS_ROOM') {
          next();
        } else {
          store.dispatch('error', `${e.code}: ${e.message}`);
          next('/');
        }
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
    path: '/endgame',
    name: 'endgame',
    component: EndGame,
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