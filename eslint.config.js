import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // משתנה שלא בשימוש הוא בדרך כלל שארית מרפקטור, אבל _ מסמן התעלמות מכוונת
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // הוקים שיושבים ליד ה-Provider שלהם — דפוס מכוון ומקובל ב-React.
    // הכלל הזה נוגע רק לנוחות ה-hot reload בפיתוח, לא לנכונות הקוד.
    files: ['src/store.tsx', 'src/components/PwaPrompts.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // בקבצי בדיקה מותר להיות פחות מחמירים
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
