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

const setInputValue = async (
  page: Page,
  selector: string,
  value: string
): Promise<void> => {
  await page.$eval(
    selector,
    (element, nextValue) => {
      const input = element as HTMLInputElement;
      input.value = nextValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value
  );
};

const forceClick = async (page: Page, selector: string): Promise<void> => {
  await page.$eval(selector, (element) => {
    (element as HTMLElement).click();
  });
};

const screenshot = async (page: Page, name: string): Promise<void> => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
};

const parseClockTextToSeconds = (value: string): number => {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return -1;
  }

  return Number(match[1]) * 60 + Number(match[2]);
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
    await forceClick(page, '[data-testid="start-hosting"]');
    await page.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });

    await setInputValue(page, '[data-testid="remaining-minutes"]', "0");
    await setInputValue(page, '[data-testid="remaining-seconds"]', "3");
    await forceClick(page, '[data-testid="apply-remaining"]');
    await forceClick(page, '[data-testid="control-start"]');

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
    await forceClick(hostPage, '[data-testid="start-hosting"]');
    await hostPage.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });

    await clientPage.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await clientPage.waitForSelector('[data-testid="timer-shell"]', {
      timeout: 12_000,
    });

    await setInputValue(hostPage, '[data-testid="remaining-minutes"]', "0");
    await setInputValue(hostPage, '[data-testid="remaining-seconds"]', "5");
    await forceClick(hostPage, '[data-testid="apply-remaining"]');
    await clientPage.waitForFunction(
      () => {
        const text =
          document.querySelector('[data-testid="timer-display"]')?.textContent ?? "";
        return text.trim() === "00:05";
      },
      { timeout: 10_000 }
    );

    await forceClick(hostPage, '[data-testid="control-start"]');

    await clientPage.waitForFunction(
      () => {
        const text =
          document.querySelector('[data-testid="timer-display"]')?.textContent ?? "";
        return /^00:0[0-4]$/.test(text.trim());
      },
      { timeout: 10_000 }
    );

    await screenshot(hostPage, "sync-host");
    await hostPage.close();
    await clientPage.close();
  }, 45_000);

  it("requires confirmation before applying duration changes that shorten an active phase", async () => {
    const room = `duration-${Date.now()}`;
    const page = await browser!.newPage();
    const sessionUrl = new URL(
      `session/${room}?transport=broadcast`,
      BASE_URL
    ).toString();

    await page.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="start-hosting"]', { timeout: 12_000 });
    await forceClick(page, '[data-testid="start-hosting"]');
    await page.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });
    await forceClick(page, '[data-testid="control-start"]');

    await setInputValue(page, "#work-minutes", "1");

    await forceClick(page, '[data-testid="apply-durations"]');
    await page.waitForSelector('[data-testid="schedule-warning"]', { timeout: 10_000 });

    const warningText =
      (await page.$eval(
        '[data-testid="schedule-warning"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    expect(warningText).toContain("Submit again to confirm");

    const displayAfterFirstSubmit =
      (await page.$eval(
        '[data-testid="timer-display"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    expect(parseClockTextToSeconds(displayAfterFirstSubmit)).toBeGreaterThan(60);

    await forceClick(page, '[data-testid="apply-durations"]');
    await page.waitForFunction(
      () => {
        const display =
          document.querySelector('[data-testid="timer-display"]')?.textContent ?? "";
        const match = /^(\d+):([0-5]\d)$/.exec(display.trim());
        if (!match) {
          return false;
        }

        const seconds = Number(match[1]) * 60 + Number(match[2]);
        const warningVisible = Boolean(
          document.querySelector('[data-testid="schedule-warning"]')
        );
        return seconds <= 60 && !warningVisible;
      },
      { timeout: 10_000 }
    );

    const displayAfterSecondSubmit =
      (await page.$eval(
        '[data-testid="timer-display"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    expect(parseClockTextToSeconds(displayAfterSecondSubmit)).toBeLessThanOrEqual(60);
    expect(await page.$('[data-testid="schedule-warning"]')).toBeNull();

    await page.close();
  }, 30_000);

  it("synchronizes room theme display name, emoji, and accent across participants", async () => {
    const room = `theme-${Date.now()}`;
    const hostPage = await browser!.newPage();
    const clientPage = await browser!.newPage();
    const sessionUrl = new URL(
      `session/${room}?transport=broadcast`,
      BASE_URL
    ).toString();
    const updatedDisplayName = "Deep Focus Board";
    const updatedEmoji = "🚀";
    const updatedAccent = "#123abc";

    await hostPage.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await hostPage.waitForSelector('[data-testid="start-hosting"]', {
      timeout: 12_000,
    });
    await forceClick(hostPage, '[data-testid="start-hosting"]');
    await hostPage.waitForSelector('[data-testid="timer-shell"]', { timeout: 12_000 });

    await clientPage.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });
    await clientPage.waitForSelector('[data-testid="timer-shell"]', {
      timeout: 12_000,
    });

    await setInputValue(
      hostPage,
      '[data-testid="room-display-name-input"]',
      updatedDisplayName
    );
    await setInputValue(hostPage, '[data-testid="room-emoji-input"]', updatedEmoji);
    await setInputValue(hostPage, '[data-testid="room-accent-input"]', updatedAccent);
    await forceClick(hostPage, "form.room-theme-form button.primary");

    await hostPage.waitForFunction(
      (expectedDisplayName, expectedEmoji, expectedAccent) => {
        const heading =
          document.querySelector('[data-testid="room-display-name"]')?.textContent ??
          "";
        const shell = document.querySelector(
          '[data-testid="session-shell"]'
        ) as HTMLElement | null;
        const accent = shell
          ? getComputedStyle(shell).getPropertyValue("--accent").trim().toLowerCase()
          : "";

        return (
          heading.includes(expectedDisplayName) &&
          heading.includes(expectedEmoji) &&
          accent === expectedAccent
        );
      },
      { timeout: 10_000 },
      updatedDisplayName,
      updatedEmoji,
      updatedAccent
    );

    await clientPage.waitForFunction(
      (expectedDisplayName, expectedEmoji, expectedAccent) => {
        const heading =
          document.querySelector('[data-testid="room-display-name"]')?.textContent ??
          "";
        const shell = document.querySelector(
          '[data-testid="session-shell"]'
        ) as HTMLElement | null;
        const accent = shell
          ? getComputedStyle(shell).getPropertyValue("--accent").trim().toLowerCase()
          : "";

        return (
          heading.includes(expectedDisplayName) &&
          heading.includes(expectedEmoji) &&
          accent === expectedAccent
        );
      },
      { timeout: 10_000 },
      updatedDisplayName,
      updatedEmoji,
      updatedAccent
    );

    const hostHeading =
      (await hostPage.$eval(
        '[data-testid="room-display-name"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    const clientHeading =
      (await clientPage.$eval(
        '[data-testid="room-display-name"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    expect(hostHeading).toContain(updatedDisplayName);
    expect(hostHeading).toContain(updatedEmoji);
    expect(clientHeading).toContain(updatedDisplayName);
    expect(clientHeading).toContain(updatedEmoji);

    const hostAccent = await hostPage.$eval('[data-testid="session-shell"]', (el) =>
      getComputedStyle(el as HTMLElement)
        .getPropertyValue("--accent")
        .trim()
        .toLowerCase()
    );
    const clientAccent = await clientPage.$eval('[data-testid="session-shell"]', (el) =>
      getComputedStyle(el as HTMLElement)
        .getPropertyValue("--accent")
        .trim()
        .toLowerCase()
    );
    expect(hostAccent).toBe(updatedAccent);
    expect(clientAccent).toBe(updatedAccent);

    await hostPage.close();
    await clientPage.close();
  }, 45_000);

  it("shows host fallback actions while still connecting when host takeover is allowed", async () => {
    const room = `connecting-${Date.now()}`;
    const page = await browser!.newPage();
    const sessionUrl = new URL(
      `session/${room}?transport=broadcast`,
      BASE_URL
    ).toString();

    await page.goto(sessionUrl, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="connecting-host-fallback"]', {
      timeout: 8_000,
    });
    await page.waitForFunction(
      () => {
        const status =
          document.querySelector('[data-testid="session-status"]')?.textContent ?? "";
        const fallbackVisible = Boolean(
          document.querySelector('[data-testid="connecting-host-fallback"]')
        );
        const timerVisible = Boolean(
          document.querySelector('[data-testid="timer-shell"]')
        );

        return (
          status.includes("Connecting to room host") &&
          status.includes("You can host now") &&
          fallbackVisible &&
          !timerVisible
        );
      },
      { timeout: 8_000 }
    );

    const statusText =
      (await page.$eval(
        '[data-testid="session-status"]',
        (el) => el.textContent?.trim() ?? ""
      )) ?? "";
    expect(statusText).toContain("Connecting to room host");
    expect(statusText).toContain("You can host now");
    expect(
      await page.$(
        '[data-testid="connecting-host-fallback"] [data-testid="start-hosting"]'
      )
    ).not.toBeNull();

    await page.close();
  });
});
