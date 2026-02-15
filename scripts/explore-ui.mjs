import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const host = "127.0.0.1";
const port = 4173;
const baseUrl = `http://${host}:${port}/pomo/`;
const outputDir = join(process.cwd(), "artifacts", "screenshots", "explore");

const runPnpm = async (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`pnpm ${args.join(" ")} exited with ${code}`));
    });

    child.on("error", reject);
  });

const waitForServer = async (url) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Continue retrying.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview server did not start at ${url}`);
};

const startPreview = async () => {
  const preview = spawn("pnpm", ["preview", "--host", host, "--port", String(port)], {
    stdio: "ignore",
    env: process.env,
  });
  preview.unref();
  await waitForServer(baseUrl);
  return preview;
};

const main = async () => {
  mkdirSync(outputDir, { recursive: true });

  await runPnpm(["build"]);
  const preview = await startPreview();

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const room = `explore-${Date.now()}`;
    const sessionUrl = new URL(
      `session/${room}?transport=broadcast`,
      baseUrl
    ).toString();
    const page = await browser.newPage();
    await page.goto(sessionUrl, { waitUntil: "domcontentloaded" });

    await page.waitForSelector('[data-testid="start-hosting"]', { timeout: 12_000 });
    await page.screenshot({
      path: join(outputDir, "session-entry.png"),
      fullPage: true,
    });
    await page.getByTestId("start-hosting").click();
    await page.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });

    await page.getByTestId("remaining-minutes").fill("0");
    await page.getByTestId("remaining-seconds").fill("3");
    await page.getByTestId("apply-remaining").click();
    await page.getByTestId("control-start").click();

    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="timer-phase"]')
          ?.textContent?.includes("Short Break") ?? false,
      { timeout: 10_000 }
    );

    await page.screenshot({
      path: join(outputDir, "phase-transition.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await browser.close();
    if (!preview.killed) {
      preview.kill("SIGTERM");
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
