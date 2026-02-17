import { expect, test } from "@playwright/test";

import {
  makeRoomName,
  sessionPath,
  timerText,
  setRemaining,
  startHostingRoom,
} from "./session-helpers";

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
  const pausedClock = (await page.getByTestId("timer-display").textContent())?.trim();
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId("timer-display")).toHaveText(pausedClock ?? "");

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

test("leave session updates route to the app root", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("leave"));

  await page.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/pomo\/$/);
  await expect(page.getByTestId("room-name-input")).toBeVisible();
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

test("status includes transport label in broadcast mode", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("transport-label"));
  await expect(page.getByText("Transport: Broadcast test mode")).toBeVisible();
});
