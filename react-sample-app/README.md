# OpenTok Accelerator Sample App for JavaScript React

## Quick start

This document shows you how to prepare and run the sample application. The app is built using [Accelerator Core JS](https://github.com/opentok/accelerator-core-js) and the following accelerator packs:

- [Text Chat](https://www.npmjs.com/package/opentok-text-chat)
- [Screen Sharing](https://www.npmjs.com/package/opentok-screen-sharing)
- [Annotation](https://www.npmjs.com/package/opentok-annotation)

### Configuration

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

---

*Looking for a sample in plain JavaScript? Click [here](https://github.com/opentok/accelerator-core-js/tree/master/vanilla-js-sample-app).*
