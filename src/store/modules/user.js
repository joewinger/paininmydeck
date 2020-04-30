function initialState() {
	return {
		isReady: false,
		username: "",
		hand: {},
		isPrivileged: false,
		playedThisTurn: false,
		points: 0
	}
}

const state = initialState();

const mutations = {
	setUsername: (state, username) => state.username = username,
	setPrivileged: (state) => state.isPrivileged = true,
	setPlayedThisTurn: (state, playedThisTurn) => state.playedThisTurn = playedThisTurn,
	updateReadyStatus: (state, readyInt) => state.isReady = (readyInt % 2 === 0),
	updateHand: (state, newHand) => state.hand = newHand,
	updatePoints: (state, numPoints) => state.points = numPoints,
	reset: (state) => {
		const initial = initialState();
		Object.keys(initial).forEach(key => {
			state[key] = initial[key]
		});
	}
	// removeCardFromHand(cardText): state.hand.filter(c => c != cardText) & update numCardsInHand
}

const	actions = {}

const getters = {
	isCzar(state, getters, rootState) {
		return rootState.room.currentCzar === state.username
	},
	getColor(state, getters, rootState) {
		return rootState.room.users.filter(user => user.username === state.username)[0].colorSet[0]
	},
	getColorSet(state, getters, rootState) {
		return rootState.room.users.filter(user => user.username === state.username)[0].colorSet
	},
	getUserObject(state, getters) { // Only used as a hack to get UserIcon.us to work properly -- I need an object version of our data
		const userObject = {
			'username': state.username,
			'ready': state.isReady,
			'colorSet': getters.getColorSet,
			'points': state.points
		}

		return userObject;
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}