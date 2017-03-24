/* eslint-disable */
/* Let CRA handle linting for sample app */
import React, { Component } from 'react';
import Spinner from 'react-spinner';
import classNames from 'classnames';
import logo from './logo.svg';
import { OpenTokSDK } from './ot-core/core.js';
import credentials from './credentials.json';
import './App.css';
import 'opentok-solutions-css';


const otSDK = new OpenTokSDK(credentials);

const callProperties = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  showControls: false,
  style: {
    buttonDisplayMode: 'off'
  }
};



/**
 * Build classes for container elements based on state
 * @param {Object} state
 * @returns {Object}
 */
const containerClasses = (state) => {
  const { active, meta, localAudioEnabled, localVideoEnabled } = state;
  const sharingScreen = meta ? !!meta.publisher.screen : false;
  const viewingSharedScreen = meta ? meta.subscriber.screen : false;
  const activeCameraSubscribers = meta ? meta.subscriber.camera : 0;
  return {
    controlClass: classNames('App-control-container', { 'hidden': !active }),
    localAudioClass: classNames('ots-video-control circle audio', { 'muted': !localAudioEnabled }),
    localVideoClass: classNames('ots-video-control circle video', { 'muted': !localVideoEnabled }),
    cameraPublisherClass: classNames('video-container', { 'hidden': !active, 'small': !!activeCameraSubscribers || sharingScreen, 'left': sharingScreen || viewingSharedScreen }),
    screenPublisherClass: classNames('video-container', { 'hidden': !sharingScreen }),
    cameraSubscriberClass: classNames('video-container', { 'hidden': !activeCameraSubscribers },
      `active-${activeCameraSubscribers}`, { 'small': viewingSharedScreen || sharingScreen }
    ),
    screenSubscriberClass: classNames('video-container', { 'hidden': !viewingSharedScreen }),
  };
};

const connectingMask = () =>
  <div className="App-mask">
    <Spinner />
    <div className="message with-spinner">Connecting</div>
  </div>;

const startCallMask = start =>
  <div className="App-mask">
    <div className="message button clickable" onClick={start}>Click to Start Call</div>
  </div>;


class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      session: null,
      connected: false,
      active: false,
      publishers: null,
      subscribers: null,
      meta: null,
      streamMap: null,
      localPublisherId: null,
      localAudioEnabled: true,
      localVideoEnabled: true,
    };
    this.startCall = this.startCall.bind(this);
    this.toggleLocalAudio = this.toggleLocalAudio.bind(this);
    this.toggleLocalVideo = this.toggleLocalVideo.bind(this);
  }

  componentDidMount() {
    const session = otSDK.session;
    otSDK.connect().then(() => this.setState({ session, connected: true }));
  }

  startCall() {
    const { session, streamMap } = this.state;

    const subscribeToStream = stream => {
      if (streamMap && streamMap[stream.id]) { return; }
      const type = stream.videoType;
      otSDK.subscribe(stream, `${type}SubscriberContainer`, callProperties)
      .then(() => this.setState(otSDK.state()));
    };

    // Subscribe to initial streams
    session.streams.forEach(subscribeToStream);

    // Subscribe to new streams and update state when streams are destroyed
    otSDK.on({
      'streamCreated' : ({ stream }) => subscribeToStream(stream),
      'streamDestroyed': ({ stream }) => this.setState(otSDK.state())
    });

    // Publish local camera stream
    otSDK.publish('cameraPublisherContainer', callProperties)
    .then((publisher) => {
      this.setState(Object.assign({}, otSDK.state(), { localPublisherId: publisher.id }));
    }).catch(error => console.log(error));

    this.setState({ active: true });
  }

  toggleLocalAudio() {
    const { localPublisherId, publishers, localAudioEnabled } = this.state;
    const enabled = !localAudioEnabled;
    otSDK.enablePublisherAudio(enabled);
    this.setState({ localAudioEnabled: enabled });
  }

  toggleLocalVideo() {
    const { localPublisherId, publishers, localVideoEnabled } = this.state;
    const enabled = !localVideoEnabled;
    otSDK.enablePublisherVideo(enabled);

    this.setState({ localVideoEnabled: enabled });
  }

  render() {
    const { connected, active } = this.state;
    const {
      localAudioClass,
      localVideoClass,
      controlClass,
      cameraPublisherClass,
      screenPublisherClass,
      cameraSubscriberClass,
      screenSubscriberClass,
    } = containerClasses(this.state);

    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1>OpenTok Accelerator Core</h1>
        </div>
        <div className="App-main">
          <div id="controls" className={controlClass}>
            <div className={localAudioClass} onClick={this.toggleLocalAudio}></div>
            <div className={localVideoClass} onClick={this.toggleLocalVideo}></div>
          </div>
          <div className="App-video-container">
            { !connected && connectingMask() }
            { connected && !active && startCallMask(this.startCall)}
            <div id="cameraPublisherContainer" className={cameraPublisherClass}></div>
            <div id="screenPublisherContainer" className={screenPublisherClass}></div>
            <div id="cameraSubscriberContainer" className={cameraSubscriberClass}></div>
            <div id="screenSubscriberContainer" className={screenSubscriberClass}></div>
          </div>
          <div id="chat" className="App-chat-container"></div>
        </div>
      </div>
    );
  }
}

export default App;
