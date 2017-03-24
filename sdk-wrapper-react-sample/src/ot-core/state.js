'use strict';

var _require = require('./util'),
    pathOr = _require.pathOr;

/**
 * Internal variables
 */
// Map publisher ids to publisher objects


var publishers = {
  camera: {},
  screen: {}
};

// Map subscriber id to subscriber objects
var subscribers = {
  camera: {},
  screen: {},
  sip: {}
};

// Map stream ids to stream objects
var streams = {};

// Map stream ids to subscriber/publisher ids
var streamMap = {};

var session = null;
var credentials = null;
var options = null;

/**
 * Internal methods
 */

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
var pubSubCount = function pubSubCount() {
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
  }, { camera: 0, screen: 0, sip: 0, total: 0 });
  /* eslint-enable no-param-reassign */
  return { publisher: pubs, subscriber: subs };
};

/**
 * Returns the current publishers and subscribers, along with a count of each
 * @returns {Object}
 */
var getPubSub = function getPubSub() {
  return { publishers: publishers, subscribers: subscribers, meta: pubSubCount() };
};

/**
 * Get streams, streamMap, publishers, and subscribers
 * @return {Object}
 */
var all = function all() {
  return Object.assign({}, { streams: streams, streamMap: streamMap }, getPubSub());
};

/**
 * Get the current OpenTok session
 * @returns {Object}
 */
var getSession = function getSession() {
  return session;
};

/**
 * Set the current OpenTok session
 * @param {Object} otSession
 */
var setSession = function setSession(otSession) {
  session = otSession;
};

/**
 * Get the current OpenTok credentials
 * @returns {Object}
 */
var getCredentials = function getCredentials() {
  return credentials;
};

/**
 * Set the current OpenTok credentials
 * @param {Object} otCredentials
 */
var setCredentials = function setCredentials(otCredentials) {
  credentials = otCredentials;
};

/**
 * Get the options defined for core
 * @returns {Object}
 */
var getOptions = function getOptions() {
  return options;
};

/**
 * Set the options defined for core
 * @param {Object} otOptions
 */
var setOptions = function setOptions(otOptions) {
  options = otOptions;
};

/**
 * Add a stream to state
 * @param {Object} stream - An OpenTok stream object
 */
var addStream = function addStream(stream) {
  streams[stream.id] = stream;
};

/**
 * Remove a stream from state and any associated subscribers
 * @param {Object} stream - An OpenTok stream object
 */
var removeStream = function removeStream(stream) {
  var type = pathOr('sip', 'videoType', stream);
  var subscriberId = streamMap[stream.id];
  delete streamMap[stream.id];
  delete subscribers[type][subscriberId];
  delete streams[stream.id];
};

/**
 * Get all remote streams
 * @returns {Object}
 */
var getStreams = function getStreams() {
  return streams;
};

/**
 * Get the map of stream ids to publisher/subscriber ids
 * @returns {Object}
 */
var getStreamMap = function getStreamMap() {
  return streamMap;
};

/**
 * Add a publisher to state
 * @param {String} type - 'camera' or 'screen'
 * @param {Object} publisher - The OpenTok publisher object
 */
var addPublisher = function addPublisher(type, publisher) {
  streamMap[publisher.streamId] = publisher.id;
  publishers[type][publisher.id] = publisher;
};

/**
 * Remove a publisher from state
 * @param {String} type - 'camera' or 'screen'
 * @param {Object} publisher - The OpenTok publisher object
 */
var removePublisher = function removePublisher(type, publisher) {
  var id = publisher.id || streamMap[publisher.streamId];
  delete publishers[type][id];
  delete streamMap[publisher.streamId];
};

/**
 * Remove all publishers from state
 */
var removeAllPublishers = function removeAllPublishers() {
  ['camera', 'screen'].forEach(function (type) {
    Object.values(publishers[type]).forEach(function (publisher) {
      removePublisher(type, publisher);
    });
  });
};

/**
 * Add a subscriber to state
 * @param {Object} - An OpenTok subscriber object
 */
var addSubscriber = function addSubscriber(subscriber) {
  var streamId = subscriber.stream.id;
  var type = pathOr('sip', 'stream.videoType', subscriber);
  subscribers[type][subscriber.id] = subscriber;
  streamMap[streamId] = subscriber.id;
};

/**
 * Remove a publisher from state
 * @param {String} type - 'camera' or 'screen'
 * @param {Object} subscriber - The OpenTok subscriber object
 */
var removeSubscriber = function removeSubscriber(type, subscriber) {
  var id = subscriber.id || streamMap[subscriber.streamId];
  delete subscribers[type][id];
  delete streamMap[subscriber.streamId];
};

/**
 * Remove all subscribers from state
 */
var removeAllSubscribers = function removeAllSubscribers() {
  ['camera', 'screen', 'sip'].forEach(function (type) {
    Object.values(subscribers[type]).forEach(function (subscriber) {
      removeSubscriber(type, subscriber);
    });
  });
};

/**
 * Reset state
 */
var reset = function reset() {
  removeAllPublishers();
  removeAllSubscribers();
  [streams, streamMap].forEach(function (streamObj) {
    Object.keys(streamObj).forEach(function (streamId) {
      delete streamObj[streamId]; // eslint-disable-line no-param-reassign
    });
  });
};

/** Exports */
module.exports = {
  all: all,
  getSession: getSession,
  setSession: setSession,
  getCredentials: getCredentials,
  setCredentials: setCredentials,
  getOptions: getOptions,
  setOptions: setOptions,
  addStream: addStream,
  removeStream: removeStream,
  getStreams: getStreams,
  getStreamMap: getStreamMap,
  addPublisher: addPublisher,
  removePublisher: removePublisher,
  removeAllPublishers: removeAllPublishers,
  addSubscriber: addSubscriber,
  removeSubscriber: removeSubscriber,
  removeAllSubscribers: removeAllSubscribers,
  getPubSub: getPubSub,
  reset: reset
};