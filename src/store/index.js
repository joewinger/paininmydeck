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

	modules: {
		room,
		user
	},
	mutations: {
		RESTORE_STATE_MUTATION: persistence.RESTORE_STATE_MUTATION
	},
	plugins: [persistence.plugin]
});

export default store;