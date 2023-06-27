module.exports = {
    testEnvironment: "node",
    roots: ["./test"],
    testMatch: ["**/*.test.ts"],
    transform: {
      "^.+\\.tsx?$": "ts-jest",
    },
  };