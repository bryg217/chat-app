import Vue from 'vue'
import App from './App.vue'
import router from './router';
import socket from './socketIo.js';
import VueResource from 'vue-resource';

Vue.config.productionTip = false
Vue.prototype.$socket = socket;

Vue.use(VueResource);

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
