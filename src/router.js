import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from './views/Home'
import Lobby from './views/Lobby'
import Game from './views/Game'
import EndGame from './views/EndGame'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/lobby',
    name: 'Lobby',
    component: Lobby
  },
  {
    path: '/game',
    name: 'Game',
    component: Game
  },
  {
    path: '/endgame',
    name: 'EndGame',
    component: EndGame
  }
]

const router = new VueRouter({
  routes,
  mode: 'abstract'
});

export default router