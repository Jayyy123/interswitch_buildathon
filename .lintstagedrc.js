const path = require('path');

/** @type {import('lint-staged').Config} */
const config = {
  'apps/ui/**/*.{ts,tsx}': [
    (files) => {
      const cwd = path.join(__dirname, 'apps/ui');
      const relative = files.map((f) => path.relative(cwd, f)).join(' ');
      return `pnpm --filter ui exec eslint --fix ${relative}`;
    },
  ],
  'apps/ui/**/*.{ts,tsx,json,css,md}': ['prettier --write'],
  'apps/backend/**/*.ts': ['prettier --write'],
};

module.exports = config;
