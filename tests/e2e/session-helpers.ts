import { expect, type BrowserContext, type Page } from "@playwright/test";

export const parseClockTextToSeconds = (value: string): number => {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return -1;
  }

  return Number(match[1]) * 60 + Number(match[2]);
};

export const makeRoomName = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

export const APP_BASE_PATH = "/pomo";

export const sessionPath = (roomName: string): string => {
  const query = new URLSearchParams({ room: roomName, transport: "broadcast" });
  return `${APP_BASE_PATH}/?${query.toString()}`;
};

export const timerText = async (page: Page): Promise<string> =>
  (await page.getByTestId("timer-display").textContent())?.trim() ?? "";

export const sessionAccent = async (page: Page): Promise<string> =>
  page.getByTestId("session-shell").evaluate((element) =>
    getComputedStyle(element as HTMLElement)
      .getPropertyValue("--accent")
      .trim()
      .toLowerCase()
  );

export const openSettings = async (page: Page): Promise<void> => {
  const modal = page.getByTestId("settings-modal");
  if (await modal.isVisible().catch(() => false)) {
    return;
  }

  await page.getByTestId("open-settings").click();
  await expect(modal).toBeVisible();
};

export const closeSettings = async (page: Page): Promise<void> => {
  const modal = page.getByTestId("settings-modal");
  if (!(await modal.isVisible().catch(() => false))) {
    return;
  }

  await page.getByTestId("close-settings").click();
  await expect(modal).toHaveCount(0);
};

export const setRemaining = async (
  page: Page,
  minutes: number,
  seconds: number
): Promise<void> => {
  await openSettings(page);
  await page.getByTestId("remaining-minutes").fill(String(minutes));
  await page.getByTestId("remaining-seconds").fill(String(seconds));
  await page.getByTestId("apply-remaining").click();
  await closeSettings(page);
};

export const installSuspendedAudioContextStub = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const debug = {
      calls: [] as Array<{ type: string; resumed: boolean }>,
    };

    class SuspendedAudioContext {
      state: AudioContextState = "suspended";
      currentTime = 0;
      destination = {};
      private resumed = false;

      resume(): Promise<void> {
        this.resumed = true;
        this.state = "running";
        debug.calls.push({ type: "resume", resumed: this.resumed });
        return Promise.resolve();
      }

      close(): Promise<void> {
        return Promise.resolve();
      }

      createOscillator() {
        debug.calls.push({ type: "create-oscillator", resumed: this.resumed });
        return {
          type: "",
          frequency: { setValueAtTime: () => {} },
          start: () => {
            debug.calls.push({ type: "start", resumed: this.resumed });
            if (!this.resumed) {
              throw new Error("AudioContextNotResumed");
            }
          },
          stop: () => {},
          connect: () => {},
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
        };
      }
    }

    const win = window as unknown as {
      __audioStubEvents: Array<{ type: string; resumed: boolean }>;
    };
    const audioContextConstructor = SuspendedAudioContext as unknown as AudioContext;

    win.__audioStubEvents = debug.calls;
    window.AudioContext = audioContextConstructor;
  });
};

export const setDocumentVisibility = async (
  page: Page,
  hidden: boolean
): Promise<void> => {
  await page.evaluate((nextHidden: boolean) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => nextHidden,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (nextHidden ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
};

export const startHostingRoom = async (page: Page, roomName: string): Promise<void> => {
  await page.goto(sessionPath(roomName), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await page.getByTestId("start-hosting").click();
  await expect(page.getByTestId("timer-shell")).toBeVisible();
  await expect(page.getByTestId("session-status")).toContainText("Hosting this room.");
};

export const joinHostedRoom = async (page: Page, roomName: string): Promise<void> => {
  await page.goto(sessionPath(roomName), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("timer-shell")).toBeVisible();
  await expect(page.getByTestId("session-status")).toContainText("Connected to host.");
};

export const closeExtraPages = async (context: BrowserContext): Promise<void> => {
  const pages = context.pages();
  const extraPages = pages.slice(1);
  await Promise.all(extraPages.map(async (page) => page.close()));
};
