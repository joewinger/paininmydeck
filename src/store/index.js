import Vuex from 'vuex';
import Vue from 'vue';
import room from './modules/room';
import user from './modules/user';

Vue.use(Vuex);

const store = new Vuex.Store({
	strict: process.env.NODE_ENV !== 'production',

	modules: {
		room,
		user
	}
});

export default store;