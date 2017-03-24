"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = function () {
  function State() {
    _classCallCheck(this, State);

    this.publishers = {
      camera: {},
      screen: {}
    };

    this.subscribers = {
      camera: {},
      screen: {}
    };

    this.streams = {};

    // Map stream ids to subscriber/publisher ids
    this.streamMap = {};

    // OpenTok session
    this.session = null;

    // OpenTok credentials
    this.credentials = null;
  }

  // Get the current OpenTok session


  _createClass(State, [{
    key: "getSession",
    value: function getSession() {
      return this.session;
    }

    // Set the current OpenTok session

  }, {
    key: "setSession",
    value: function setSession(session) {
      this.session = session;
    }

    // Get the current OpenTok credentials

  }, {
    key: "getCredentials",
    value: function getCredentials() {
      return this.credentials;
    }
    // Set the current OpenTok credentials

  }, {
    key: "setCredentials",
    value: function setCredentials(credentials) {
      this.credentials = credentials;
    }

    /**
     * Returns the count of current publishers and subscribers by type
     * @retuns {Object}
     *    {
     *      publishers: {
     *        camera: 1,
     *        screen: 1,
     *        total: 2
     *      },
     *      subscribers: {
     *        camera: 3,
     *        screen: 1,
     *        total: 4
     *      }
     *   }
     */

  }, {
    key: "pubSubCount",
    value: function pubSubCount() {
      var publishers = this.publishers,
          subscribers = this.subscribers;
      /* eslint-disable no-param-reassign */

      var pubs = Object.keys(publishers).reduce(function (acc, source) {
        acc[source] = Object.keys(publishers[source]).length;
        acc.total += acc[source];
        return acc;
      }, { camera: 0, screen: 0, total: 0 });

      var subs = Object.keys(subscribers).reduce(function (acc, source) {
        acc[source] = Object.keys(subscribers[source]).length;
        acc.total += acc[source];
        return acc;
      }, { camera: 0, screen: 0, total: 0 });
      /* eslint-enable no-param-reassign */
      return { publisher: pubs, subscriber: subs };
    }

    /**
     * Returns the current publishers and subscribers, along with a count of each
     */

  }, {
    key: "getPubSub",
    value: function getPubSub() {
      var publishers = this.publishers,
          subscribers = this.subscribers;

      return { publishers: publishers, subscribers: subscribers, meta: this.pubSubCount() };
    }
  }, {
    key: "addPublisher",
    value: function addPublisher(type, publisher) {
      this.streamMap[publisher.streamId] = publisher.id;
      this.publishers[type][publisher.id] = publisher;
    }
  }, {
    key: "removePublisher",
    value: function removePublisher(type, publisher) {
      var id = publisher.id || this.streamMap[publisher.streamId];
      delete this.publishers[type][id];
    }
  }, {
    key: "removeAllPublishers",
    value: function removeAllPublishers() {
      this.publishers.camera = {};
      this.publishers.screen = {};
    }
  }, {
    key: "addSubscriber",
    value: function addSubscriber(subscriber) {
      var type = subscriber.stream.videoType;
      var streamId = subscriber.stream.id;
      this.subscribers[type][subscriber.id] = subscriber;
      this.streamMap[streamId] = subscriber.id;
    }
  }, {
    key: "removeSubscriber",
    value: function removeSubscriber() {
      var subscriber = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var stream = subscriber.stream;

      var type = stream && stream.videoType;
      delete this.subscribers[type][subscriber.id];
    }
  }, {
    key: "addStream",
    value: function addStream(stream) {
      this.streams[stream.id] = stream;
    }
  }, {
    key: "removeStream",
    value: function removeStream(stream) {
      var type = stream.videoType;
      var subscriberId = this.streamMap[stream.id];
      delete this.streamMap[stream.id];
      delete this.streams[stream.id];
      this.removeSubscriber(this.subscribers[type][subscriberId]);
    }
  }, {
    key: "getStreams",
    value: function getStreams() {
      return this.streams;
    }

    /** Reset streams, publishers, and subscribers */

  }, {
    key: "reset",
    value: function reset() {
      this.streams = {};
      this.streamMap = {};
      this.publishers = { camera: {}, screen: {} };
      this.subscribers = { camera: {}, screen: {} };
    }
  }, {
    key: "all",
    value: function all() {
      var streams = this.streams,
          streamMap = this.streamMap;

      return Object.assign({}, this.getPubSub(), { streams: streams, streamMap: streamMap });
    }
  }]);

  return State;
}();

module.exports = State;