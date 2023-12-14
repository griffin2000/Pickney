
const path = require('path');

module.exports = {
  mode: 'development',


  entry: {
    index: './src/index.js',
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/dist'
  },

  externals: {
    fs: 'fs',
    crypto: 'crypto',
    path: 'path'
  },
  devtool: 'inline-source-map',
  plugins: [],
  module: {
    noParse: /wasm/,
  }
};