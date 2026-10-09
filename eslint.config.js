import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  { files: ['sw.js'], languageOptions: { globals: globals.serviceworker } },
  {
    files: ['js/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['tests/**/*.js', 'e2e/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'prefer-const': 'error',
    },
  },
];
