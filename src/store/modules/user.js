const initialState = {
	username: "",
	hand: [],
	isPrivileged: false,
	playedThisTurn: false
};

let state = initialState;

const mutations = {
	setUsername: (state, username) => state.username = String(username),
	setPrivileged: (state) => state.isPrivileged = true,
	setPlayedThisTurn: (state, playedThisTurn) => state.playedThisTurn = playedThisTurn,
	updateHand: (state, newHand) => state.hand = newHand,
	updatePoints: (state, numPoints) => state.points = numPoints,
	reset: (state) => Object.keys(initialState).forEach(key => state[key] = initialState[key])
}

const	actions = {
	updateBlankCard({ state, commit }, {blankText, newText}) {
		newText = newText.charAt(0).toUpperCase() + newText.substring(1);
		const punctuation = ['.', '!', '?', '(', ')'];
		if (!punctuation.includes(newText.charAt(newText.length-1))) newText += '.';
		let hand = state.hand.map(card => card === blankText ? newText : card);
		commit('updateHand', hand);
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