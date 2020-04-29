import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '@/views/Home';
import Lobby from '@/views/Lobby';
import Game from '@/views/Game';
import EndGame from '@/views/EndGame';
import dbManager from "@/dbManager";

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    beforeEnter: (to, from, next) => {
      if(from.name === 'lobby' || from.name === 'endgame') dbManager.leaveRoom();
      next();
    }
  },
  {
    path: '/join/:roomId',
    name: 'lobby',
    component: Lobby,
    beforeEnter: (to, from, next) => {
      dbManager.joinRoom(to.params.roomId)
      .then(() => next())
      .catch((e) => {
        if(e === 'ROOM_DOES_NOT_EXIST') {
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
      if(from.name !== "lobby") next('/');
      else next();
    }
  },
  {
    path: '/endgame',
    name: 'endgame',
    component: EndGame,
    beforeEnter: (to, from, next) => {
      if(from.name !== "lobby") next('/');
      else next();
    }
  }
];

const router = new VueRouter({
  routes,
  mode: 'history'
});

export default router;