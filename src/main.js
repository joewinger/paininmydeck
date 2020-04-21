import Vue from 'vue';
import Vuex from 'vuex';
import App from './App.vue';
import router from './router';
import firebase from 'firebase/app'; 
import 'firebase/analytics';
import dbManager from './dbManager';
import store from './store';
// const attachFastClick = require('fastclick');
// import './registerServiceWorker';

// attachFastClick(document.body);

Vue.config.productionTip = false;

firebase.analytics();

Vue.filter('blankify', (value) => {
	if (!value) return ''
	value = value.toString()
	return value.replace("_", "________")
});

Vue.use(Vuex);

new Vue({
	data: dbManager,
	store: store,
	router,
	render: function (h) { return h(App) }
}).$mount('#app');

router.replace('/');