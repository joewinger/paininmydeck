import Vue from 'vue';
import App from './App';
import router from './router';
import firebase from 'firebase/app'; 
import 'firebase/analytics';
import store from './store';
// const attachFastClick = require('fastclick');

// attachFastClick(document.body);

Vue.config.productionTip = false;

if(process.env.NODE_ENV === 'production') firebase.analytics();

Vue.filter('blankify', (value) => {
	if (!value) return ''
	value = value.toString()
	return value.replace("_", "________")
});

new Vue({
	store,
	router,
	render: function (h) { return h(App) }
}).$mount('#app');