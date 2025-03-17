module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'riskDetails.js',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**'
  ],
  moduleNameMapper: {
    '^file://(.*)$': '<rootDir>/$1'
  }
};
