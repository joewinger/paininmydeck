import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'output/**',
      'playwright-report/**',
      'test-results/**',
      'worker-configuration.d.ts',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'info', 'warn'] }],
      'no-debugger': 'error',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Core control-flow analysis cannot see references made by compiled Vue
      // templates, so this rule reports script-setup bindings as dead stores.
      'no-useless-assignment': 'off',
    },
  },
  {
    files: ['worker/**/*.ts'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
);
