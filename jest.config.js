module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/workflows/**/*.test.js',
  ],
  collectCoverageFrom: [
    '.github/workflows/**/*.yml',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  testTimeout: 10000,
  verbose: true,
};
