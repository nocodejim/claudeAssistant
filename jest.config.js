module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'modules/*.js',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**'
  ]
};
