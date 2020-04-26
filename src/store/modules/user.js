const state = {
	isReady: false,
	username: "",
	hand: {},
	isPrivileged: false,
	playedThisTurn: false,
	points: 0
}

const mutations = {
	setUsername: (state, username) => state.username = username,
	setPrivileged: (state) => state.isPrivileged = true,
	setPlayedThisTurn: (state, playedThisTurn) => state.playedThisTurn = playedThisTurn,
	updateReadyStatus: (state, readyInt) => state.isReady = (readyInt % 2 === 0),
	updateHand: (state, newHand) => state.hand = newHand,
	updatePoints: (state, numPoints) => state.points = numPoints
	// removeCardFromHand(cardText): state.hand.filter(c => c != cardText) & update numCardsInHand
}

const	actions = {}

const getters = {
	isCzar(state, getters, rootState) {
		return rootState.room.currentCzar === state.username
	},
	getColor(state, getters, rootState) {
		return rootState.room.users.filter(user => user.username === state.username)[0].color
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}