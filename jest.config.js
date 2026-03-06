module.exports = {
  verbose: true,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '**/src/**/*.test.(ts|js)',
    '**/src/*.test.(ts|js)',
    '**/src/**/*.spec.(ts|js)',
    '**/src/*.spec.(ts|js)',
    '**/src/**/*.it.(ts|js)',
    '**/src/*.it.(ts|js)',
  ],
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['/dist/'],
  collectCoverage: true,
  collectCoverageFrom: ['**/src/**/*.{js,ts}', '!**/node_modules/**', '!**/vendor/**'],
  coverageReporters: ['lcov', 'text'],
  // For more info see https://jestjs.io/docs/configuration#coveragethreshold-object
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
