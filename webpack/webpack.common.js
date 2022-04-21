const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');

const browser = process.env.BROWSER;
const BUILD_DIR_NAME = 'dist';
const SRC_DIR_NAME = 'src';

module.exports = {
  entry: {
    popup: path.join(__dirname, `../${SRC_DIR_NAME}/popup.ts`),
    options: path.join(__dirname, `../${SRC_DIR_NAME}/options.ts`),
    background: path.join(__dirname, `../${SRC_DIR_NAME}/background/${browser}/background.ts`),
  },
  output: {
    path: path.join(__dirname, `../${BUILD_DIR_NAME}`),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        // required to prevent errors from Svelte on Webpack 5+
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      }
    ],
  },
  resolve: {
    alias: {
      svelte: path.dirname(require.resolve('svelte/package.json'))
    },
    extensions: ['.mjs', '.js', '.ts', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [
        { from: './images', to: `../${BUILD_DIR_NAME}/images`, context: 'public' },
        { from: './popup.html', to: `../${BUILD_DIR_NAME}/popup.html`, context: 'public' },
        { from: './options.html', to: `../${BUILD_DIR_NAME}/options.html`, context: 'public' },
        { from: `${browser}_manifest.json`, to: `../${BUILD_DIR_NAME}/manifest.json`, context: 'public' },

        // Copy licenses to build directory
        { from: './LICENSES', to: `../${BUILD_DIR_NAME}/LICENSES`, context: './' },
        { from: './LICENSE.md', to: `../${BUILD_DIR_NAME}`, context: './' }
      ],
    }),
    new DefinePlugin({
      "TESTNET_ID": "'0.0.11974136'",
      "MAINNET_ID": "'0.0.807855'"
    })
  ],
};