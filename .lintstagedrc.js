const path = require('path');

const config = {
  'apps/ui/**/*.{ts,tsx,json,css,md}': ['prettier --write'],
  'apps/backend/**/*.ts': ['prettier --write'],
};

module.exports = config;
