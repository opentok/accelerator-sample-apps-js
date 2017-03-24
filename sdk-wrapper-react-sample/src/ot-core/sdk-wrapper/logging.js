"use strict";

// eslint-disable-next-line no-console
var message = function message(messageText) {
  return console.log("otSDK: " + messageText);
};

module.exports = {
  message: message
};