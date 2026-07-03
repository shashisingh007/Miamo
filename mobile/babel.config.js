// Miamo Mobile — Babel config (Expo SDK 52).
// Uses babel-preset-expo. The reanimated plugin MUST be last.
// Path aliases mirror tsconfig.json so `@/foo` etc. resolve at runtime too.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@lib': './src/lib',
            '@stores': './src/stores',
            '@hooks': './src/hooks',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
