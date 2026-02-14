import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import puppeteer, { type Browser, type Page } from "puppeteer";

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}/pomo/`;
const SCREENSHOT_DIR = join(process.cwd(), "artifacts", "screenshots", "e2e");

let browser: Browser | null = null;
let previewProcess: ChildProcess | null = null;

const runPnpm = async (args: string[]): Promise<void> =>
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
      reject(new Error(`pnpm ${args.join(" ")} failed with exit code ${code}`));
    });

    child.on("error", reject);
  });

const waitForServer = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep trying until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for preview server at ${url}`);
};

const startPreview = async (): Promise<void> => {
  previewProcess = spawn("pnpm", ["preview", "--host", HOST, "--port", String(PORT)], {
    stdio: "inherit",
    env: process.env,
  });

  await waitForServer(BASE_URL);
};

const stopPreview = (): void => {
  if (!previewProcess) {
    return;
  }

  previewProcess.kill("SIGTERM");
  previewProcess = null;
};

const clearAndType = async (
  page: Page,
  selector: string,
  value: string
): Promise<void> => {
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
};

const screenshot = async (page: Page, name: string): Promise<void> => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
};

describe("session e2e", () => {
  beforeAll(async () => {
    await runPnpm(["build"]);
    await startPreview();
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }, 120_000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
    stopPreview();
  });

  it("transitions from work to short break without stalling", async () => {
    const room = `phase-${Date.now()}`;
    const page = await browser!.newPage();
    const sessionUrl = new URL(
      `session/${room}?transport=broadcast`,
      BASE_URL
    ).toString();

    await page.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="start-hosting"]', { timeout: 12_000 });
    await page.click('[data-testid="start-hosting"]');
    await page.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });

    await clearAndType(page, '[data-testid="remaining-minutes"]', "0");
    await clearAndType(page, '[data-testid="remaining-seconds"]', "3");
    await page.click('[data-testid="apply-remaining"]');
    await page.click('[data-testid="control-start"]');

    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="timer-phase"]')
          ?.textContent?.includes("Short Break") ?? false,
      { timeout: 10_000 }
    );

    const phaseText =
      (await page.$eval(
        '[data-testid="timer-phase"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    expect(phaseText).toContain("Short Break");

    await screenshot(page, "phase-transition");
    await page.close();
  });

  it("synchronizes timer updates across two room participants", async () => {
    const room = `sync-${Date.now()}`;
    const hostPage = await browser!.newPage();
    const clientPage = await browser!.newPage();
    const sessionUrl = new URL(
      `session/${room}?transport=broadcast`,
      BASE_URL
    ).toString();

    await hostPage.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await hostPage.waitForSelector('[data-testid="start-hosting"]', {
      timeout: 12_000,
    });
    await hostPage.click('[data-testid="start-hosting"]');
    await hostPage.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });

    await clientPage.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await clientPage.waitForSelector('[data-testid="timer-shell"]', {
      timeout: 12_000,
    });

    await clearAndType(hostPage, '[data-testid="remaining-minutes"]', "0");
    await clearAndType(hostPage, '[data-testid="remaining-seconds"]', "5");
    await hostPage.click('[data-testid="apply-remaining"]');
    await clientPage.waitForFunction(
      () => {
        const text =
          document.querySelector('[data-testid="timer-display"]')?.textContent ?? "";
        return text.trim() === "00:05";
      },
      { timeout: 10_000 }
    );

    await hostPage.click('[data-testid="control-start"]');

    await clientPage.waitForFunction(
      () => {
        const text =
          document.querySelector('[data-testid="timer-display"]')?.textContent ?? "";
        return /^00:0[0-4]$/.test(text.trim());
      },
      { timeout: 10_000 }
    );

    await screenshot(hostPage, "sync-host");
  }, 45_000);
});
