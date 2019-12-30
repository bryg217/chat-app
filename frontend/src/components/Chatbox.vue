<template>
  <div class="chatbox-container container" v-if="isChatboxOpen">
    <div class="maximized-state-chatbox-container" v-show="isMaximized">
      <div class="chatbox-header-container">
        <div class="vendor-name-chatbox">Example Name</div>
        <div class="chatbox-close-minimize-container">
          <button class="chatbox-minimize-button" v-on:click="minimizeChatBox">_</button>
          <button class="chatbox-close-button" v-on:click="closeChatbox">X</button>
        </div>
      </div>
      <div id="messages-container" class="messages-container">
        <ChatboxMessage  v-for="message in messages" v-bind:message="message.text" v-bind:class="message.cssClassTernaryOp" v-bind:messageContainsImg="message.messageContainsImg" v-bind:messageImageSrc="message.messageImageSrc" v-on:messageMounted="scrollToBottom"/>
      </div>
      <div class="chatbox-input-container">
        <input type="text" id="chatbox-input" class="chatbox-input" name="chatbox-input" v-model="inputFieldVal">
        <button class="chatbox-input-submit" v-on:click="submitMessage">Submit</button>
        <button class="chatbox-ok-button" v-on:click="handleOkButtonClick" v-if="showOkayButton">Ok</button>
      </div>
    </div>
    <div class="minimized-state-chatbox-container" v-show="isMinimized">
      <div class="chatbox-header-container">
        <div class="vendor-name-chatbox">Example Name</div>
        <div class="chatbox-close-maximize-container">
          <button class="chatbox-maximize-button" v-on:click="maximizeChatbox">_</button>
          <button class="chatbox-close-button" v-on:click="closeChatbox">X</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ChatboxMessage from './ChatboxMessage';

export default {
  name: 'Chatbox',
  components: {
    ChatboxMessage
  },
  created: function() {
    // Initialize useful vars
    const userId = this.userId;
    const vendorId = this.vendorId;

    // Add backend message event listener
    this.$socket.socket.on('backend message', (message) => {
      this.messages.push(this.generateMessageDOMElementData(message, this.messagesSelectors.wasReceived));
    });

    // Add backend message - initial listener
    this.$socket.socket.on('backend message - initial', (message) => {
      // Add message to DOM
      this.messages.push(this.generateMessageDOMElementData(message, this.messagesSelectors.wasReceived))

      // Show 'Got it' button
      this.showOkayButton = true;
    });

    /** 
     * Add backend multimedia message for images (this should probably be
     * consolidated with listener above)
     */
    this.$socket.socket.on('backend album pic message', (messageData) => {
      const albumDate = messageData.albumData.albumDate;
      const albumName = messageData.albumData.albumName;
      const messageImageSrc = messageData.imageUrl;
      const messageText = albumName + '<br>' + albumDate;

      // Get the original object
      const DOMElementData = this.generateMessageDOMElementData(messageText, this.messagesSelectors.wasReceived);

      // Add the image data that object
      DOMElementData.messageContainsImg = true;
      DOMElementData.messageImageSrc = messageImageSrc;

      // Add that to messages
      this.messages.push(DOMElementData);
    });

    // Send initial message to backend
    this.$socket.socket.emit('initializeChat', { userId, vendorId });
  },
  data: function() {
    return {
      isChatboxOpen: true,
      inputFieldVal: '',
      isMinimized: false,
      isMaximized: true,
      messages: [],
      messagesSelectors: {
        wasReceived: 'was-received',
        wasSent: 'was-sent'
      },
      showOkayButton: false,
      userId: this.userId,
      vendorId: this.vendorId
    }
  },
  methods: {
    closeChatbox: function() {
      this.isChatboxOpen = false;
    },
    generateMessageDOMElementData: function(message, cssSelector) {
      /**
       * @description Function which essentially generates the data
       * that maps to the text (i.e. content) and style (i.e. css selector)
       * to apply to that message
       *
       * @param message - String
       * @param cssSelector - String
       *
       * @returns {Object}
       */
      const text = message;
      const cssClassTernaryOp = {};
      cssClassTernaryOp[cssSelector] = true;
      
      return { text, cssClassTernaryOp };
    },
    generateMessageRequest: function() {
      /**
       * HACK!
       * 
       * - value should be passed in?
       *  - Right now it is tightly coupled
       *    to this.inputFieldVal
       * - userId and vendorId should be dynamically
       *   generated, right now they are cosntants
       */
      const value = this.inputFieldVal;
      const userId = 1;
      const vendorId = 1;

      return { value, userId, vendorId };
    },
    handleOkButtonClick: function() {
      // Emit event for backend
      this.$socket.socket.emit('understand expectations');

      // Hide the button
      this.showOkayButton = false;
    },
    maximizeChatbox: function() {
      this.isMaximized = true;
      this.isMinimized = false;
    },
    minimizeChatBox: function() {
      this.isMaximized = false;
      this.isMinimized = true;
    },
    scrollToBottom: function() {
      const messagesContainer = this.$el.querySelector('#messages-container');
      messagesContainer.scrollTop = messagesContainer.scrollHeight - messagesContainer.clientHeight;
    },
    submitMessage: function() {
      // Send to the back end
      this.$socket.socket.emit('message', this.generateMessageRequest());
      
      // Add message to chatbox message container
      const messageElement = this.generateMessageDOMElementData(this.inputFieldVal, this.messagesSelectors.wasSent);
      this.messages.push(messageElement)

      // Reset value of message input field
      this.inputFieldVal = '';
    }
  },
  props: {
    userId: Number,
    vendorId: Number
  }
}
</script>

<style>
  /* Global */

* {
  box-sizing: border-box;
}

/* Chatbox styles */
.maximized-state-chatbox-container,
.minimized-state-chatbox-container {
  width: 250px;
  border: 1px solid black;
  padding: 5px;
}

.maximized-state-chatbox-container {
  height: 500px;
}

.chatbox-header-container {
  border: 1px solid brown;
  height: 25px;
}

.vendor-name-chatbox {
  float: left;
  max-width: 75%;
}

.chatbox-close-minimize-container {
  display: inline-block;
}

.messages-container {
  height: 350px;
  width: 100%;
  border: 1px solid green;
  overflow-y: scroll;
}

.chatbox-input-container {
  height: 25px;
  width: 100%;
  border: 1px solid blue;
}

@media only screen and (max-width: 767px) {
  .chatbox-container {
    height: 100vh;
    width: 100vw;
  }

  .maximized-state-chatbox-container {
    height: 100%;
    width: 100%;
  }
}
</style>