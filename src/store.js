const roomData = {
	state: {},
	mutations: {},
	actions: {},
	getters: {}
}

const userData = {
	state: {},
	mutations: {},
	actions: {},
	getters: {}
}

const store = new Vuex.Store({
	modules: {
		roomData,
		userData
	}
});

export default store;