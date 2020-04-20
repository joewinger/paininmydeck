import Vue from 'vue';
import App from './App.vue';
import router from './router';
import firebase from 'firebase/app'; 
import 'firebase/analytics';
import dbManager from './dbManager';
// const attachFastClick = require('fastclick');
// import './registerServiceWorker';

// attachFastClick(document.body);

Vue.config.productionTip = false;

firebase.analytics();

Vue.filter('blankify', (value) => {
  if (!value) return ''
  value = value.toString()
  return value.replace("_", "________")
})

new Vue({
  data: dbManager,
  router,
  render: function (h) { return h(App) }
}).$mount('#app');

router.replace('/');