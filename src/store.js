import Vuex from 'vuex';

const roomData = {
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

const userData = {
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
		roomData,
		userData
	}
});

export default store;