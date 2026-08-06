import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Replaces eslint-config-react-app, the last piece of Create React App left
// after the Vite migration. That preset pinned the ESLint version for the whole
// project and pulled in a jest configuration for a test runner this repo does
// not use — vitest has been the runner for a while.
//
// Deliberately close to what the preset actually gave us rather than a fresh
// opinion: the rules that were earning their keep are React's hooks rules
// (exhaustive-deps in particular, which the codebase answers with considered
// eslint-disable comments rather than by ignoring it) and unused-variable
// reporting. Everything here is a warning for the same reason it was before —
// lint runs advisory in this project, and a failing exit code would be a new
// policy, not a migration.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Was a warning under the old preset and is worth keeping as one: the
      // codebase has real cases where a dependency is deliberately omitted,
      // each carrying a comment saying why.
      'react-hooks/exhaustive-deps': 'warn',
      // args: 'none' matches what the old preset did, and it matters here: the
      // Tool interface fixes every handler's signature, so a tool that ignores
      // the event still has to declare it. Reporting those would be 47 warnings
      // about correctly-implemented interfaces.
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-useless-concat': 'warn',
      // tsc --noEmit is the type authority here (strict is off deliberately —
      // see tsconfig.json), so these type-flavored rules would only add noise
      // the compiler has already decided not to make an issue of.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // Reported as errors by default, which would change lint from advisory
      // to blocking. Same information, same severity as before.
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-empty': 'warn',
    },
  },
  // Formatting belongs to Prettier (.prettierrc.json); last, so it wins.
  prettier
);
