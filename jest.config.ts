import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  // Ignore Playwright E2E tests — those run with `npm run test:e2e`
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    // Map the @/* alias from tsconfig to src/*
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default config;
