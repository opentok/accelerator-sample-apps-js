var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/* global ArchivingAccPack define */
(function () {
  /** Include external dependencies */
  var $ = void 0;

  if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && _typeof(module.exports) === 'object') {
    /* eslint-disable import/no-unresolved */
    $ = require('jquery');
    /* eslint-enable import/no-unresolved */
  } else {
    $ = this.$;
  }

  var _startURL = void 0;
  var _stopURL = void 0;
  var _currentArchive = void 0;
  var _recording = false;
  var _controlAdded = false;
  var _accPack = void 0;
  var _session = void 0;

  var _triggerEvent = function _triggerEvent(event, data) {
    if (_accPack) {
      _accPack.triggerEvent(event, data);
    }
  };

  var _waitingModalTemplate = function _waitingModalTemplate() {
    return ['<div id="otsArchivingModal" class="ots-archiving-modal">', '<div class="modal-content">', '<div class="modal-header">', '<h2>Archive is being prepared</h2>', '<span id="closeArchiveModal" class="close-button"></span>', '</div>', '<div class="modal-info">', // eslint-disable-next-line max-len
    '<span class="message"> Your session archive file is now being prepared. You\'ll recieve a notification as soon as it\'s ready.  Please be patient, this won\'t take long.</span>', '</div>', '<div class="modal-buttons">', '<div id="closeArchiveModalBtn" class="btn ok" target="_blank">Ok, Thanks!</div>', '</div>', '</div>', '</div>'].join('\n');
  };

  var _readyModalTemplate = function _readyModalTemplate(archive) {
    var date = new Date(null);
    date.setSeconds(archive.duration);
    var duration = date.toISOString().substr(11, 8);
    var size = (archive.size / (1000 * 1000)).toString().slice(0, 5) + 'mb';
    return ['<div id="otsArchivingModal" class="ots-archiving-modal">', '<div class="modal-content">', '<div class="modal-header">', '<h2>Archive is ready</h2>', '<span id="closeArchiveModal" class="close-button"></span>', '</div>', '<div class="modal-info">', '<span class="archive-id">' + archive.id + '</span>', // eslint-disable-next-line max-len
    '<div class="archive-details">Archive details: ' + duration + ' / ' + size + '</div>', '</div>', '<div class="modal-buttons">', '<a href="' + archive.url + '" class="btn download" target="_blank">Download Archive</a>', '</div>', '</div>', '</div>'].join('\n');
  };

  /**
   * Displays a modal with the status of the archive.  If no archive object is passed,
   * the 'waiting' modal will be displayed.  If an archive object is passed, the 'ready'
   * modal will be displayed.
   * @param {Object} archive
   */
  var _displayModal = function _displayModal(archive) {
    // Clean up existing modal
    var existingModal = document.getElementById('otsArchivingModal');
    existingModal && existingModal.remove();

    var template = archive ? _readyModalTemplate(archive) : _waitingModalTemplate();
    var modalParent = document.querySelector('#otsWidget') || document.body;
    var el = document.createElement('div');
    el.innerHTML = template;

    var modal = el.firstChild;
    modalParent.appendChild(modal);

    var closeModal = document.getElementById('closeArchiveModal');
    var closeModalBtn = document.getElementById('closeArchiveModalBtn');

    closeModal.onclick = function () {
      return modal.remove();
    };
    if (closeModalBtn) {
      closeModalBtn.onclick = function () {
        return modal.remove();
      };
    }
  };

  var start = function start() {
    $.post(_startURL, { sessionId: _session.id }).then(function (archive) {
      _currentArchive = archive;
      _triggerEvent('startArchive', archive);
    }).fail(function (error) {
      _triggerEvent('archiveError', error);
    });
  };

  var stop = function stop() {
    _triggerEvent('stopArchive');
    _displayModal();
    $.post(_stopURL, { archiveId: _currentArchive.id }).then(function (data) {
      _displayModal(data);
      _triggerEvent('archiveReady', data);
    }).fail(function (error) {
      _triggerEvent('archiveError', error);
    });
  };

  var _appendControl = function _appendControl(container) {
    var feedControls = document.querySelector(container);

    // eslint-disable-next-line max-len
    var btn = '<div class="ots-video-control circle archiving enabled" id="enableArchiving"></div>';

    var el = document.createElement('div');
    el.innerHTML = btn;

    var enableArchiving = el.firstChild;

    feedControls.appendChild(enableArchiving);

    _controlAdded = true;

    enableArchiving.onclick = function () {
      if (_recording) {
        _recording = false;
        document.querySelector('#enableArchiving').classList.remove('active');
        stop();
      } else {
        _recording = true;
        document.querySelector('#enableArchiving').classList.add('active');
        start();
      }
    };
  };

  var _registerEvents = function _registerEvents() {
    var events = ['startArchive', 'stopArchive', 'archiveReady', 'archiveError'];
    _accPack.registerEvents(events);
  };

  var _addEventListeners = function _addEventListeners() {
    _accPack.registerEventListener('startCall', function () {
      if (_controlAdded) {
        document.getElementById('enableArchiving').classList.remove('ots-hidden');
      } else {
        _appendControl();
      }
    });

    _accPack.registerEventListener('endCall', function () {
      document.getElementById('enableArchiving').classList.add('ots-hidden');
    });
  };

  var _validateOptions = function _validateOptions(options) {
    var requiredOptions = ['session', 'startURL', 'stopURL'];

    requiredOptions.forEach(function (option) {
      if (!options[option]) {
        throw new Error(['OT: Archiving Accelerator Pack requires a', option].join(''));
      }
    });

    _session = options.session;
    _startURL = options.startURL;
    _stopURL = options.stopURL;
    _accPack = options.accPack;
  };

  var ArchivingAccPack = function ArchivingAccPack(options) {
    _validateOptions(options);

    var controlsContainer = options.controlsContainer || '#feedControls';
    _appendControl(controlsContainer);

    _registerEvents();
    _addEventListeners();
  };

  ArchivingAccPack.prototype = {
    constructor: ArchivingAccPack
  };

  if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
    module.exports = ArchivingAccPack;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return ArchivingAccPack;
    });
  } else {
    this.ArchivingAccPack = ArchivingAccPack;
  }
}).call(this);