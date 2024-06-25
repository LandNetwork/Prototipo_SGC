const path = require('path');

module.exports = {
  entry: './src/assets/js/components/custom/loader.js',
  output: {
    filename: 'loader_d.js',
    path: path.resolve(__dirname, 'src/assets/js/components/custom')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
