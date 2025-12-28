import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'

export default tseslint.config(
  { ignores: ['dist', 'wailsjs'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 关闭在 useEffect 中同步调用 setState 的警告
      'react-hooks/set-state-in-effect': 'off',
      // React 规则
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // TypeScript 规则
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // 通用规则
      'no-console': 'off',
      'no-debugger': 'warn',

      // 基础规则
      'indent': ['warn', 2, { 'SwitchCase': 1 }],
      'linebreak-style': 'off',
      'quotes': 'off',
      'semi': ['warn', 'always'],
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-undef': 'off',  // TypeScript 已经处理
      'no-empty': 'error',
      'no-unreachable': 'error',
      'no-useless-escape': 'off'
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // 配置文件使用 Node.js 环境
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
