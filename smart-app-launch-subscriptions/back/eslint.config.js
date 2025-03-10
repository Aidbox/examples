const js = require('@eslint/js');
const globals = require('globals');
const parser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.node,
      parser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      indent: ['error', 2],
      semi: ['error', 'never'],
      quotes: ['error', 'single', { avoidEscape: true }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]