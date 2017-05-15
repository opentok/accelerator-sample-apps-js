## JavaScript Sample Application

Add your OpenTok credentials to the `options` hash in  `app.js`:
```javascript
const options = {
credentials: {
  apiKey: "YOUR_API_KEY",
  sessionId: "YOUR_SESSION_ID",
  token: "YOUR_TOKEN"
},
...
```

To run:
```javascript
$ npm install
$ npm run build
$ node server.js
```
