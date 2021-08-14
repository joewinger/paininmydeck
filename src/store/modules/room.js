import firebase from 'firebase/app';
import 'firebase/firestore';
import dayjs from 'dayjs';
import router from '@/router';

const initialState = {
	roomId: null, 
	gameState: null,
	users: [], // This is a map in our DB, but it's easier to work with as an array on the client.
	settings: {},
	chatMessages: [],
	turn: {
		round: null,
		status: null,
		questionCard: null,
		czar: null,
		playedCards: [],
		winningCard: null,
	},
	winner: null
};

let state = initialState;

const mutations = { // Preceding '_' means the mutation should only be called from within an action.
	setRoomId: (state, roomId) => state.roomId = String(roomId),
	_updateGameState: (state, newGameState) => state.gameState = newGameState,
	_updateUsers: (state, users) => state.users = users,
	updateSettings: (state, settingsObject) => state.settings = settingsObject,
	updateChatMessages: (state, chatMessageArray) => state.chatMessages = chatMessageArray,
	updateRound: (state, round) => state.turn.round = round,
	updateTurnStatus: (state, newTurnStatus) => state.turn.status = newTurnStatus,
	updateQuestionCard: (state, newQuestionCard) => state.turn.questionCard = newQuestionCard,
	updateCzar: (state, newCzar) => state.turn.czar = newCzar,
	updatePlayedCards: (state, newPlayedCards) => state.turn.playedCards = newPlayedCards,
	updateWinningCard: (state, card) => state.turn.winningCard = card,
	setGameWinner: (state, username) => state.winner = username,
	reset: (state) => Object.keys(initialState).forEach(key => state[key] = initialState[key])
}

const actions = {
	updateUsers({ commit }, usersObj) {
		let users = []; // Break our object down in to an array so it's easier to work with
		for(let i = 0; i < Object.keys(usersObj).length; i++) {
			users[i] = Object.values(usersObj)[i];
			users[i].username = Object.keys(usersObj)[i];
		}

		commit('_updateUsers', users);
	},
	sendMessage({ state, rootState }, messageText) {
		firebase.firestore().doc(`games/${state.roomId}/meta/chat`).update({
			chatMessages: firebase.firestore.FieldValue.arrayUnion({
				timestamp: dayjs().valueOf(),
				sender: rootState.user.username,
				text: messageText
			})
		});
	},
	updateSettings({ state }, settingsObject) {
		if(settingsObject.cardsPerHand < 3) settingsObject.cardsPerHand = 3;
		if(settingsObject.pointsToWin < 1) settingsObject.pointsToWin = 1;

		firebase.firestore().doc(`games/${state.roomId}`).update({
			settings: settingsObject
		});
	},
	updateGameState({ state, commit }, gameState) {
		if(state.gameState !== gameState) { // If the state has changed
			commit('_updateGameState', gameState);
			
			if(gameState === 'PLAYING')  router.replace({name: 'game'});
			if(gameState === 'FINISHED') router.replace({name: 'gameover'});
		}
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
		return state.users.find(user => user.username === state.turn.czar).colorSet[0];
	},
	getCzarColorSet(state) {
		return state.users.find(user => user.username === state.turn.czar).colorSet;
	},
	getColorSetByUsername: (state) => (username) => {
		return state.users.find(user => user.username === username).colorSet;
	},
	getUsernamesPlayedCard(state) {
		return state.turn.playedCards.map(card => card.playedBy);
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}