const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
    resolver: {
        blockList: [/.*\.cxx.*/, /.*\/android\/build\/.*/, /.*\/android\/app\/build\/.*/],
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);