import Vuex from 'vuex';
import Vue from 'vue';

Vue.use(Vuex);

const room = {
	namespaced: true,
	
	state: {
		roomId: null,
		gameState: null,
		users: [],
		currentBlackCard: null,
		currentCzar: null,
		activeCards: [],
		pointsToWin: null,
		turnWinningCard: null,
		winner: null
	},
	mutations: {},
	actions: {},
	getters: {}
}

const user = {
	namespaced: true,

	state: {
		isReady: false,
		username: "",
		hand: {},
		isCzar: false,
		isPrivileged: false,
		playedThisTurn: false,
		points: null
	},
	mutations: {},
	actions: {},
	getters: {}
}

const store = new Vuex.Store({
	modules: {
		room,
		user
	}
});

export default store;