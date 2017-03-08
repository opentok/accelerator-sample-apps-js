'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/* global OT */

/** Dependencies */
var state = require('./state');

var _require = require('./errors'),
    CoreError = _require.CoreError;

var _require2 = require('./util'),
    dom = _require2.dom,
    path = _require2.path,
    pathOr = _require2.pathOr,
    properCase = _require2.properCase;

var _require3 = require('./logging'),
    message = _require3.message,
    logAnalytics = _require3.logAnalytics,
    logAction = _require3.logAction,
    logVariation = _require3.logVariation;

/** Module variables */


var session = undefined;
var accPack = undefined;
var callProperties = undefined;
var screenProperties = undefined;
var streamContainers = undefined;
var autoSubscribe = undefined;
var connectionLimit = undefined;
var active = false;

/**
 * Default UI propties
 * https://tokbox.com/developer/guides/customize-ui/js/
 */
var defaultCallProperties = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  showControls: false,
  style: {
    buttonDisplayMode: 'off'
  }
};

/**
 * Trigger an event through the API layer
 * @param {String} event - The name of the event
 * @param {*} [data]
 */
var triggerEvent = function triggerEvent(event, data) {
  return accPack.triggerEvent(event, data);
};

/**
 * Determine whether or not the party is able to join the call based on
 * the specified connection limit, if any.
 * @return {Boolean}
 */
var ableToJoin = function ableToJoin() {
  if (!connectionLimit) {
    return true;
  }
  // Not using the session here since we're concerned with number of active publishers
  var connections = Object.values(state.getStreams()).filter(function (s) {
    return s.videoType === 'camera';
  });
  return connections.length < connectionLimit;
};

/**
 * Create a camera publisher object
 * @param {Object} publisherProperties
 * @returns {Promise} <resolve: Object, reject: Error>
 */
var createPublisher = function createPublisher(publisherProperties) {
  return new Promise(function (resolve, reject) {
    // TODO: Handle adding 'name' option to props
    var props = Object.assign({}, callProperties, publisherProperties);
    // TODO: Figure out how to handle common vs package-specific options
    // ^^^ This may already be available through package options
    var container = dom.element(streamContainers('publisher', 'camera'));
    var publisher = OT.initPublisher(container, props, function (error) {
      error ? reject(error) : resolve(publisher);
    });
  });
};

/**
 * Publish the local camera stream and update state
 * @param {Object} publisherProperties
 * @returns {Promise} <resolve: empty, reject: Error>
 */
var publish = function publish(publisherProperties) {
  return new Promise(function (resolve, reject) {
    var onPublish = function onPublish(publisher) {
      return function (error) {
        if (error) {
          reject(error);
          logAnalytics(logAction.startCall, logVariation.fail);
        } else {
          logAnalytics(logAction.startCall, logVariation.success);
          state.addPublisher('camera', publisher);
          resolve(publisher);
        }
      };
    };

    var publishToSession = function publishToSession(publisher) {
      return session.publish(publisher, onPublish(publisher));
    };

    var handleError = function handleError(error) {
      logAnalytics(logAction.startCall, logVariation.fail);
      var errorMessage = error.code === 1010 ? 'Check your network connection' : error.message;
      triggerEvent('error', errorMessage);
      reject(error);
    };

    createPublisher(publisherProperties).then(publishToSession).catch(handleError);
  });
};

/**
 * Subscribe to a stream and update the state
 * @param {Object} stream - An OpenTok stream object
 * @returns {Promise} <resolve: empty reject: Error >
 */
var subscribe = function subscribe(stream) {
  return new Promise(function (resolve, reject) {
    logAnalytics(logAction.subscribe, logVariation.attempt);
    var streamMap = state.getStreamMap();
    var streamId = stream.streamId;

    if (streamMap[streamId]) {
      // Are we already subscribing to the stream?
      resolve();
    } else {
      (function () {
        // No videoType indicates SIP https://tokbox.com/developer/guides/sip/
        var type = pathOr('sip', 'videoType', stream);
        var connectionData = JSON.parse(path(['connection', 'data'], stream) || null);
        var container = dom.query(streamContainers('subscriber', type, connectionData, streamId));
        var options = type === 'camera' ? callProperties : screenProperties;
        var subscriber = session.subscribe(stream, container, options, function (error) {
          if (error) {
            logAnalytics(logAction.subscribe, logVariation.fail);
            reject(error);
          } else {
            state.addSubscriber(subscriber);
            triggerEvent('subscribeTo' + properCase(type), Object.assign({}, { subscriber: subscriber }, state.all()));
            type === 'screen' && triggerEvent('startViewingSharedScreen', subscriber); // Legacy event
            logAnalytics(logAction.subscribe, logVariation.success);
            resolve();
          }
        });
      })();
    }
  });
};

/**
 * Unsubscribe from a stream and update the state
 * @param {Object} subscriber - An OpenTok subscriber object
 * @returns {Promise} <resolve: empty>
 */
var unsubscribe = function unsubscribe(subscriber) {
  return new Promise(function (resolve) {
    logAnalytics(logAction.unsubscribe, logVariation.attempt);
    var type = path('stream.videoType', subscriber);
    state.removeSubscriber(type, subscriber);
    session.unsubscribe(subscriber);
    logAnalytics(logAction.unsubscribe, logVariation.success);
    resolve();
  });
};

/**
 * Ensure all required options are received
 * @param {Object} options
 */
var validateOptions = function validateOptions(options) {
  var requiredOptions = ['accPack'];
  requiredOptions.forEach(function (option) {
    if (!options[option]) {
      throw new CoreError(option + ' is a required option.', 'invalidParameters');
    }
  });

  accPack = options.accPack;
  streamContainers = options.streamContainers;
  callProperties = options.callProperties || defaultCallProperties;
  connectionLimit = options.connectionLimit || null;
  autoSubscribe = options.hasOwnProperty('autoSubscribe') ? options.autoSubscribe : true;

  screenProperties = options.screenProperties || Object.assign({}, defaultCallProperties, { videoSource: 'window' });
};

/**
 * Set session in module scope
 */
var setSession = function setSession() {
  session = state.getSession();
};

/**
 * Subscribe to new stream unless autoSubscribe is set to false
 * @param {Object} stream
 */
var onStreamCreated = function onStreamCreated(_ref) {
  var stream = _ref.stream;
  return active && autoSubscribe && subscribe(stream);
};

/**
 * Update state and trigger corresponding event(s) when stream is destroyed
 * @param {Object} stream
 */
var onStreamDestroyed = function onStreamDestroyed(_ref2) {
  var stream = _ref2.stream;

  state.removeStream(stream);
  var type = pathOr('sip', 'videoType', stream);
  type === 'screen' && triggerEvent('endViewingSharedScreen'); // Legacy event
  triggerEvent('unsubscribeFrom' + properCase(type), state.getPubSub());
};

/**
 * Listen for API-level events
 */
var createEventListeners = function createEventListeners() {
  accPack.on('streamCreated', onStreamCreated);
  accPack.on('streamDestroyed', onStreamDestroyed);
};

/**
 * Start publishing the local camera feed and subscribing to streams in the session
 * @param {Object} publisherProperties
 * @returns {Promise} <resolve: Object, reject: Error>
 */
var startCall = function startCall(publisherProperties) {
  return new Promise(function (resolve, reject) {
    // eslint-disable-line consistent-return
    logAnalytics(logAction.startCall, logVariation.attempt);

    /**
     * Determine if we're able to join the session based on an existing connection limit
     */
    if (!ableToJoin()) {
      var errorMessage = 'Session has reached its connection limit';
      triggerEvent('error', errorMessage);
      logAnalytics(logAction.startCall, logVariation.fail);
      return reject(new CoreError(errorMessage, 'connectionLimit'));
    }

    /**
     * Subscribe to any streams that existed before we start the call from our side.
     */
    var subscribeToInitialStreams = function subscribeToInitialStreams(publisher) {
      // Get an array of initial subscription promises
      var initialSubscriptions = function initialSubscriptions() {
        if (autoSubscribe) {
          var _ret2 = function () {
            var streams = state.getStreams();
            return {
              v: Object.keys(streams).map(function (id) {
                return subscribe(streams[id]);
              })
            };
          }();

          if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
        }
        return [Promise.resolve()];
      };

      // Handle success
      var onSubscribeToAll = function onSubscribeToAll() {
        var pubSubData = Object.assign({}, state.getPubSub(), { publisher: publisher });
        triggerEvent('startCall', pubSubData);
        active = true;
        resolve(pubSubData);
      };

      // Handle error
      var onError = function onError(reason) {
        message('Failed to subscribe to all existing streams: ' + reason);
        // We do not reject here in case we still successfully publish to the session
        resolve(Object.assign({}, state.getPubSub(), { publisher: publisher }));
      };

      Promise.all(initialSubscriptions()).then(onSubscribeToAll).catch(onError);
    };

    publish(publisherProperties).then(subscribeToInitialStreams).catch(reject);
  });
};

/**
 * Stop publishing and unsubscribe from all streams
 */
var endCall = function endCall() {
  logAnalytics(logAction.endCall, logVariation.attempt);

  var _state$getPubSub = state.getPubSub(),
      publishers = _state$getPubSub.publishers,
      subscribers = _state$getPubSub.subscribers;

  var unpublish = function unpublish(publisher) {
    return session.unpublish(publisher);
  };
  Object.values(publishers.camera).forEach(unpublish);
  Object.values(publishers.screen).forEach(unpublish);
  // TODO Promise.all for unsubsribing
  Object.values(subscribers.camera).forEach(unsubscribe);
  Object.values(subscribers.screen).forEach(unsubscribe);
  state.removeAllPublishers();
  active = false;
  triggerEvent('endCall');
  logAnalytics(logAction.endCall, logVariation.success);
};

/**
 * Enable/disable local audio or video
 * @param {String} source - 'audio' or 'video'
 * @param {Boolean} enable
 */
var enableLocalAV = function enableLocalAV(id, source, enable) {
  var method = 'publish' + properCase(source);

  var _state$getPubSub2 = state.getPubSub(),
      publishers = _state$getPubSub2.publishers;

  publishers.camera[id][method](enable);
};

/**
 * Enable/disable remote audio or video
 * @param {String} subscriberId
 * @param {String} source - 'audio' or 'video'
 * @param {Boolean} enable
 */
var enableRemoteAV = function enableRemoteAV(subscriberId, source, enable) {
  var method = 'subscribeTo' + properCase(source);

  var _state$getPubSub3 = state.getPubSub(),
      subscribers = _state$getPubSub3.subscribers;

  subscribers.camera[subscriberId][method](enable);
};

/**
 * Initialize the communication component
 * @param {Object} options
 * @param {Object} options.accPack
 * @param {Number} options.connectionLimit
 * @param {Function} options.streamContainer
 */
var init = function init(options) {
  return new Promise(function (resolve) {
    validateOptions(options);
    setSession();
    createEventListeners();
    resolve();
  });
};

/** Exports */
module.exports = {
  init: init,
  startCall: startCall,
  endCall: endCall,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  enableLocalAV: enableLocalAV,
  enableRemoteAV: enableRemoteAV
};