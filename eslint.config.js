import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';

const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: {
      ...hooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  ...layers.map((layer, index) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...layers.slice(index + 1).map((upper) => ({
              group: [`@/${upper}`, `@/${upper}/**`],
              message: 'FSD: зависимости направлены только в нижние слои.',
            })),
            { group: ['@/*/*/*'], message: 'Используйте публичный API слайса (index.ts).' },
          ],
        },
      ],
    },
  })),
);
