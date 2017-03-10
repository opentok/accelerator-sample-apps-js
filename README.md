# OpenTok Accelerator Sample App for JavaScript React
## Quick start


[![GitHub release](https://img.shields.io/github/release/opentok/accelerator-sample-apps-js.svg)](./README.md)
[![license](https://img.shields.io/github/license/opentok/accelerator-sample-apps-js.svg)](./LICENSE)


###Configuration

This section shows you how to prepare and run the sample application. The app is built using the [Accelerator Core JS](https://github.com/opentok/accelerator-core-js) and the following accelerator packs:

 - [Text Chat](https://www.npmjs.com/package/opentok-text-chat)
 - [Screen Sharing](https://www.npmjs.com/package/opentok-screen-sharing)
 - [Annotation](https://www.npmjs.com/package/opentok-annotation)
### Configuring the app

Add a `config.json` file with your OpenTok credentials to the `src` directory:
```javascript
{
  "apiKey": "YOUR_API_KEY",
  "sessionId": "YOUR_SESSION_ID",
  "token": "YOUR_TOKEN"
}
```

### Deploying and running the app
This sample application was built with [Create React App](https://github.com/facebookincubator/create-react-app) and uses [webpack](https://webpack.github.io/) to transpile code.
```javascript
$ npm install
$ npm run start
```
