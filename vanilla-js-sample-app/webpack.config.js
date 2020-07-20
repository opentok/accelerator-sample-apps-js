const path = require('path');

module.exports = {
  entry: './src/app.js',
  mode:'development',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'public/js')
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
      }
    }]
  },
};
