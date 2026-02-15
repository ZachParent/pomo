import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const parseClockTextToSeconds = (value: string): number => {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return -1;
  }

  return Number(match[1]) * 60 + Number(match[2]);
};

const makeRoomName = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

const APP_BASE_PATH = "/pomo";

const sessionPath = (roomName: string): string =>
  `${APP_BASE_PATH}/session/${encodeURIComponent(roomName)}?transport=broadcast`;

const timerText = async (page: Page): Promise<string> =>
  (await page.getByTestId("timer-display").textContent())?.trim() ?? "";

const sessionAccent = async (page: Page): Promise<string> =>
  page.getByTestId("session-shell").evaluate((element) =>
    getComputedStyle(element as HTMLElement)
      .getPropertyValue("--accent")
      .trim()
      .toLowerCase()
  );

const setRemaining = async (
  page: Page,
  minutes: number,
  seconds: number
): Promise<void> => {
  await page.getByTestId("remaining-minutes").fill(String(minutes));
  await page.getByTestId("remaining-seconds").fill(String(seconds));
  await page.getByTestId("apply-remaining").click();
};

const startHostingRoom = async (page: Page, roomName: string): Promise<void> => {
  await page.goto(sessionPath(roomName), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await page.getByTestId("start-hosting").click();
  await expect(page.getByTestId("timer-shell")).toBeVisible();
  await expect(page.getByTestId("session-status")).toContainText("Hosting this room.");
};

const joinHostedRoom = async (page: Page, roomName: string): Promise<void> => {
  await page.goto(sessionPath(roomName), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("timer-shell")).toBeVisible();
  await expect(page.getByTestId("session-status")).toContainText("Connected to host.");
};

test.describe.configure({ mode: "serial" });

test("home route renders room input immediately on first load", async ({ page }) => {
  await page.goto(`${APP_BASE_PATH}/`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("room-name-input")).toBeVisible();
  await expect(page.getByTestId("join-room-button")).toBeVisible();
});

test("shows host fallback controls while connecting to an empty room", async ({
  page,
}) => {
  await page.goto(sessionPath(makeRoomName("fallback")), {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("session-status")).toContainText(
    "Connecting to room host"
  );
  await expect(page.getByTestId("session-status")).toContainText("You can host now");
  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await expect(page.getByTestId("room-theme-locked")).toBeVisible();
  await expect(page.getByTestId("room-display-name-input")).toHaveCount(0);
  await expect(page.getByTestId("timer-shell")).toHaveCount(0);
});

test("host can start, pause, and reset the timer", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("controls"));

  await setRemaining(page, 0, 7);
  await expect(page.getByTestId("timer-display")).toHaveText("00:07");

  await page.getByTestId("control-start").click();
  await expect(page.getByTestId("control-pause")).toBeVisible();
  await expect.poll(async () => timerText(page)).not.toBe("00:07");

  await page.getByTestId("control-pause").click();
  await expect(page.getByTestId("timer-phase")).toContainText("(Paused)");
  const pausedClock = await timerText(page);
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId("timer-display")).toHaveText(pausedClock);

  await page.getByTestId("control-reset").click();
  await expect(page.getByTestId("timer-display")).toHaveText("25:00");
  await expect(page.getByTestId("timer-phase")).toContainText("Work (Paused)");
  await expect(page.getByTestId("control-start")).toBeVisible();
});

test("transitions from work to short break without stalling", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("phase"));

  await setRemaining(page, 0, 3);
  await page.getByTestId("control-start").click();

  await expect(page.getByTestId("timer-phase")).toContainText("Short Break");
  await expect(page.getByTestId("timer-phase")).toContainText("(Running)");
  await expect(page.locator(".cycle")).toContainText("Cycle 1 of 4");
});

test("requires confirmation before shortening an active phase via durations", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("durations"));

  await page.getByTestId("control-start").click();
  await page.locator("#work-minutes").fill("1");

  await page.getByTestId("apply-durations").click();
  await expect(page.getByTestId("schedule-warning")).toContainText(
    "Submit again to confirm"
  );

  const firstSubmitClock = parseClockTextToSeconds(await timerText(page));
  expect(firstSubmitClock).toBeGreaterThan(60);

  await page.getByTestId("apply-durations").click();
  await expect(page.getByTestId("schedule-warning")).toHaveCount(0);

  await expect
    .poll(async () => parseClockTextToSeconds(await timerText(page)))
    .toBeLessThanOrEqual(60);
});

test("applies cycle settings and clamps invalid values", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("cycle"));

  await page.locator("#cycle-count").fill("9");
  await page.locator("#long-break-interval").fill("3");
  await page.getByTestId("apply-cycle-settings").click();
  await expect(page.locator(".cycle")).toContainText("Cycle 2 of 3");

  await page.locator("#cycle-count").fill("9");
  await page.locator("#long-break-interval").fill("1");
  await page.getByTestId("apply-cycle-settings").click();
  await expect(page.locator(".cycle")).toContainText("Cycle 0 of 1");
});

test("remaining-time editor fields are always visible without hover", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("editor"));

  await expect(page.getByTestId("remaining-editor-panel")).toBeVisible();
  await expect(page.getByTestId("remaining-minutes")).toBeVisible();
  await expect(page.getByTestId("remaining-seconds")).toBeVisible();
  await expect(page.getByTestId("toggle-remaining-editor")).toHaveCount(0);
});

test("synchronizes timer updates and client-issued controls across participants", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("sync");
  await startHostingRoom(page, roomName);
  const clientPage = await context.newPage();

  try {
    await joinHostedRoom(clientPage, roomName);

    await setRemaining(page, 0, 5);
    await expect(clientPage.getByTestId("timer-display")).toHaveText("00:05");

    await page.getByTestId("control-start").click();
    await expect.poll(async () => timerText(clientPage)).toMatch(/^00:0[0-4]$/);

    await clientPage.getByTestId("control-pause").click();
    await expect(page.getByTestId("timer-phase")).toContainText("(Paused)");

    await setRemaining(clientPage, 0, 9);
    await expect(page.getByTestId("timer-display")).toHaveText("00:09");
  } finally {
    await clientPage.close();
  }
});

test("synchronizes room theme changes and supports draft reset", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("theme");
  await startHostingRoom(page, roomName);
  const clientPage = await context.newPage();
  const updatedDisplayName = "Deep Focus Board";
  const updatedEmoji = "🚀";
  const updatedAccent = "#123abc";

  try {
    await joinHostedRoom(clientPage, roomName);

    await page.getByTestId("room-display-name-input").fill(updatedDisplayName);
    await page.getByTestId("room-emoji-input").fill(updatedEmoji);
    await page.getByTestId("room-accent-input").fill(updatedAccent);
    await page.getByRole("button", { name: "Save Theme" }).click();

    await expect(page.getByTestId("room-display-name")).toContainText(
      updatedDisplayName
    );
    await expect(page.getByTestId("room-display-name")).toContainText(updatedEmoji);
    await expect(clientPage.getByTestId("room-display-name")).toContainText(
      updatedDisplayName
    );
    await expect(clientPage.getByTestId("room-display-name")).toContainText(
      updatedEmoji
    );
    await expect.poll(async () => sessionAccent(page)).toBe(updatedAccent);
    await expect.poll(async () => sessionAccent(clientPage)).toBe(updatedAccent);

    await page.getByTestId("room-display-name-input").fill("Scratch Draft");
    await page.getByTestId("room-emoji-input").fill("🧪");
    await page.getByTestId("room-accent-input").fill("#ff0000");
    await page
      .locator("form.room-theme-form")
      .getByRole("button", { name: "Reset" })
      .click();

    await expect(page.getByTestId("room-display-name-input")).toHaveValue(
      updatedDisplayName
    );
    await expect(page.getByTestId("room-emoji-input")).toHaveValue(updatedEmoji);
    await expect(page.getByTestId("room-accent-input")).toHaveValue(updatedAccent);
    await expect(clientPage.getByTestId("room-display-name")).toContainText(
      updatedDisplayName
    );
  } finally {
    await clientPage.close();
  }
});

test("hosts can copy an invite link to the clipboard", async ({
  page,
  context,
  baseURL,
}) => {
  const roomName = makeRoomName("copy-link");
  await startHostingRoom(page, roomName);

  const baseOrigin = new URL(baseURL ?? "http://127.0.0.1:4173").origin;
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: baseOrigin,
  });

  const copyButton = page.getByTestId("copy-link-button");
  await copyButton.click();
  await expect(copyButton).toHaveText("Invite Link Copied");

  const inviteLink = await page.evaluate(async () => navigator.clipboard.readText());
  expect(inviteLink).toContain(
    `/pomo/session/${encodeURIComponent(roomName)}?transport=broadcast`
  );
});

test("leave session updates route to the app root", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("leave"));

  await page.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/pomo\/$/);
  await expect(page.getByTestId("room-name-input")).toBeVisible();
});

test("theme toggle updates and persists app theme selection", async ({ page }) => {
  await page.goto(`${APP_BASE_PATH}/`, { waitUntil: "domcontentloaded" });

  const html = page.locator("html");
  const themeToggle = page.getByRole("button", { name: "Switch to dark theme" });

  await expect(html).toHaveAttribute("data-theme", "light");
  await themeToggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("retry join action keeps client in connecting flow when no host exists", async ({
  page,
}) => {
  await page.goto(sessionPath(makeRoomName("retry")), {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await page.getByRole("button", { name: "Retry Join" }).click();
  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await expect(page.getByTestId("session-status")).toContainText(
    "Connecting to room host"
  );
});

test("room names with spaces are URL decoded in the session heading", async ({
  page,
}) => {
  const roomName = "deep work";
  await startHostingRoom(page, roomName);
  await expect(page).toHaveURL(/\/pomo\/session\/deep%20work\?transport=broadcast$/);
  await expect(page.getByTestId("room-display-name")).toBeVisible();
});

test("copy link remains scoped to current transport mode", async ({
  page,
  context,
  baseURL,
}) => {
  const roomName = makeRoomName("copy-mode");
  await startHostingRoom(page, roomName);

  const baseOrigin = new URL(baseURL ?? "http://127.0.0.1:4173").origin;
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: baseOrigin,
  });

  await page.getByTestId("copy-link-button").click();
  const inviteLink = await page.evaluate(async () => navigator.clipboard.readText());
  expect(inviteLink.endsWith("?transport=broadcast")).toBe(true);
});

test("non-host clients do not see invite-link host controls", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("host-tools");
  await startHostingRoom(page, roomName);
  const clientPage = await context.newPage();

  try {
    await joinHostedRoom(clientPage, roomName);
    await expect(clientPage.getByTestId("copy-link-button")).toHaveCount(0);
    await expect(page.getByTestId("copy-link-button")).toBeVisible();
  } finally {
    await clientPage.close();
  }
});

test("host timer changes propagate to newly joined clients", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("late-join");
  await startHostingRoom(page, roomName);

  await setRemaining(page, 0, 12);
  await page.getByTestId("control-start").click();
  await expect
    .poll(async () => parseClockTextToSeconds(await timerText(page)))
    .toBeLessThan(12);

  const lateJoiner = await context.newPage();
  try {
    await joinHostedRoom(lateJoiner, roomName);
    await expect
      .poll(async () => parseClockTextToSeconds(await timerText(lateJoiner)))
      .toBeGreaterThanOrEqual(0);
    await expect
      .poll(async () => parseClockTextToSeconds(await timerText(lateJoiner)))
      .toBeLessThanOrEqual(parseClockTextToSeconds(await timerText(page)) + 1);
  } finally {
    await lateJoiner.close();
  }
});

test("client can edit remaining time while paused and host receives the update", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("client-edit");
  await startHostingRoom(page, roomName);
  const clientPage = await context.newPage();

  try {
    await joinHostedRoom(clientPage, roomName);
    await setRemaining(clientPage, 0, 44);
    await expect(page.getByTestId("timer-display")).toHaveText("00:44");
    await expect(clientPage.getByTestId("timer-display")).toHaveText("00:44");
  } finally {
    await clientPage.close();
  }
});

test("status includes transport label in broadcast mode", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("transport-label"));
  await expect(page.getByText("Transport: Broadcast test mode")).toBeVisible();
});

test("can set remaining seconds within allowed bounds", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("seconds-clamp"));

  await page.getByTestId("remaining-minutes").fill("0");
  await page.getByTestId("remaining-seconds").fill("25");
  await page.getByTestId("apply-remaining").click();
  await expect(page.getByTestId("timer-display")).toHaveText("00:25");
});

test("changing durations updates future reset value", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("duration-reset"));

  await page.locator("#work-minutes").fill("13");
  await page.getByTestId("apply-durations").click();
  await page.getByTestId("control-reset").click();
  await expect(page.getByTestId("timer-display")).toHaveText("13:00");
});

test("cycle settings update is reflected in cycle label without starting timer", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("cycle-label"));

  await page.locator("#cycle-count").fill("1");
  await page.locator("#long-break-interval").fill("5");
  await page.getByTestId("apply-cycle-settings").click();
  await expect(page.locator(".cycle")).toContainText("Cycle 1 of 5");
});

test("duration confirmation warning clears after remote timer revision sync", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("warning-clear");
  await startHostingRoom(page, roomName);
  const clientPage = await context.newPage();

  try {
    await joinHostedRoom(clientPage, roomName);
    await page.getByTestId("control-start").click();
    await page.locator("#work-minutes").fill("1");
    await page.getByTestId("apply-durations").click();
    await expect(page.getByTestId("schedule-warning")).toBeVisible();

    await setRemaining(clientPage, 0, 30);
    await expect(page.getByTestId("schedule-warning")).toHaveCount(0);
  } finally {
    await clientPage.close();
  }
});

test("copy button label resets after timeout", async ({ page, context, baseURL }) => {
  const roomName = makeRoomName("copy-timeout");
  await startHostingRoom(page, roomName);

  const baseOrigin = new URL(baseURL ?? "http://127.0.0.1:4173").origin;
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: baseOrigin,
  });

  const copyButton = page.getByTestId("copy-link-button");
  await copyButton.click();
  await expect(copyButton).toHaveText("Invite Link Copied");

  await page.waitForTimeout(1_700);
  await expect(copyButton).toHaveText("Copy Invite Link");
});

test("theme form submit is a no-op when no values changed", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("theme-noop"));

  const headingBefore = await page.getByTestId("room-display-name").textContent();
  await page.getByRole("button", { name: "Save Theme" }).click();
  await expect(page.getByTestId("room-display-name")).toHaveText(
    (headingBefore ?? "").trim()
  );
});

test("alert sound preference can be selected and persists after reload", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("alert-sound"));

  const soundSelect = page.getByTestId("alert-sound-select");
  await expect(soundSelect).toBeVisible();
  await soundSelect.selectOption("bell");
  await expect(soundSelect).toHaveValue("bell");
  await expect(page.getByTestId("preview-alert-sound")).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => window.localStorage.getItem("pomo.alertSound"))
    )
    .toBe("bell");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await page.getByTestId("start-hosting").click();
  await expect(page.getByTestId("timer-shell")).toBeVisible();
  await expect(page.getByTestId("alert-sound-select")).toHaveValue("bell");
});

const closeExtraPages = async (context: BrowserContext): Promise<void> => {
  const pages = context.pages();
  const extraPages = pages.slice(1);
  await Promise.all(extraPages.map(async (page) => page.close()));
};

test.afterEach(async ({ context }) => {
  await closeExtraPages(context);
});
