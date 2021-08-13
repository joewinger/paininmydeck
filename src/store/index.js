import Vuex from 'vuex';
import Vue from 'vue';
import room from './modules/room';
import user from './modules/user';
import statePersistence from './statePersistence';
// import GameManager from '@/gameManager.js';

Vue.use(Vuex);

const persistence = new statePersistence({
	storage: sessionStorage,
	key: 'savedState',
	onRestoreState: () => {}
});

const store = new Vuex.Store({
	strict: process.env.NODE_ENV !== 'production',
	state: {
		error: {},
		interstitial: {}
	},
	modules: {
		room,
		user
	},
	mutations: {
		RESTORE_STATE_MUTATION: persistence.RESTORE_STATE_MUTATION,
		SET_ERROR: (state, options) => state.error = options,
		SET_INTERSTITIAL: (state, options) => state.interstitial = options
	},
	actions: {
		error: ({ commit }, { title = 'Error', message = '', type = 'ERROR', durationMs = 5000 } = {}) => {
			// If there's no message, reset the error (i.e. if the user
			// taps the error toast we call $store.dispatch('error', {}) to close it)
			if (!message) commit('SET_ERROR', {});
			else {
				commit('SET_ERROR', { title, message, type }); // No reason to pass along durationMs, only used here. 
				console.debug(`[Notification] ${title}: ${message}`);
			}

			// Close the toast after durationMs millis
			setTimeout(() => {
				commit('SET_ERROR', {});
			}, durationMs)
		},
		showInterstitial: ({ commit }, { title = '', subtitle = '' }) => {
			if (title) {
				commit('SET_INTERSTITIAL', { title, subtitle });
				console.debug(`[Interstitial] ${title}: ${subtitle}`);
			}

			setTimeout(() => {
				commit('SET_INTERSTITIAL', {});
			}, 5000);
		}
	},
	plugins: [persistence.plugin]
});

export default store;