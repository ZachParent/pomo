import { expect, test } from "@playwright/test";

import {
  closeExtraPages,
  makeRoomName,
  parseClockTextToSeconds,
  sessionAccent,
  timerText,
  openSettings,
  closeSettings,
  setRemaining,
  startHostingRoom,
  joinHostedRoom,
} from "./session-helpers";

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

test("client auto-promotes to host when host disconnects without timer reset", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("auto-host");
  const hostPage = await context.newPage();

  try {
    await startHostingRoom(hostPage, roomName);
    await joinHostedRoom(page, roomName);

    await setRemaining(hostPage, 0, 8);
    await hostPage.getByTestId("control-start").click();
    await expect
      .poll(async () => parseClockTextToSeconds(await timerText(page)))
      .toBeLessThanOrEqual(8);

    const beforeDisconnect = parseClockTextToSeconds(await timerText(page));
    expect(beforeDisconnect).toBeGreaterThanOrEqual(2);
    await hostPage.close();

    await expect(page.getByTestId("session-status")).toContainText(
      "Hosting this room.",
      {
        timeout: 10_000,
      }
    );
    await expect(page.getByTestId("control-pause")).toBeVisible();
    await expect
      .poll(async () => parseClockTextToSeconds(await timerText(page)))
      .toBeLessThan(beforeDisconnect);
  } finally {
    if (!hostPage.isClosed()) {
      await hostPage.close();
    }
  }
});

test("room theme updates apply immediately and sync to participants", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("theme-live");
  await startHostingRoom(page, roomName);
  const clientPage = await context.newPage();
  const updatedDisplayName = "Deep Focus Board";
  const updatedAccent = "#123abc";

  try {
    await joinHostedRoom(clientPage, roomName);

    await openSettings(page);
    await page.getByTestId("room-display-name-input").fill(updatedDisplayName);
    await page.getByTestId("room-accent-input").fill(updatedAccent);

    await page.getByTestId("emoji-trigger").click();
    await expect(page.getByTestId("emoji-picker-panel")).toBeVisible();
    await page.locator("emoji-picker").evaluate((element) => {
      element.dispatchEvent(
        new CustomEvent("emoji-click", {
          detail: { unicode: "🧪" },
          bubbles: true,
          composed: true,
        })
      );
    });

    await expect
      .poll(
        async () => (await page.getByTestId("room-display-name").textContent()) ?? ""
      )
      .toContain(updatedDisplayName);
    await expect
      .poll(
        async () =>
          (await clientPage.getByTestId("room-display-name").textContent()) ?? ""
      )
      .toContain(updatedDisplayName);
    await expect(page.getByTestId("room-display-name")).toContainText("🧪");
    await expect(clientPage.getByTestId("room-display-name")).toContainText("🧪");
    await expect.poll(async () => sessionAccent(page)).toBe(updatedAccent);
    await expect.poll(async () => sessionAccent(clientPage)).toBe(updatedAccent);
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

    await openSettings(page);
    await page.locator("#work-minutes").fill("1");
    await page.getByTestId("apply-durations").click();
    await expect(page.getByTestId("schedule-warning")).toBeVisible();

    await setRemaining(clientPage, 0, 30);
    await expect(page.getByTestId("schedule-warning")).toHaveCount(0);
    await closeSettings(page);
  } finally {
    await clientPage.close();
  }
});

test.afterEach(async ({ context }) => {
  await closeExtraPages(context);
});
