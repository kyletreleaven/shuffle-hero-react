const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure public path for GitHub Pages
config.transformer.publicPath = '/shuffle-hero-react';

module.exports = config;
