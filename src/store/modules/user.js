const state = {
	isReady: false,
	username: "",
	color: "",
	hand: {},
	isPrivileged: false,
	playedThisTurn: false,
	points: 0
}

const mutations = {
	setUsername: (state, username) => state.username = username,
	setColor: (state, color) => state.color = color,
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
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}