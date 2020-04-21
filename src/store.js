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
			state.numPointsToWin = numPointsToWin;
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
	getters: {}
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
		setPrivileged(state, isPrivileged) {
			state.isPrivileged = isPrivileged
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
	modules: {
		room,
		user
	}
});

export default store;