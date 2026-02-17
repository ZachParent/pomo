import { defineConfig } from "@playwright/test";

const HOST = "127.0.0.1";
const PORT = 4173;
const ORIGIN = `http://${HOST}:${PORT}`;
const APP_URL = `${ORIGIN}/pomo`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 4,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `pnpm preview --host ${HOST} --port ${PORT}`,
    url: `${APP_URL}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
