// Miamo Mobile — Detox E2E config.
// See tests/e2e/*.e2e.ts for specs.
// NOTE: iOS/Android build config assumes `pod install` (iOS) + Gradle sync
// have been run. In CI these run on macos-latest (iOS) and ubuntu-latest+
// macos-latest (Android) — see .github/workflows/mobile.yml.
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'tests/e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MiamoMobile.app',
      build:
        "xcodebuild -workspace ios/MiamoMobile.xcworkspace -scheme MiamoMobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..",
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
