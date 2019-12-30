<template>
<div class="message-container">
  <div class="image-container" v-if="messageContainsImg">
    <img class="message-image" v-bind:src="messageImageSrc"/>
  </div>
  <p class="message" v-html="message"></p>
</div>
</template>

<script>
export default {
  name: 'ChatboxMessage',
  mounted: function() {
    this.$emit('messageMounted');
  },
  props: {
    message: String,
    messageContainsImg: Boolean,
    messageImageSrc: String
  }
}
</script>

<style>
.message-container {
  margin-bottom: 5px;
  min-width: 85%; /** Is this number correct?? */
  max-width: 95%; /** Is this number correct?? */
}

.message-image {
  width: 100%;
}

.was-received {
  background-color: red;
}

.was-sent {
  background-color: green;
  margin: 0 0 0 auto;
}
</style>