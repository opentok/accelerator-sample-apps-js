'use strict';

var events = {
  session: ['archiveStarted', 'archiveStopped', 'connectionCreated', 'connectionDestroyed', 'sessionConnected', 'sessionDisconnected', 'sessionReconnected', 'sessionReconnecting', 'signal', 'streamCreated', 'streamDestroyed', 'streamPropertyChanged'],
  core: ['connected', 'startScreenShare', 'endScreenShare', 'error'],
  communication: ['startCall', 'endCall', 'callPropertyChanged', 'subscribeToCamera', 'subscribeToScreen', 'subscribeToSip', 'unsubscribeFromCamera', 'unsubscribeFromSip', 'unsubscribeFromScreen', 'startViewingSharedScreen', 'endViewingSharedScreen'],
  textChat: ['showTextChat', 'hideTextChat', 'messageSent', 'errorSendingMessage', 'messageReceived'],
  screenSharing: ['startScreenSharing', 'endScreenSharing', 'screenSharingError'],
  annotation: ['startAnnotation', 'linkAnnotation', 'resizeCanvas', 'annotationWindowClosed', 'endAnnotation'],
  archiving: ['startArchive', 'stopArchive', 'archiveReady', 'archiveError']
};

module.exports = events;