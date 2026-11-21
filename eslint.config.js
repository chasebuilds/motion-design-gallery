import globals from 'globals';
import html from 'eslint-plugin-html';

export default [
  { ignores: ['node_modules/**', 'docs/**'] },
  {
    files: ['**/*.js', '**/*.html'],
    plugins: { html },
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: globals.browser },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'prefer-const': 'error',
      eqeqeq: 'error',
    },
  },
  { files: ['eslint.config.js'], languageOptions: { sourceType: 'module', globals: globals.node } },
];
