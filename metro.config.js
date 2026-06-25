// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

// Expo's default config already supports importing .json as source
// (it's in resolver.sourceExts), plus the full asset pipeline for fonts/images
// — e.g. the @expo/vector-icons .ttf files. Do NOT add 'json' to assetExts:
// that reclassifies JSON as a binary asset and breaks `import data from './x.json'`.
module.exports = getDefaultConfig(__dirname);
