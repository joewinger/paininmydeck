import firebase from 'firebase/app';
import 'firebase/firestore';
import dayjs from 'dayjs';

function initialState() {
	return {
		roomId: null,
		gameState: null,
		users: [],
		settings: {},
		chatMessages: [],
		currentBlackCard: null,
		currentCzar: null,
		currentTurnStatus: null,
		activeCards: [],
		pointsToWin: null,
		turnStatus: null,
		turnWinningCard: null,
		winner: null
	}
}

const state = initialState();

const mutations = {
	setRoomId: (state, roomId) => state.roomId = String(roomId),
	setPointsToWin: (state, numPointsToWin) => state.pointsToWin = numPointsToWin,
	updateUsers: (state, users) => state.users = users,
	updateSettings: (state, settingsObject) => state.settings = settingsObject,
	updateChatMessages: (state, chatMessageArray) => state.chatMessages = chatMessageArray,
	updateGameState: (state, newGameState) => state.gameState = newGameState,
	updateBlackCard: (state, newBlackCard) => state.currentBlackCard = newBlackCard,
	updateCzar: (state, newCzar) => state.currentCzar = newCzar,
	updateActiveCards: (state, newActiveCards) => state.activeCards = newActiveCards,
	updateTurnStatus: (state, newTurnStatus) => state.turnStatus = newTurnStatus,
	updateTurnWinningCard: (state, card) => state.turnWinningCard = card,
	setGameWinner: (state, username) => state.winner = username,
	reset: (state) => {
		const initial = initialState();
		Object.keys(initial).forEach(key => {
			state[key] = initial[key]
		});
	}
}

const actions = {
	sendMessage({state, rootState}, messageText) {
		firebase.firestore().collection('games').doc(state.roomId).update({
			chatMessages: firebase.firestore.FieldValue.arrayUnion({
				timestamp: dayjs().valueOf(),
				sender: rootState.user.username,
				text: messageText
			})
		});
	},
	updateSettings({state}, settingsObject) {
		firebase.firestore().collection('games').doc(state.roomId).update({
			settings: settingsObject
		});
	}
}

const getters = {
	sortedUsers(state) {
		const users = JSON.parse(JSON.stringify(state.users)); // Make a copy so we aren't mutating state
		return users.sort((a, b) => (a.points > b.points) ? -1 : 1);
	},
	getUsedColorSets(state) {
		// Use colorSet.join() because the only time we use this
		// is when assigning color sets to new users, and that
		// comparison uses strings (i.e. "#FFFFFF,#000000")

		return state.users.map(user => user.colorSet.join());
	},
	getCzarColor(state) {
		return state.users.find(user => user.username == state.currentCzar).colorSet[0];
	},
	getCzarColorSet(state) {
		return state.users.find(user => user.username == state.currentCzar).colorSet;
	},
	getColorSetByUsername: (state) => (username) => {
		return state.users.find(user => user.username == username).colorSet;
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}