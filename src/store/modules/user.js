function initialState() {
	return {
		username: "",
		hand: {},
		isPrivileged: false,
		playedThisTurn: false
	}
}

const state = initialState();

const mutations = {
	setUsername: (state, username) => state.username = String(username),
	setPrivileged: (state) => state.isPrivileged = true,
	setPlayedThisTurn: (state, playedThisTurn) => state.playedThisTurn = playedThisTurn,
	updateHand: (state, newHand) => state.hand = newHand,
	updatePoints: (state, numPoints) => state.points = numPoints,
	reset: (state) => {
		const initial = initialState();
		Object.keys(initial).forEach(key => {
			state[key] = initial[key]
		});
	}
}

const	actions = {}

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