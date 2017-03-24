'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* global OT */
/**
 * Dependencies
 */
require('babel-polyfill');
var util = require('./util');
var internalState = require('./state');
var accPackEvents = require('./events');
var communication = require('./communication');
var OpenTokSDK = require('./sdk-wrapper/sdkWrapper');

var _require = require('./errors'),
    CoreError = _require.CoreError;

var _require2 = require('./logging'),
    message = _require2.message,
    initLogAnalytics = _require2.initLogAnalytics,
    logAnalytics = _require2.logAnalytics,
    logAction = _require2.logAction,
    logVariation = _require2.logVariation,
    updateLogAnalytics = _require2.updateLogAnalytics;

/**
 * Helper methods
 */


var dom = util.dom,
    path = util.path,
    pathOr = util.pathOr,
    properCase = util.properCase;

/**
 * Individual Accelerator Packs
 */

var textChat = void 0; // eslint-disable-line no-unused-vars
var screenSharing = void 0; // eslint-disable-line no-unused-vars
var annotation = void 0;
var archiving = void 0; // eslint-disable-line no-unused-vars

/**
 * Get access to an accelerator pack
 * @param {String} packageName - textChat, screenSharing, annotation, or archiving
 * @returns {Object} The instance of the accelerator pack
 */
var getAccPack = function getAccPack(packageName) {
  logAnalytics(logAction.getAccPack, logVariation.attempt);
  var packages = {
    textChat: textChat,
    screenSharing: screenSharing,
    annotation: annotation,
    archiving: archiving
  };
  logAnalytics(logAction.getAccPack, logVariation.success);
  return packages[packageName];
};

/** Eventing */

var eventListeners = {};

/**
 * Register events that can be listened to be other components/modules
 * @param {array | string} events - A list of event names. A single event may
 * also be passed as a string.
 */
var registerEvents = function registerEvents(events) {
  var eventList = Array.isArray(events) ? events : [events];
  eventList.forEach(function (event) {
    if (!eventListeners[event]) {
      eventListeners[event] = new Set();
    }
  });
};

/**
 * Register a callback for a specific event or pass an object with
 * with event => callback key/value pairs to register listeners for
 * multiple events.
 * @param {String | Object} event - The name of the event
 * @param {Function} callback
 */
var on = function on(event, callback) {
  // logAnalytics(logAction.on, logVariation.attempt);
  if ((typeof event === 'undefined' ? 'undefined' : _typeof(event)) === 'object') {
    Object.keys(event).forEach(function (eventName) {
      on(eventName, event[eventName]);
    });
    return;
  }
  var eventCallbacks = eventListeners[event];
  if (!eventCallbacks) {
    message(event + ' is not a registered event.');
    // logAnalytics(logAction.on, logVariation.fail);
  } else {
    eventCallbacks.add(callback);
    // logAnalytics(logAction.on, logVariation.success);
  }
};

/**
 * Remove a callback for a specific event.  If no parameters are passed,
 * all event listeners will be removed.
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
var off = function off(event, callback) {
  // logAnalytics(logAction.off, logVariation.attempt);
  if (!event && !callback) {
    Object.keys(eventListeners).forEach(function (eventType) {
      eventListeners[eventType].clear();
    });
  } else {
    var eventCallbacks = eventListeners[event];
    if (!eventCallbacks) {
      // logAnalytics(logAction.off, logVariation.fail);
      message(event + ' is not a registered event.');
    } else {
      eventCallbacks.delete(callback);
      // logAnalytics(logAction.off, logVariation.success);
    }
  }
};

/**
 * Trigger an event and fire all registered callbacks
 * @param {String} event - The name of the event
 * @param {*} data - Data to be passed to callback functions
 */
var triggerEvent = function triggerEvent(event, data) {
  var eventCallbacks = eventListeners[event];
  if (!eventCallbacks) {
    registerEvents(event);
    message(event + ' has been registered as a new event.');
  } else {
    eventCallbacks.forEach(function (callback) {
      return callback(data, event);
    });
  }
};

/**
 * Get the current OpenTok session object
 * @returns {Object}
 */
var getSession = internalState.getSession;

/**
 * Returns the current OpenTok session credentials
 * @returns {Object}
 */
var getCredentials = internalState.getCredentials;

/**
 * Returns the options used for initialization
 * @returns {Object}
 */
var getOptions = internalState.getOptions;

var createEventListeners = function createEventListeners(session, options) {
  Object.keys(accPackEvents).forEach(function (type) {
    return registerEvents(accPackEvents[type]);
  });

  /**
   * If using screen sharing + annotation in an external window, the screen sharing
   * package will take care of calling annotation.start() and annotation.linkCanvas()
   */
  var usingAnnotation = path('screenSharing.annotation', options);
  var internalAnnotation = usingAnnotation && !path('screenSharing.externalWindow', options);

  /**
   * Wrap session events and update internalState when streams are created
   * or destroyed
   */
  accPackEvents.session.forEach(function (eventName) {
    session.on(eventName, function (event) {
      if (eventName === 'streamCreated') {
        internalState.addStream(event.stream);
      }
      if (eventName === 'streamDestroyed') {
        internalState.removeStream(event.stream);
      }
      triggerEvent(eventName, event);
    });
  });

  if (usingAnnotation) {
    on('subscribeToScreen', function (_ref) {
      var subscriber = _ref.subscriber;

      annotation.start(getSession()).then(function () {
        var absoluteParent = dom.query(path('annotation.absoluteParent.subscriber', options));
        var linkOptions = absoluteParent ? { absoluteParent: absoluteParent } : null;
        annotation.linkCanvas(subscriber, subscriber.element.parentElement, linkOptions);
      });
    });

    on('unsubscribeFromScreen', function () {
      annotation.end();
    });
  }

  on('startScreenSharing', function (publisher) {
    internalState.addPublisher('screen', publisher);
    triggerEvent('startScreenShare', Object.assign({}, { publisher: publisher }, internalState.getPubSub()));
    if (internalAnnotation) {
      annotation.start(getSession()).then(function () {
        var absoluteParent = dom.query(path('annotation.absoluteParent.publisher', options));
        var linkOptions = absoluteParent ? { absoluteParent: absoluteParent } : null;
        annotation.linkCanvas(publisher, publisher.element.parentElement, linkOptions);
      });
    }
  });

  on('endScreenSharing', function (publisher) {
    // delete publishers.screen[publisher.id];
    internalState.removePublisher('screen', publisher);
    triggerEvent('endScreenShare', internalState.getPubSub());
    if (usingAnnotation) {
      annotation.end();
    }
  });
};

var setupExternalAnnotation = function setupExternalAnnotation() {
  return annotation.start(getSession(), {
    screensharing: true
  });
};

var linkAnnotation = function linkAnnotation(pubSub, annotationContainer, externalWindow) {
  annotation.linkCanvas(pubSub, annotationContainer, {
    externalWindow: externalWindow
  });

  if (externalWindow) {
    // Add subscribers to the external window
    var streams = internalState.getStreams();
    var cameraStreams = Object.keys(streams).reduce(function (acc, streamId) {
      var stream = streams[streamId];
      return stream.videoType === 'camera' || stream.videoType === 'sip' ? acc.concat(stream) : acc;
    }, []);
    cameraStreams.forEach(annotation.addSubscriberToExternalWindow);
  }
};

var initPackages = function initPackages() {
  logAnalytics(logAction.initPackages, logVariation.attempt);
  var session = getSession();
  var options = getOptions();
  /**
   * Try to require a package.  If 'require' is unavailable, look for
   * the package in global scope.  A switch ttatement is used because
   * webpack and Browserify aren't able to resolve require statements
   * that use variable names.
   * @param {String} packageName - The name of the npm package
   * @param {String} globalName - The name of the package if exposed on global/window
   * @returns {Object}
   */
  var optionalRequire = function optionalRequire(packageName, globalName) {
    var result = void 0;
    /* eslint-disable global-require, import/no-extraneous-dependencies, import/no-unresolved */
    try {
      switch (packageName) {
        case 'opentok-text-chat':
          result = require('opentok-text-chat');
          break;
        case 'opentok-screen-sharing':
          result = require('opentok-screen-sharing');
          break;
        case 'opentok-annotation':
          result = require('opentok-annotation');
          break;
        case 'opentok-archiving':
          result = require('opentok-archiving');
          break;
        default:
          break;
      }
      /* eslint-enable global-require */
    } catch (error) {
      result = window[globalName];
    }
    if (!result) {
      logAnalytics(logAction.initPackages, logVariation.fail);
      throw new CoreError('Could not load ' + packageName, 'missingDependency');
    }
    return result;
  };

  var availablePackages = {
    textChat: function textChat() {
      return optionalRequire('opentok-text-chat', 'TextChatAccPack');
    },
    screenSharing: function screenSharing() {
      return optionalRequire('opentok-screen-sharing', 'ScreenSharingAccPack');
    },
    annotation: function annotation() {
      return optionalRequire('opentok-annotation', 'AnnotationAccPack');
    },
    archiving: function archiving() {
      return optionalRequire('opentok-archiving', 'ArchivingAccPack');
    }
  };

  var packages = {};
  (path('packages', options) || []).forEach(function (acceleratorPack) {
    if (availablePackages[acceleratorPack]) {
      // eslint-disable-next-line no-param-reassign
      packages[properCase(acceleratorPack)] = availablePackages[acceleratorPack]();
    } else {
      message(acceleratorPack + ' is not a valid accelerator pack');
    }
  });

  /**
   * Get containers for streams, controls, and the chat widget
   */
  var getDefaultContainer = function getDefaultContainer(pubSub) {
    return document.getElementById(pubSub + 'Container');
  };
  var getContainerElements = function getContainerElements() {
    // Need to use path to check for null values
    var controls = pathOr('#videoControls', 'controlsContainer', options);
    var chat = pathOr('#chat', 'textChat.container', options);
    var stream = pathOr(getDefaultContainer, 'streamContainers', options);
    return { stream: stream, controls: controls, chat: chat };
  };
  /** *** *** *** *** */

  /**
   * Return options for the specified package
   * @param {String} packageName
   * @returns {Object}
   */
  var packageOptions = function packageOptions(packageName) {
    /**
     * Methods to expose to accelerator packs
     */
    var accPack = {
      registerEventListener: on, // Legacy option
      on: on,
      registerEvents: registerEvents,
      triggerEvent: triggerEvent,
      setupExternalAnnotation: setupExternalAnnotation,
      linkAnnotation: linkAnnotation
    };

    /**
     * If options.controlsContainer/containers.controls is null,
     * accelerator packs should not append their controls.
     */
    var containers = getContainerElements();
    var appendControl = !!containers.controls;
    var controlsContainer = containers.controls; // Legacy option
    var streamContainers = containers.stream;
    var baseOptions = { session: session, accPack: accPack, controlsContainer: controlsContainer, appendControl: appendControl, streamContainers: streamContainers };

    switch (packageName) {
      /* beautify ignore:start */
      case 'communication':
        {
          return Object.assign({}, baseOptions, options.communication);
        }
      case 'textChat':
        {
          var textChatOptions = {
            textChatContainer: path('textChat.container', options),
            waitingMessage: path('textChat.waitingMessage', options),
            sender: { alias: path('textChat.name', options) },
            alwaysOpen: path('textChat.alwaysOpen', options)
          };
          return Object.assign({}, baseOptions, textChatOptions);
        }
      case 'screenSharing':
        {
          var screenSharingContainer = { screenSharingContainer: streamContainers };
          return Object.assign({}, baseOptions, screenSharingContainer, options.screenSharing);
        }
      case 'annotation':
        {
          return Object.assign({}, baseOptions, options.annotation);
        }
      case 'archiving':
        {
          return Object.assign({}, baseOptions, options.archiving);
        }
      default:
        return {};
      /* beautify ignore:end */
    }
  };

  /** Create instances of each package */
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  communication.init(packageOptions('communication'));
  textChat = packages.TextChat ? new packages.TextChat(packageOptions('textChat')) : null;
  screenSharing = packages.ScreenSharing ? new packages.ScreenSharing(packageOptions('screenSharing')) : null;
  annotation = packages.Annotation ? new packages.Annotation(packageOptions('annotation')) : null;
  archiving = packages.Archiving ? new packages.Archiving(packageOptions('archiving')) : null;

  logAnalytics(logAction.initPackages, logVariation.success);
};

/**
 * Ensures that we have the required credentials
 * @param {Object} credentials
 * @param {String} credentials.apiKey
 * @param {String} credentials.sessionId
 * @param {String} credentials.token
 */
var validateCredentials = function validateCredentials() {
  var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  var required = ['apiKey', 'sessionId', 'token'];
  required.forEach(function (credential) {
    if (!credentials[credential]) {
      throw new CoreError(credential + ' is a required credential', 'invalidParameters');
    }
  });
};

/**
 * Connect to the session
 * @returns {Promise} <resolve: -, reject: Error>
 */
var connect = function connect() {
  return new Promise(function (resolve, reject) {
    logAnalytics(logAction.connect, logVariation.attempt);
    var session = getSession();

    var _getCredentials = getCredentials(),
        token = _getCredentials.token;

    session.connect(token, function (error) {
      if (error) {
        message(error);
        logAnalytics(logAction.connect, logVariation.fail);
        return reject(error);
      }
      var sessionId = session.sessionId,
          apiKey = session.apiKey;

      updateLogAnalytics(sessionId, path('connection.connectionId', session), apiKey);
      logAnalytics(logAction.connect, logVariation.success);
      initPackages();
      triggerEvent('connected', session);
      return resolve({ connections: session.connections.length() });
    });
  });
};

/**
 * Disconnect from the session
 * @returns {Promise} <resolve: -, reject: Error>
 */
var disconnect = function disconnect() {
  logAnalytics(logAction.disconnect, logVariation.attempt);
  getSession().disconnect();
  internalState.reset();
  logAnalytics(logAction.disconnect, logVariation.success);
};

/**
 * Force a remote connection to leave the session
 * @param {Object} connection
 * @returns {Promise} <resolve: empty, reject: Error>
 */
var forceDisconnect = function forceDisconnect(connection) {
  return new Promise(function (resolve, reject) {
    logAnalytics(logAction.forceDisconnect, logVariation.attempt);
    getSession().forceDisconnect(connection, function (error) {
      if (error) {
        logAnalytics(logAction.forceDisconnect, logVariation.fail);
        reject(error);
      } else {
        logAnalytics(logAction.forceDisconnect, logVariation.success);
        resolve();
      }
    });
  });
};

/**
 * Force the publisher of a stream to stop publishing the stream
 * @param {Object} stream
 * @returns {Promise} <resolve: empty, reject: Error>
 */
var forceUnpublish = function forceUnpublish(stream) {
  return new Promise(function (resolve, reject) {
    logAnalytics(logAction.forceUnpublish, logVariation.attempt);
    getSession().forceUnpublish(stream, function (error) {
      if (error) {
        logAnalytics(logAction.forceUnpublish, logVariation.fail);
        reject(error);
      } else {
        logAnalytics(logAction.forceUnpublish, logVariation.success);
        resolve();
      }
    });
  });
};

/**
 * Get the local publisher object for a stream
 * @param {Object} stream - An OpenTok stream object
 * @returns {Object} - The publisher object
 */
var getPublisherForStream = function getPublisherForStream(stream) {
  return getSession().getPublisherForStream(stream);
};

/**
 * Get the local subscriber objects for a stream
 * @param {Object} stream - An OpenTok stream object
 * @returns {Array} - An array of subscriber object
 */
var getSubscribersForStream = function getSubscribersForStream(stream) {
  return getSession().getSubscribersForStream(stream);
};

/**
 * Send a signal using the OpenTok signaling apiKey
 * @param {String} type
 * @param {*} [data]
 * @param {Object} [to] - An OpenTok connection object
 * @returns {Promise} <resolve: empty, reject: Error>
 */
var signal = function signal(type, data, to) {
  return new Promise(function (resolve, reject) {
    logAnalytics(logAction.signal, logVariation.attempt);
    var session = getSession();
    var signalObj = Object.assign({}, type ? { type: type } : null, data ? { data: JSON.stringify(data) } : null, to ? { to: to } : null // eslint-disable-line comma-dangle
    );
    session.signal(signalObj, function (error) {
      if (error) {
        logAnalytics(logAction.signal, logVariation.fail);
        reject(error);
      } else {
        logAnalytics(logAction.signal, logVariation.success);
        resolve();
      }
    });
  });
};

/**
 * Enable or disable local audio
 * @param {Boolean} enable
 */
var toggleLocalAudio = function toggleLocalAudio(enable) {
  logAnalytics(logAction.toggleLocalAudio, logVariation.attempt);

  var _internalState$getPub = internalState.getPubSub(),
      publishers = _internalState$getPub.publishers;

  var toggleAudio = function toggleAudio(id) {
    return communication.enableLocalAV(id, 'audio', enable);
  };
  Object.keys(publishers.camera).forEach(toggleAudio);
  logAnalytics(logAction.toggleLocalAudio, logVariation.success);
};

/**
 * Enable or disable local video
 * @param {Boolean} enable
 */
var toggleLocalVideo = function toggleLocalVideo(enable) {
  logAnalytics(logAction.toggleLocalVideo, logVariation.attempt);

  var _internalState$getPub2 = internalState.getPubSub(),
      publishers = _internalState$getPub2.publishers;

  var toggleVideo = function toggleVideo(id) {
    return communication.enableLocalAV(id, 'video', enable);
  };
  Object.keys(publishers.camera).forEach(toggleVideo);
  logAnalytics(logAction.toggleLocalVideo, logVariation.success);
};

/**
 * Enable or disable remote audio
 * @param {String} id - Subscriber id
 * @param {Boolean} enable
 */
var toggleRemoteAudio = function toggleRemoteAudio(id, enable) {
  logAnalytics(logAction.toggleRemoteAudio, logVariation.attempt);
  communication.enableRemoteAV(id, 'audio', enable);
  logAnalytics(logAction.toggleRemoteAudio, logVariation.success);
};

/**
 * Enable or disable remote video
 * @param {String} id - Subscriber id
 * @param {Boolean} enable
 */
var toggleRemoteVideo = function toggleRemoteVideo(id, enable) {
  logAnalytics(logAction.toggleRemoteVideo, logVariation.attempt);
  communication.enableRemoteAV(id, 'video', enable);
  logAnalytics(logAction.toggleRemoteVideo, logVariation.success);
};

/**
 * Initialize the accelerator pack
 * @param {Object} options
 * @param {Object} options.credentials
 * @param {Array} [options.packages]
 * @param {Object} [options.containers]
 */
var init = function init(options) {
  if (!options) {
    throw new CoreError('Missing options required for initialization', 'invalidParameters');
  }
  var credentials = options.credentials;

  validateCredentials(options.credentials);

  // Init analytics
  initLogAnalytics(window.location.origin, credentials.sessionId, null, credentials.apiKey);
  logAnalytics(logAction.init, logVariation.attempt);
  var session = OT.initSession(credentials.apiKey, credentials.sessionId);
  createEventListeners(session, options);
  internalState.setSession(session);
  internalState.setCredentials(credentials);
  internalState.setOptions(options);
  logAnalytics(logAction.init, logVariation.success);
};

var opentokCore = {
  init: init,
  connect: connect,
  disconnect: disconnect,
  forceDisconnect: forceDisconnect,
  forceUnpublish: forceUnpublish,
  getAccPack: getAccPack,
  getOptions: getOptions,
  getSession: getSession,
  getPublisherForStream: getPublisherForStream,
  getSubscribersForStream: getSubscribersForStream,
  on: on,
  off: off,
  registerEventListener: on,
  triggerEvent: triggerEvent,
  signal: signal,
  state: internalState.all,
  startCall: communication.startCall,
  endCall: communication.endCall,
  OpenTokSDK: OpenTokSDK,
  toggleLocalAudio: toggleLocalAudio,
  toggleLocalVideo: toggleLocalVideo,
  toggleRemoteAudio: toggleRemoteAudio,
  toggleRemoteVideo: toggleRemoteVideo,
  subscribe: communication.subscribe,
  unsubscribe: communication.unsubscribe,
  util: util
};

if (global === window) {
  window.otCore = opentokCore;
}

module.exports = opentokCore;