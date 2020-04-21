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
		currentTurnStatus: null,
		activeCards: [],
		pointsToWin: null,
		turnWinningCard: null,
		winner: null
	},
	mutations: {
		setRoomId(state, roomId) {
			state.roomId = roomId;
		},
		setPointsToWin(state, numPointsToWin) {
			state.pointsToWin = numPointsToWin;
		},
		updateUsers(state, users) {
			state.users = users;
		},
		updateGameState(state, newGameState) {
			state.gameState = newGameState;
		},
		updateBlackCard(state, newBlackCard) {
			state.currentBlackCard = newBlackCard;
		},
		updateCzar(state, newCzar) {
			state.currentCzar = newCzar;
		},
		updateActiveCards(state, newActiveCards) {
			state.activeCards = newActiveCards;
		},
		updateTurnStatus(state, newTurnStatus) {
			state.turnStatus = newTurnStatus;
		},
		updateTurnWinningCard(state, card) {
			state.turnWinningCard = card;
		},
		setGameWinner(state, username) {
			state.winner = username;
		}
	},
	actions: {},
	getters: {
		sortedUsers(state) {
			const users = JSON.parse(JSON.stringify(state.users)); // Make a copy so we aren't mutating state
			return users.sort((a, b) => (a.points > b.points) ? -1 : 1);
		}
	}
}

const user = {
	namespaced: true,

	state: {
		isReady: false,
		username: "",
		hand: {},
		isPrivileged: false,
		playedThisTurn: false,
		points: 0
	},
	mutations: {
		setUsername(state, username) {
			state.username = username
		},
		setPrivileged(state) {
			state.isPrivileged = true
		},
		setPlayedThisTurn(state, playedThisTurn) {
			state.playedThisTurn = playedThisTurn
		},
		updateReadyStatus(state, readyInt) {
			state.isReady = readyInt % 2 === 0;
		},
		updateHand(state, newHand) {
			state.hand = newHand;
		},
		updatePoints(state, numPoints) {
			state.points = numPoints
		}
		// removeCardFromHand(cardText): state.hand.filter(c => c != cardText) & update numCardsInHand
	},
	actions: {},
	getters: {
		isCzar(state, getters, rootState) {
			return rootState.room.currentCzar === state.username
		}
		//isCzar
	}
}

const store = new Vuex.Store({
	strict: process.env.NODE_ENV !== 'production',

	modules: {
		room,
		user
	}
});

export default store;