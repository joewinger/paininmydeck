const state = {
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
}

const mutations = {
	setRoomId(state, roomId) {
		state.roomId = roomId;
	},
	setPointsToWin(state, numPointsToWin) {
		state.pointsToWin = numPointsToWin;
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
}

const actions = {}

const getters = {
	sortedUsers(state) {
		const users = JSON.parse(JSON.stringify(state.users)); // Make a copy so we aren't mutating state
		return users.sort((a, b) => (a.points > b.points) ? -1 : 1);
	}
}

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
}