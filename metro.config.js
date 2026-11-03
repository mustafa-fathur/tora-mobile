// Metro is the JavaScript bundler Expo uses. NativeWind hooks into it to compile global.css.
// inlineRem: 16 matches React Native Reusables' setup (1rem = 16px, like the web).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
