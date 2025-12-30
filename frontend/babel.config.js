module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta for web compatibility
      ['transform-inline-environment-variables', {
        include: ['NODE_ENV']
      }],
    ],
  };
};
