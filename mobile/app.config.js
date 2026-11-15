module.exports = ({ config }) => {
  const mode = process.env.EAS_BUILD_PROFILE === 'production' ? 'production' : 'development';
  const backgroundModes = new Set([...(config.ios?.infoPlist?.UIBackgroundModes || []), 'remote-notification']);

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        UIBackgroundModes: [...backgroundModes],
      },
      entitlements: {
        ...config.ios?.entitlements,
        'aps-environment': mode,
      },
    },
    android: {
      ...config.android,
      package: config.android?.package || 'com.pikselmutfak.fogo',
    },
    plugins: [
      ['onesignal-expo-plugin', { mode, disableLocation: true }],
      ...(config.plugins || []),
    ],
  };
};
