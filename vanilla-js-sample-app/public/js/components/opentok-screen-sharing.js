/* global chrome OT ScreenSharingAccPack OTKAnalytics define */
(function () {

  /** Include external dependencies */
  var _;
  var $;
  var OTKAnalytics;

  if (typeof module === 'object' && typeof module.exports === 'object') {
    /* eslint-disable import/no-unresolved */
    _ = require('underscore');
    $ = require('jquery');
    OTKAnalytics = require('opentok-solutions-logging');
    /* eslint-enable import/no-unresolved */
  } else {
    _ = this._;
    $ = this.$;
    OTKAnalytics = this.OTKAnalytics;
  }

  /** Private Variables*/
  var _this; // Reference to instance of ScreenSharingAccPack
  var _active; // Currently sharing screen?
  var _accPack; // Common layer API
  var _session; // OpenTok session

  var _screenSharingControl = [
    '<div class="ots-video-control circle share-screen" id="startScreenSharing"></div>'
  ].join('\n');

  var _screenSharingView = [
    '<div class="hidden" id="screenShareView">',
    '<div class="ots-feed-main-video">',
    '<div class="ots-feed-holder" id="videoHolderScreenShare"></div>',
    '<div class="ots-feed-mask"></div>',
    '<img src="https://assets.tokbox.com/solutions/images/widget-video-mask.png"/>',
    '</div>',
    '<div class="ots-feed-call-controls" id="feedControlsFromScreen">',
    '<button class="ots-icon-screen active hidden" id="endScreenShareBtn"></button>',
    '</div>',
    '</div>'
  ].join('\n');

  var _screenDialogsExtensions = [
    /* eslint-disable max-len */
    '<div id="dialog-form-chrome" class="ots-ss-modal" style="display: none;">',
    '<div class="ots-modal-body">',
    '<div class="ots-modal-title with-icon">',
    '<i class="ots-icon-share-large"></i>',
    '<span>Screen Share<br/>Extension Installation</span>',
    '</div>',
    '<p>You need a Chrome extension to share your screen. Install Screensharing Extension. Once you have installed, please, click the share screen button again.</p>',
    '<button id="btn-install-plugin-chrome" class="ots-btn-install">Accept</button>',
    '<button id="btn-cancel-plugin-chrome" class="ots-cancel-btn-install"></button>',
    '</div>',
    '</div>',
    '<div id="dialog-form-ff" class="ots-ss-modal" style="display: none;">',
    '<div class="ots-modal-body">',
    '<div class="ots-modal-title with-icon">',
    '<i class="ots-icon-share-large"></i>',
    '<span>Screen Share<br/>Extension Installation</span>',
    '</div>',
    '<p>You need a Firefox extension to share your screen. Install Screensharing Extension. Once you have installed, refresh your browser and click the share screen button again.</p>',
    '<a href="#" id="btn-install-plugin-ff" class="ots-btn-install">Install extension</a>',
    '<a href="#" id="btn-cancel-plugin-ff" class="ots-cancel-btn-install"></a>',
    '</div>',
    '</div>'
    /* eslint-enable max-len */
  ].join('\n');

  /** Private Methods */

  /** Analytics */
  var _otkanalytics;

  // vars for the analytics logs. Internal use
  var _logEventData = {
    clientVersion: 'js-vsol-1.0.0',
    componentId: 'screenSharingAccPack',
    name: 'guidScreensharingAccPack',
    actionInitialize: 'Init',
    actionStart: 'Start',
    actionEnd: 'End',
    enableAnnotations: 'EnableAnnotations',
    disableAnnotations: 'DisableAnnotations',
    enableAudioScreenSharing: 'EnableAudioScreenSharing',
    disableAudioScreenSharing: 'DisableAudioScreenSharing',
    variationAttempt: 'Attempt',
    variationError: 'Failure',
    variationSuccess: 'Success',
  };

  var _logAnalytics = function () {

    // init the analytics logs
    var _source = window.location.href;

    var otkanalyticsData = {
      clientVersion: _logEventData.clientVersion,
      source: _source,
      componentId: _logEventData.componentId,
      name: _logEventData.name
    };

    _otkanalytics = new OTKAnalytics(otkanalyticsData);

    var sessionInfo = {
      sessionId: _session.id,
      connectionId: _session.connection.connectionId,
      partnerId: _session.apiKey
    };

    _otkanalytics.addSessionInfo(sessionInfo);

  };

  var _log = function (action, variation) {

    var data = {
      action: action,
      variation: variation
    };
    _otkanalytics.logEvent(data);
  };

  var _defaultScreenProperties = {
    insertMode: 'append',
    width: '100%',
    height: '100%',
    showControls: false,
    style: {
      buttonDisplayMode: 'off',
    },
    videoSource: 'window',
  };

  var _setupUI = function (parent) {
    $('body').append(_screenDialogsExtensions);
    $(_this.controlsContainer).append(_screenSharingControl);
    $(parent).append(_screenSharingView);
  };

  var _toggleScreenSharingButton = function (show) {
    $('#startScreenSharing')[show ? 'show' : 'hide']();
  };

  // Trigger event via common layer API
  var _triggerEvent = function (event, data) {
    if (_accPack) {
      _accPack.triggerEvent(event, data);
    }
  };

  /**
   * Create a publisher for the screen.  If we're using annotation, we first need
   * to create the annotion window and get a reference to its annotation container
   * element so that we can pass it to the initPublisher function.
   * @returns {promise} < Resolve: [Object] Container element for annotation in external window >
   */
  var _initPublisher = function () {

    var createPublisher = function (publisherDiv) {

      var innerDeferred = $.Deferred();

      var container = publisherDiv || _this.screenSharingContainer;
      var properties =
        _this.localScreenProperties ||
        _this.localScreenProperties ||
        _defaultScreenProperties;

      _this.publisher = OT.initPublisher(container, properties, function (error) {
        if (error) {
          _triggerEvent('screenSharingError', error);
          innerDeferred.reject(_.extend(_.omit(error, 'messsage'), {
            message: 'Error starting the screen sharing',
          }));
        } else {
          innerDeferred.resolve();
        }
      });

      return innerDeferred.promise();
    };

    var outerDeferred = $.Deferred();

    if (_this.annotation && _this.externalWindow) {
      _log(_logEventData.enableAnnotations, _logEventData.variationSuccess);

      _accPack.setupExternalAnnotation()
        .then(function (annotationWindow) {
          _this.annotationWindow = annotationWindow || null;
          var annotationElements = annotationWindow.createContainerElements();
          createPublisher(annotationElements.publisher)
            .then(function () {
              outerDeferred.resolve(annotationElements.annotation);
            });

        });
    } else {

      createPublisher()
        .then(function () {
          outerDeferred.resolve();
        });

    }

    return outerDeferred.promise();
  };


  /**
   * Start publishing the screen
   * @param annotationContainer
   */
  var _publish = function (annotationContainer) {

    _session.publish(_this.publisher, function (error) {
      if (error) {

        // Let's write our own error message
        var customError = _.omit(error, 'message');

        if (error.code === 1500 && navigator.userAgent.indexOf('Firefox') !== -1) {
          $('#dialog-form-ff').toggle();
        } else {

          var errorMessage;

          if (error.code === 1010) {
            errorMessage = 'Check your network connection';
          } else {
            errorMessage = 'Error sharing the screen';
          }

          customError.message = errorMessage;
          _triggerEvent('screenSharingError', customError);
          _log(_logEventData.actionStart, _logEventData.variationError);
        }
      } else {
        if (_this.annotation && _this.externalWindow) {
          _accPack.linkAnnotation(_this.publisher, annotationContainer, _this.annotationWindow);
          _log(_logEventData.actionInitialize, _logEventData.variationSuccess);
        }
        _active = true;
        _triggerEvent('startScreenSharing', _this.publisher);
        _log(_logEventData.actionStart, _logEventData.variationSuccess);
      }
    });

  };

  /**
   * Stop publishing the screen
   */
  var _stopPublishing = function () {
    _session.unpublish(_this.publisher);
  };

  /** Public Methods */

  var extensionAvailable = function () {

    var deferred = $.Deferred();

    if (window.location.protocol === 'http:' && !_this.dev) {
      alert("Screensharing only works under 'https', please add 'https://' in front of your debugger url.");
      deferred.reject('https required');
    }

    OT.checkScreenSharingCapability(function (response) {
      if (!response.supported || !response.extensionRegistered) {
        if (OT.$.browser() === 'Firefox' && response.extensionInstalled) {
          deferred.resolve();
        } else if (OT.$.browser() === 'Firefox' && !response.extensionInstalled) {
          $('#dialog-form-ff').toggle();
          deferred.reject('screensharing extension not installed');
        } else {
          alert('This browser does not support screen sharing! Please use Chrome, Firefox or IE!');
          deferred.reject('browser support not available');
        }
      } else if (!response.extensionInstalled) {
        $('#dialog-form-chrome').toggle();
        deferred.reject('screensharing extension not installed');
      } else {
        deferred.resolve();
      }
    });

    return deferred.promise();

  };

  var start = function () {
    _log(_logEventData.actionStart, _logEventData.variationAttempt);
    extensionAvailable(_this.extensionID, _this.extensionPathFF)
      .then(_initPublisher)
      .then(_publish)
      .fail(function (error) {
        console.log('Error starting screensharing: ', error);
        _log(_logEventData.actionStart, _logEventData.variationError);
      });
  };

  var end = function (callEnded) {
    _stopPublishing();
    _active = false;
    if (callEnded) {
      _toggleScreenSharingButton(false);
    }
    _triggerEvent('endScreenSharing', _this.publisher);
    _log(_logEventData.actionEnd, _logEventData.variationSuccess);
  };

  /** Events */

  var _registerEvents = function () {

    if (!_accPack) {
      return;
    }

    var events = ['startScreenSharing', 'endScreenSharing', 'screenSharingError'];
    _accPack.registerEvents(events);
  };

  var _addScreenSharingListeners = function () {

    var startOrEnd = _.throttle(function () {
      !!_active ? end() : start();
    }, 750);

    $('#startScreenSharing').on('click', startOrEnd);

    /** Handlers for screensharing extension modal */
    $('#btn-install-plugin-chrome').on('click', function () {
      chrome.webstore.install(['https://chrome.google.com/webstore/detail/', _this.extensionID].join(''),
        function (success) {
          console.log('success', success);
        },
        function (error) {
          console.log('error', error);
        });
      $('#dialog-form-chrome').toggle();
    });

    $('#btn-cancel-plugin-chrome').on('click', function () {
      $('#dialog-form-chrome').toggle();
    });

    $('#btn-install-plugin-ff').prop('href', _this.extensionPathFF);

    $('#btn-install-plugin-ff').on('click', function () {
      $('#dialog-form-ff').toggle();
    });

    $('#btn-cancel-plugin-ff').on('click', function () {
      $('#dialog-form-ff').toggle();
    });

    if (!!_accPack) {

      _accPack.registerEventListener('startCall', function () {
        _toggleScreenSharingButton(true);
      });

      _accPack.registerEventListener('endCall', function () {
        if (_active) {
          end(true);
        } else {
          _toggleScreenSharingButton(false);
        }
      });

      _accPack.registerEventListener('annotationWindowClosed', function () {
        end();
      });
    }

  };

  var _validateExtension = function (extensionID) {

    if (OT.$.browser() === 'Chrome') {
      if (!extensionID || !extensionID.length) {
        throw new Error('Error starting the screensharing. Chrome extensionID required');
      } else {
        $('<link/>', {
          rel: 'chrome-webstore-item',
          href: ['https://chrome.google.com/webstore/detail/', extensionID].join('')
        }).appendTo('head');

        OT.registerScreenSharingExtension('chrome', extensionID, 2);
      }
    }

  };

  var _validateOptions = function (options) {

    if (!_.property('session', options)) {
      throw new Error('Screen Share Acc Pack requires an OpenTok session');
    }

    _session = _.property('session')(options);
    _accPack = _.property('accPack')(options);

    _validateExtension(_.property('extensionID')(options), _.property('extensionPathFF')(options));
  };

  /**
   * @constructor
   * Represents a screensharing component
   * @param {object} options
   * @param {string} options.session
   * @param {object} [options.accPack]
   * @param {string} [options.extensionID]
   * @param {string} [options.extentionPathFF]
   * @param {string} [options.screensharingParent]
   */
  var ScreenSharingAccPack = function (options) {

    _this = this;

    // Check for required options
    _validateOptions(options);

    // Extend our instance
    var optionsProps = [
      'annotation',
      'externalWindow',
      'extensionURL',
      'extensionID',
      'extensionPathFF',
      'screenSharingContainer',
      'screenSharingParent',
      'controlsContainer',
      'screenProperties',
      'localScreenProperties',
      'dev',
    ];


    _.extend(_this, _.defaults(_.pick(options, optionsProps), {
      screenSharingParent: '#videoContainer',
      screenSharingContainer: document.getElementById('videoHolderSharedScreen'),
      controlsContainer: '#feedControls',
    }));



    // Do UIy things
    _setupUI(_this.screensharingParent);
    _registerEvents();
    _addScreenSharingListeners();

    // init analytics logs
    _logAnalytics();
    _log(_logEventData.actionInitialize, _logEventData.variationSuccess);
  };

  ScreenSharingAccPack.prototype = {
    constructor: ScreenSharingAccPack,
    extensionAvailable: extensionAvailable,
    start: start,
    end: end
  };

  if (typeof exports === 'object') {
    module.exports = ScreenSharingAccPack;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return ScreenSharingAccPack;
    });
  } else {
    this.ScreenSharingAccPack = ScreenSharingAccPack;
  }

}.call(this));
