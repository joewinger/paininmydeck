import Vue from 'vue';
import App from './App';
import router from './router';
import 'firebase/analytics';
import store from './store';
import TextareaAutosize from 'vue-textarea-autosize';
import fastclick from 'fastclick';

fastclick.attach(document.body);

Vue.config.productionTip = false;
Vue.config.ignoredElements = [/^ion-/];

Vue.use(TextareaAutosize);

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