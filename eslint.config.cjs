const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'analisi/**',
      'node_modules/**',
      '_site/**',
      'test-results/**',
      'playwright-report/**',
      '.aws/**',
      '.codex/**',
      '.agents/**'
    ]
  },
  {
    files: ['navigation.js'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals: globals.browser },
    rules: js.configs.recommended.rules
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: js.configs.recommended.rules
  },
  {
    files: ['tests/**/*.cjs'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['tests/fixtures.cjs'],
    // Playwright requires a destructured fixture argument, even without dependencies.
    rules: { 'no-empty-pattern': 'off' }
  }
];
