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
		// Break our object down in to an array so it's easier to work with
		// what we recieve: {user1: {a: b, c: d}, user2: {a: b, c: d}}
		// what we save:    [{username: user1, a: b, c: d}, {username: user2, a: b, c: d}]
		// Also, sort by czarOrder.
		commit('_updateUsers', Object.keys(usersObj).map(username => ({ username:username, ...usersObj[username] })).sort((a, b) => a.czarOrder - b.czarOrder));
	},
	sendChatMessage({ state, rootState, dispatch }, message) {
		if (message.charAt(0) !== '!') {
			firebase.firestore().doc(`games/${state.roomId}/meta/chat`).update({
				chatMessages: firebase.firestore.FieldValue.arrayUnion({
					timestamp: dayjs().valueOf(),
					sender: rootState.user.username,
					text: message,
					type: 'chat'
				})
			});
		} else {
			let command = message.split(' ')[0].substring(1);
			let args = message.split(' ').slice(1);
			switch (command.toLowerCase()) {
				case 'system':
					dispatch('sendSystemMessage', args.join(' '));
					break;
				case 'startnewturn':
					firebase.functions().httpsCallable('startNewTurn')({roomId: state.roomId});
					break;
			}
		}
	},
	sendSystemMessage({ state }, message) {
		firebase.firestore().doc(`games/${state.roomId}/meta/chat`).update({
			chatMessages: firebase.firestore.FieldValue.arrayUnion({
				timestamp: dayjs().valueOf(),
				sender: 'System',
				text: message,
				type: 'system'
			})
		});
	},
	updateSettings({ state }, settingsObject) {
		if (settingsObject.cardsPerHand < 3) settingsObject.cardsPerHand = 3;
		if (settingsObject.pointsToWin < 1) settingsObject.pointsToWin = 1;

		firebase.firestore().doc(`games/${state.roomId}`).update({
			settings: settingsObject
		});
	},
	updateGameState({ state, commit }, gameState) {
		if (state.gameState !== gameState) { // If the state has changed
			commit('_updateGameState', gameState);
			
			if (gameState === 'PLAYING')  router.replace({name: 'game'});
			if (gameState === 'FINISHED') router.replace({name: 'gameover'});
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