'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global OT */

/* Dependencies */
var State = require('./state');

var _require = require('./errors'),
    SDKError = _require.SDKError;

/* Internal variables */

var stateMap = new WeakMap();

/* Internal methods */

/**
 * Ensures that we have the required credentials
 * @param {Object} credentials
 * @param {String} credentials.apiKey
 * @param {String} credentials.sessionId
 * @param {String} credentials.token
 * @returns {Object}
 */
var validateCredentials = function validateCredentials() {
  var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var required = ['apiKey', 'sessionId', 'token'];
  required.forEach(function (credential) {
    if (!credentials[credential]) {
      throw new SDKError(credential + ' is a required credential', 'invalidParameters');
    }
  });
  return credentials;
};

/**
 * Initialize an OpenTok publisher object
 * @param {String | Object} element - The target element
 * @param {Object} properties - The publisher properties
 * @returns {Promise} <resolve: Object, reject: Error>
 */
var initPublisher = function initPublisher(element, properties) {
  return new Promise(function (resolve, reject) {
    var publisher = OT.initPublisher(element, properties, function (error) {
      error ? reject(error) : resolve(publisher);
    });
  });
};

/**
 * Binds and sets a single event listener on the OpenTok session
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
var bindListener = function bindListener(target, context, event, callback) {
  var paramsError = '\'on\' requires a string and a function to create an event listener.';
  if (typeof event !== 'string' || typeof callback !== 'function') {
    throw new SDKError(paramsError, 'invalidParameters');
  }
  target.on(event, callback.bind(context));
};

/**
 * Bind and set event listeners
 * @param {Object} target - An OpenTok session, publisher, or subscriber object
 * @param {Object} context - The context to which to bind event listeners
 * @param {Object | Array} listeners - An object (or array of objects) with
 *        eventName/callback k/v pairs
 */
var bindListeners = function bindListeners(target, context, listeners) {
  /**
   * Create listeners from an object with event/callback k/v pairs
   * @param {Object} listeners
   */
  var createListenersFromObject = function createListenersFromObject(eventListeners) {
    Object.keys(eventListeners).forEach(function (event) {
      bindListener(target, context, event, eventListeners[event]);
    });
  };

  if (Array.isArray(listeners)) {
    listeners.forEach(function (listener) {
      return createListenersFromObject(listener);
    });
  } else {
    createListenersFromObject(listeners);
  }
};

/**
 * @class
 * Represents an OpenTok SDK Wrapper
 */

var OpenTokSDK = function () {
  /**
   * Create an SDK Wrapper
   * @param {Object} credentials
   * @param {String} credentials.apiKey
   * @param {String} credentials.sessionId
   * @param {String} credentials.token
   */
  function OpenTokSDK(credentials) {
    _classCallCheck(this, OpenTokSDK);

    this.credentials = validateCredentials(credentials);
    stateMap.set(this, new State());
    this.session = OT.initSession(credentials.apiKey, credentials.sessionId);
    this.setInternalListeners();
  }

  /**
   * Determines if a connection object is my local connection
   * @param {Object} connection - An OpenTok connection object
   * @returns {Boolean}
   */


  _createClass(OpenTokSDK, [{
    key: 'isMe',
    value: function isMe(connection) {
      var session = this.session;

      return session && session.connection.connectionId === connection.connectionId;
    }

    /**
     * Wrap OpenTok session events
     */

  }, {
    key: 'setInternalListeners',
    value: function setInternalListeners() {
      /**
       * Wrap session events and update state when streams are created
       * or destroyed
       */
      var state = stateMap.get(this);
      this.session.on('streamCreated', function (_ref) {
        var stream = _ref.stream;
        return state.addStream(stream);
      });
      this.session.on('streamDestroyed', function (_ref2) {
        var stream = _ref2.stream;
        return state.removeStream(stream);
      });
    }

    /**
     * Register a callback for a specific event, pass an object
     * with event => callback key/values (or an array of objects)
     * to register callbacks for multiple events.
     * @param {String | Object | Array} [events] - The name of the events
     * @param {Function} [callback]
     * https://tokbox.com/developer/sdks/js/reference/Session.html#on
     */

  }, {
    key: 'on',
    value: function on() {
      if (arguments.length === 1 && _typeof(arguments.length <= 0 ? undefined : arguments[0]) === 'object') {
        bindListeners(this.session, this, arguments.length <= 0 ? undefined : arguments[0]);
      } else if (arguments.length === 2) {
        bindListener(this.session, this, arguments.length <= 0 ? undefined : arguments[0], arguments.length <= 1 ? undefined : arguments[1]);
      }
    }

    /**
     * Remove a callback for a specific event. If no parameters are passed,
     * all callbacks for the session will be removed.
     * @param {String} [events] - The name of the events
     * @param {Function} [callback]
     * https://tokbox.com/developer/sdks/js/reference/Session.html#off
     */

  }, {
    key: 'off',
    value: function off() {
      var _session;

      (_session = this.session).off.apply(_session, arguments);
    }

    /**
     * Enable or disable local publisher audio
     * @param {Boolean} enable
     */

  }, {
    key: 'enablePublisherAudio',
    value: function enablePublisherAudio(enable) {
      var _stateMap$get$getPubS = stateMap.get(this).getPubSub(),
          publishers = _stateMap$get$getPubS.publishers;

      Object.keys(publishers.camera).forEach(function (publisherId) {
        publishers.camera[publisherId].publishAudio(enable);
      });
    }

    /**
     * Enable or disable local publisher video
     * @param {Boolean} enable
     */

  }, {
    key: 'enablePublisherVideo',
    value: function enablePublisherVideo(enable) {
      var _stateMap$get$getPubS2 = stateMap.get(this).getPubSub(),
          publishers = _stateMap$get$getPubS2.publishers;

      Object.keys(publishers.camera).forEach(function (publisherId) {
        publishers.camera[publisherId].publishVideo(enable);
      });
    }

    /**
     * Enable or disable local subscriber audio
     * @param {String} streamId
     * @param {Boolean} enable
     */

  }, {
    key: 'enableSubscriberAudio',
    value: function enableSubscriberAudio(streamId, enable) {
      var _stateMap$get$all = stateMap.get(this).all(),
          streamMap = _stateMap$get$all.streamMap,
          subscribers = _stateMap$get$all.subscribers;

      var subscriberId = streamMap[streamId];
      var subscriber = subscribers.camera[subscriberId] || subscribers.screen[subscriberId];
      subscriber && subscriber.subscribeToVideo(enable);
    }

    /**
     * Enable or disable local subscriber video
     * @param {String} streamId
     * @param {Boolean} enable
     */

  }, {
    key: 'enableSubscriberVideo',
    value: function enableSubscriberVideo(streamId, enable) {
      var _stateMap$get$all2 = stateMap.get(this).all(),
          streamMap = _stateMap$get$all2.streamMap,
          subscribers = _stateMap$get$all2.subscribers;

      var subscriberId = streamMap[streamId];
      var subscriber = subscribers.camera[subscriberId] || subscribers.screen[subscriberId];
      subscriber && subscriber.subscribeToAudio(enable);
    }

    /**
     * Create and publish a stream
     * @param {String | Object} element - The target element
     * @param {Object} properties - The publisher properties
     * @param {Array | Object} [eventListeners] - An object (or array of objects) with
     *        eventName/callback k/v pairs
     * @param {Boolean} [preview] - Create a publisher with publishing to the session
     * @returns {Promise} <resolve: Object, reject: Error>
     */

  }, {
    key: 'publish',
    value: function publish(element, properties) {
      var _this = this;

      var eventListeners = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var preview = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      return new Promise(function (resolve, reject) {
        initPublisher(element, properties) // eslint-disable-next-line no-confusing-arrow
        .then(function (publisher) {
          eventListeners && bindListeners(publisher, _this, eventListeners);
          if (preview) {
            resolve(publisher);
          } else {
            _this.publishPreview(publisher).then(resolve).catch(reject);
          }
        }).catch(reject);
      });
    }

    /**
     * Publish a 'preview' stream to the session
     * @param {Object} publisher - An OpenTok publisher object
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'publishPreview',
    value: function publishPreview(publisher) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        var state = stateMap.get(_this2);
        _this2.session.publish(publisher, function (error) {
          error && reject(error);
          var type = publisher.stream.videoType;
          state.addPublisher(type, publisher);
          resolve(publisher);
        });
      });
    }

    /**
     * Stop publishing a stream
     * @param {Object} publisher - An OpenTok publisher object
     */

  }, {
    key: 'unpublish',
    value: function unpublish(publisher) {
      var type = publisher.stream.videoType;
      var state = stateMap.get(this);
      this.session.unpublish(publisher);
      state.removePublisher(type, publisher);
    }

    /**
     * Subscribe to stream
     * @param {Object} stream
     * @param {String | Object} container - The id of the container or a reference to the element
     * @param {Object} [properties]
     * @param {Array | Object} [eventListeners] - An object (or array of objects) with
     *        eventName/callback k/v pairs
     * @returns {Promise} <resolve: empty, reject: Error>
     * https://tokbox.com/developer/sdks/js/reference/Session.html#subscribe
     */

  }, {
    key: 'subscribe',
    value: function subscribe(stream, container, properties, eventListeners) {
      var _this3 = this;

      var state = stateMap.get(this);
      return new Promise(function (resolve, reject) {
        var subscriber = _this3.session.subscribe(stream, container, properties, function (error) {
          if (error) {
            reject(error);
          } else {
            state.addSubscriber(subscriber);
            eventListeners && bindListeners(subscriber, _this3, eventListeners);
            resolve(subscriber);
          }
        });
      });
    }

    /**
     * Unsubscribe from a stream and update the state
     * @param {Object} subscriber - An OpenTok subscriber object
     * @returns {Promise} <resolve: empty>
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(subscriber) {
      var _this4 = this;

      var state = stateMap.get(this);
      return new Promise(function (resolve) {
        _this4.session.unsubscribe(subscriber);
        state.removeSubscriber(subscriber);
        resolve();
      });
    }

    /**
     * Connect to the OpenTok session
     * @param {Array | Object} [eventListeners] - An object (or array of objects) with
     *        eventName/callback k/v pairs
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'connect',
    value: function connect(eventListeners) {
      var _this5 = this;

      this.off();
      eventListeners && this.on(eventListeners);
      return new Promise(function (resolve, reject) {
        var token = _this5.credentials.token;

        _this5.session.connect(token, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Force a remote connection to leave the session
     * @param {Object} connection
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'forceDisconnect',
    value: function forceDisconnect(connection) {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6.session.forceDisconnect(connection, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Force the publisher of a stream to stop publishing the stream
     * @param {Object} stream
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'forceUnpublish',
    value: function forceUnpublish(stream) {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        _this7.session.forceUnpublish(stream, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Send a signal using the OpenTok signaling apiKey
     * @param {String} type
     * @param {*} signalData
     * @param {Object} [to] - An OpenTok connection object
     * @returns {Promise} <resolve: empty, reject: Error>
     * https://tokbox.com/developer/guides/signaling/js/
     */

  }, {
    key: 'signal',
    value: function signal(type, signalData, to) {
      var _this8 = this;

      var data = JSON.stringify(signalData);
      var signal = to ? { type: type, data: data, to: to } : { type: type, data: data };
      return new Promise(function (resolve, reject) {
        _this8.session.signal(signal, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Disconnect from the OpenTok session
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      this.session.disconnect();
      stateMap.get(this).reset();
    }

    /**
     * Return the state of the OpenTok session
     * @returns {Object} Streams, publishers, subscribers, and stream map
     */

  }, {
    key: 'state',
    value: function state() {
      return stateMap.get(this).all();
    }
  }]);

  return OpenTokSDK;
}();

if (global === window) {
  window.OpenTokSDK = OpenTokSDK;
}

module.exports = OpenTokSDK;