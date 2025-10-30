// ESLint flat config (v9+)
import js from '@eslint/js';
import security from 'eslint-plugin-security';

export default [
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      'build.js',
      '**/*.min.js'
    ]
  },
  js.configs.recommended,
  {
    plugins: { security },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // Browser env
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Map SDK globals
        google: 'readonly',
        mappls: 'readonly',
        Microsoft: 'readonly',
        H: 'readonly',
        atlas: 'readonly',
        ymaps: 'readonly',
        L: 'readonly',
        mapboxgl: 'readonly',
        tt: 'readonly'
      }
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Do not assign to innerHTML; use safe DOM operations.'
        }
      ],
      'no-unused-vars': ['warn', { 'args': 'none', 'varsIgnorePattern': '^_' }],
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off'
    }
  }
];


