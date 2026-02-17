import { expect, test } from "@playwright/test";

import {
  makeRoomName,
  openSettings,
  closeSettings,
  parseClockTextToSeconds,
  setRemaining,
  startHostingRoom,
} from "./session-helpers";

test("settings are hidden by default and open as a modal", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("settings-modal"));

  await expect(page.getByTestId("settings-modal")).toHaveCount(0);
  await page.getByTestId("open-settings").click();
  await expect(page.getByTestId("settings-modal")).toBeVisible();
  await expect(page.getByTestId("remaining-editor-panel")).toBeVisible();

  await page.getByTestId("close-settings").click();
  await expect(page.getByTestId("settings-modal")).toHaveCount(0);
});

test("requires confirmation before shortening an active phase via durations", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("durations"));

  await page.getByTestId("control-start").click();
  await openSettings(page);
  await page.locator("#work-minutes").fill("1");

  await page.getByTestId("apply-durations").click();
  await expect(page.getByTestId("schedule-warning")).toContainText(
    "Submit again to confirm"
  );

  const firstSubmitClock = parseClockTextToSeconds(
    (await page.getByTestId("timer-display").textContent())?.trim() ?? ""
  );
  expect(firstSubmitClock).toBeGreaterThan(60);

  await page.getByTestId("apply-durations").click();
  await expect(page.getByTestId("schedule-warning")).toHaveCount(0);

  await expect
    .poll(async () =>
      parseClockTextToSeconds(
        (await page.getByTestId("timer-display").textContent())?.trim() ?? ""
      )
    )
    .toBeLessThanOrEqual(60);
  await closeSettings(page);
});

test("applies cycle settings and clamps invalid values", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("cycle"));
  await openSettings(page);

  await page.locator("#cycle-count").fill("9");
  await page.locator("#long-break-interval").fill("3");
  await page.getByTestId("apply-cycle-settings").click();
  await expect(page.locator(".cycle")).toContainText("Cycle 2 of 3");

  await page.locator("#cycle-count").fill("9");
  await page.locator("#long-break-interval").fill("1");
  await page.getByTestId("apply-cycle-settings").click();
  await expect(page.locator(".cycle")).toContainText("Cycle 0 of 1");
  await closeSettings(page);
});

test("can set remaining seconds within allowed bounds", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("seconds-clamp"));
  await setRemaining(page, 0, 25);
  await expect(page.getByTestId("timer-display")).toHaveText("00:25");
});

test("changing durations updates future reset value", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("duration-reset"));

  await openSettings(page);
  await page.locator("#work-minutes").fill("13");
  await page.getByTestId("apply-durations").click();
  await closeSettings(page);

  await page.getByTestId("control-reset").click();
  await expect(page.getByTestId("timer-display")).toHaveText("13:00");
});

test("cycle settings update is reflected in cycle label without starting timer", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("cycle-label"));

  await openSettings(page);
  await page.locator("#cycle-count").fill("1");
  await page.locator("#long-break-interval").fill("5");
  await page.getByTestId("apply-cycle-settings").click();
  await closeSettings(page);

  await expect(page.locator(".cycle")).toContainText("Cycle 1 of 5");
});

test("settings help is behind tooltip control", async ({ page }) => {
  await startHostingRoom(page, makeRoomName("settings-help"));

  await openSettings(page);
  await expect(page.getByTestId("settings-help-tooltip")).toHaveCount(0);
  await page.getByTestId("settings-help").click();
  await expect(page.getByTestId("settings-help-tooltip")).toBeVisible();
  await page.getByTestId("settings-help").click();
  await expect(page.getByTestId("settings-help-tooltip")).toHaveCount(0);
});

test("mobile layout keeps primary timer controls visible and settings opens as sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startHostingRoom(page, makeRoomName("mobile-sheet"));

  const timerDisplayBox = await page.getByTestId("timer-display").boundingBox();
  const settingsButtonBox = await page.getByTestId("open-settings").boundingBox();

  expect(timerDisplayBox).not.toBeNull();
  expect(settingsButtonBox).not.toBeNull();
  expect(
    (settingsButtonBox?.y ?? 9_999) + (settingsButtonBox?.height ?? 0)
  ).toBeLessThan(844);

  await openSettings(page);
  await expect(page.getByTestId("settings-modal")).toBeVisible();
  await page.getByTestId("close-settings").click();
  await expect(page.getByTestId("settings-modal")).toHaveCount(0);
});
