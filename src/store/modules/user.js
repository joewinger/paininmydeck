import firebase from 'firebase/app';
import 'firebase/firestore';

const initialState = {
	username: "",
	hand: [],
	isPrivileged: false,
	playedThisTurn: false,
	redrawsUsed: 0
};

let state = initialState;

const mutations = {
	setUsername: (state, username) => state.username = String(username),
	setPrivileged: (state) => state.isPrivileged = true,
	setPlayedThisTurn: (state, playedThisTurn) => state.playedThisTurn = playedThisTurn,
	updateHand: (state, newHand) => state.hand = newHand,
	updatePoints: (state, numPoints) => state.points = numPoints,
	updateRedrawsUsed: (state, numRedrawsUsed) => state.redrawsUsed = numRedrawsUsed,
	reset: (state) => Object.keys(initialState).forEach(key => state[key] = initialState[key])
}

const	actions = {
	async trashCard({ state, rootState, commit }, cardText) {
		if (state.redrawsUsed >= rootState.room.settings.numRedraws) return false;

		const userDoc = firebase.firestore().doc(`games/${rootState.room.roomId}/users/${state.username}`);

		const reserveCards = await userDoc.get().then(snapshot => snapshot.get('reserveCards').sort());
		// Replace our trashed card with one from our reserve
		const newHand = [...state.hand].map(card => card === cardText ? reserveCards[state.redrawsUsed] : card);
		userDoc.update('hand', newHand);
		commit('updateRedrawsUsed', state.redrawsUsed + 1);
	}
}

const getters = {
	isCzar(state, getters, rootState) {
		return rootState.room.turn.czar === state.username
	},
	getColor(state, getters, rootState) {
		return rootState.room.users.filter(user => user.username === state.username)[0].colorSet[0]
	},
	getColorSet(state, getters, rootState) {
		return rootState.room.users.filter(user => user.username === state.username)[0].colorSet
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}