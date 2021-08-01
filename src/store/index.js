import Vuex from 'vuex';
import Vue from 'vue';
import room from './modules/room';
import user from './modules/user';
import statePersistence from './statePersistence';

Vue.use(Vuex);

const persistence = new statePersistence({
	storage: sessionStorage,
	key: 'savedState',
	onRestoreState: async () => {
		let dbManager = await require('@/dbManager');
		dbManager.default.initializeFirebase();
	}
});

const store = new Vuex.Store({
	strict: process.env.NODE_ENV !== 'production',
	state: {
		error: ''
	},
	modules: {
		room,
		user
	},
	mutations: {
		RESTORE_STATE_MUTATION: persistence.RESTORE_STATE_MUTATION,
		SET_ERROR: (state, message) => state.error = message
	},
	actions: {
		error: ({ commit }, message) => {
			commit('SET_ERROR', message);

			if (message != '') console.debug(`[Error Toast] ${message}`);

			setTimeout(() => {
				commit('SET_ERROR', '');
			}, 5000)
		}
	},
	plugins: [persistence.plugin]
});

export default store;