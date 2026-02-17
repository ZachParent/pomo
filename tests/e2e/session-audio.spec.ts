import { expect, test } from "@playwright/test";

import {
  makeRoomName,
  installSuspendedAudioContextStub,
  openSettings,
  closeSettings,
  setDocumentVisibility,
  setRemaining,
  startHostingRoom,
} from "./session-helpers";

test("alert sound preference can be selected and persists after reload", async ({
  page,
}) => {
  await startHostingRoom(page, makeRoomName("alert-sound"));

  await openSettings(page);
  const soundSelect = page.getByTestId("alert-sound-select");
  await expect(soundSelect).toBeVisible();
  await soundSelect.selectOption("bell");
  await expect(soundSelect).toHaveValue("bell");
  await expect(page.getByTestId("preview-alert-sound")).toBeVisible();
  await expect(
    await page.evaluate(() => window.localStorage.getItem("pomo.alertSound"))
  ).toBe("bell");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("connecting-host-fallback")).toBeVisible();
  await page.getByTestId("start-hosting").click();
  await expect(page.getByTestId("timer-shell")).toBeVisible();

  await openSettings(page);
  await expect(page.getByTestId("alert-sound-select")).toHaveValue("bell");
});

test("alert tones recover from suspended context when tab returns to visible", async ({
  page,
}) => {
  await installSuspendedAudioContextStub(page);
  await startHostingRoom(page, makeRoomName("alert-recover"));

  await openSettings(page);
  await page.getByTestId("alert-sound-select").selectOption("bell");
  await closeSettings(page);

  await setDocumentVisibility(page, true);
  await setRemaining(page, 0, 1);
  await page.getByTestId("control-start").click();

  await expect(page.getByTestId("timer-phase")).toContainText("Short Break");
  await expect(
    await page.evaluate(() => {
      const win = window as unknown as {
        __audioStubEvents: Array<{ type: string; resumed: boolean }>;
      };
      return win.__audioStubEvents.length;
    })
  ).toBe(0);

  await setDocumentVisibility(page, false);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(
    await page.evaluate(() => {
      const win = window as unknown as {
        __audioStubEvents: Array<{ type: string; resumed: boolean }>;
      };
      return win.__audioStubEvents[0]?.type ?? null;
    })
  ).toBe("resume");
  await expect(
    await page.evaluate(() => {
      const win = window as unknown as {
        __audioStubEvents: Array<{ type: string; resumed: boolean }>;
      };
      return win.__audioStubEvents.filter(
        (event) => event.type === "start" && event.resumed
      ).length;
    })
  ).toBeGreaterThan(1);
});
