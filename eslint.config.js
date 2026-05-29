// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.wrangler/**',
      '**/.output/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript (type-aware off by default; opt in per-package as needed)
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.es2023,
        ...globals.node,
      },
    },
    rules: {
      // CLAUDE.md §4: no implicit any, no @ts-ignore without justification
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': 'allow-with-description',
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 8,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Discourage interface for plain object shapes (§4)
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // General
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
    },
  },

  // Test files: relax a few rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Config files (allow CJS-ish things, default exports)
  {
    files: ['**/*.config.{js,ts,mjs,cjs}', '**/vite.config.*', '**/vitest.config.*'],
    rules: {
      'no-console': 'off',
    },
  },

  // Dev-only scripts (DB seeding, migration runners, helpers).
  // 単発で叩く Node スクリプトなので console.log で十分。
  {
    files: ['**/scripts/**/*.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },

  // React Hooks: Rules of Hooks をリント時に強制する。
  // useState / useEffect / useQuery 等を条件分岐や early return の後ろで
  // 呼ぶと「render ごとに hook 数が変わる」バグになり、本番でクラッシュする。
  // sprint.tsx / pbi.tsx 系で 1 回踏んだので CI で再発を止める。
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
