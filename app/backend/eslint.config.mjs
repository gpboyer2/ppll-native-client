import js from '@eslint/js';
import nPlugin from 'eslint-plugin-n';

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '*.min.js',
      '.env',
      '.env.*',
      'eslint.config.mjs'
    ]
  },
  {
    plugins: {
      n: nPlugin
    },
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'commonjs',
      globals: {
        // Node.js 全局变量
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        exports: 'writable',
        global: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        // 定时器
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // 其他全局变量
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        // Sequelize
        Op: 'readonly',
        // 浏览器环境（部分代码可能在浏览器运行）
        navigator: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      // Node.js 相关规则
      'n/no-missing-require': 'error', // require 的文件必须存在（暂时关闭）
      'n/no-exports-assign': 'off', // 运行重新赋值 exports

      // 基础规则
      'indent': ['warn', 2, { 'SwitchCase': 1 }],
      'linebreak-style': 'off',
      'quotes': 'off',
      'semi': ['warn', 'always'],
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-undef': 'error',
      'no-empty': 'error',
      'no-unreachable': 'error',
      'no-useless-escape': 'off'
    }
  },
  {
    files: ['test/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        it: 'readonly'
      }
    }
  }
];
