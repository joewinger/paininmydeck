import Vue from 'vue';
import App from './App';
import router from './router';
import store from './store';
import GameManager from './gameManager';
import 'firebase/analytics';
import TextareaAutosize from 'vue-textarea-autosize';
import fastclick from 'fastclick';
import '@/assets/variables.css';
import '@/assets/global.css';

fastclick.attach(document.body);

Vue.config.productionTip = false;
Vue.config.ignoredElements = [/^ion-/];

Vue.use(TextareaAutosize);
Vue.use(GameManager);

Vue.filter('blankify', (value) => {
	if (!value) return ''
	value = value.toString()
	return value.replace("_", "________")
});

Vue.prototype.$commitHash = process.env.VUE_APP_COMMIT_HASH;

new Vue({
	store,
	router,
	render: function (h) { return h(App) }
}).$mount('#app');