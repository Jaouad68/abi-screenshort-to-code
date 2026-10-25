// Le contenu des parcours vit dans ../content (partagé avec le back-office) : Metro doit le voir.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../content')];

module.exports = config;
