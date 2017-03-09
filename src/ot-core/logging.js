'use strict';

var OTKAnalytics = require('opentok-solutions-logging');

// eslint-disable-next-line no-console
var message = function message(messageText) {
  return console.log('otAccCore: ' + messageText);
};

/** Analytics */

var analytics = null;

var logVariation = {
  attempt: 'Attempt',
  success: 'Success',
  fail: 'Fail'
};

var logAction = {
  // vars for the analytics logs. Internal use
  init: 'Init',
  initPackages: 'InitPackages',
  connect: 'ConnectCoreAcc',
  disconnect: 'DisconnectCoreAcc',
  forceDisconnect: 'ForceDisconnectCoreAcc',
  forceUnpublish: 'ForceUnpublishCoreAcc',
  getAccPack: 'GetAccPack',
  signal: 'SignalCoreAcc',
  startCall: 'StartCallCoreAcc',
  endCall: 'EndCallCoreAcc',
  toggleLocalAudio: 'ToggleLocalAudio',
  toggleLocalVideo: 'ToggleLocalVideo',
  toggleRemoteAudio: 'ToggleRemoteAudio',
  toggleRemoteVideo: 'ToggleRemoteVideo',
  subscribe: 'SubscribeCoreAcc',
  unsubscribe: 'UnsubscribeCoreAcc'
};

var updateLogAnalytics = function updateLogAnalytics(sessionId, connectionId, apiKey) {
  if (sessionId && connectionId && apiKey) {
    var sessionInfo = {
      sessionId: sessionId,
      connectionId: connectionId,
      partnerId: apiKey
    };
    analytics.addSessionInfo(sessionInfo);
  }
};

var initLogAnalytics = function initLogAnalytics(source, sessionId, connectionId, apikey) {
  var otkanalyticsData = {
    clientVersion: 'js-vsol-1.0.0',
    source: source,
    componentId: 'acceleratorCore',
    name: 'coreAccelerator',
    partnerId: apikey
  };

  analytics = new OTKAnalytics(otkanalyticsData);

  if (connectionId) {
    updateLogAnalytics(sessionId, connectionId, apikey);
  }
};

var logAnalytics = function logAnalytics(action, variation) {
  analytics.logEvent({ action: action, variation: variation });
};

module.exports = {
  message: message,
  logAction: logAction,
  logVariation: logVariation,
  initLogAnalytics: initLogAnalytics,
  updateLogAnalytics: updateLogAnalytics,
  logAnalytics: logAnalytics
};