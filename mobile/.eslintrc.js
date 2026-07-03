// Miamo Mobile — ESLint config (Expo SDK 52).
// Inherits eslint-config-expo. Mirrors the no-warnings-in-CI posture the
// web app has (see services/web/.eslintrc.json).
module.exports = {
  root: true,
  extends: ['expo'],
  rules: {
    'react-native/no-inline-styles': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'build/', 'dist/', '.expo/'],
};
