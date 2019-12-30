<template>
  <div class="home-page-container">
    <Chatbox v-if="chatboxIsActive" v-bind:userId="userId" v-bind:vendorId="vendorId"/>
  </div>
</template>

<script>
import Chatbox from './Chatbox.vue';

export default {
  name: 'Home',
  components: {
    Chatbox
  },
  data: function() {
    return {
      chatboxIsActive: false,
      userId: null, // should not be defined here??
      vendorId: null // """
    }
  },
  methods: {
    openChatbox: function(data) {
      // Initialize values that will be sent to backend
      this.userId = data.userId;
      this.vendorId = data.vendorId;

      // Open up chatbox (trigger create event within component)
      this.chatboxIsActive = true;
    }
  }
}
</script>