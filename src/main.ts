import { createApp } from 'vue';
import App from '@/App.vue';
import IonIcon from '@/components/IonIcon';
import router from '@/router';
import { pinia } from '@/stores';
import 'normalize.css';
import '@/assets/variables.css';
import '@/assets/global.css';

const app = createApp(App);
app.component('ion-icon', IonIcon);
app.use(pinia);
app.use(router);
app.mount('#app');
