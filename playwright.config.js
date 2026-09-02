const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 150000,
  expect: {
    timeout: 15000,
  },
  use: {
    channel: "chrome",
    baseURL: "http://127.0.0.1:8766",
    trace: "retain-on-failure",
  },
  webServer: {
    command: 'python -m http.server 8766 --bind 127.0.0.1',
    url: "http://127.0.0.1:8766",
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
