## JavaScript Sample Application

Add your OpenTok credentials to the `options` hash in  the src/app.js file:

```javascript
const options = {
  credentials: {
    apiKey: 'YOUR_API_KEY',
    sessionId: 'YOUR_SESSION_ID',
    token: 'YOUR_TOKEN',
  },
  // ...
}
```

To run:

```javascript
$ npm install
$ npm run build
$ node server.js
```

The main JavaScript source file for the app is src/app.js. The build script uses
[webpack](https://webpack.js.org/) and [Babel](https://babeljs.io/) to transpile code
for Internet Explorer support.
