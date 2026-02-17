import { expect, test } from "@playwright/test";

import { APP_BASE_PATH, makeRoomName } from "./session-helpers";

const warningHeightTolerance = 1;

test("home route renders room input immediately on first load", async ({ page }) => {
  await page.goto(`${APP_BASE_PATH}/`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("room-name-input")).toBeVisible();
  await expect(page.getByTestId("join-room-button")).toBeVisible();
});

test("theme toggle updates and persists app theme selection", async ({ page }) => {
  await page.goto(`${APP_BASE_PATH}/`, { waitUntil: "domcontentloaded" });

  const html = page.locator("html");
  const themeToggle = page.getByRole("button", { name: "Switch to dark theme" });

  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(themeToggle.locator("svg")).toBeVisible();
  await expect(themeToggle).not.toContainText(/sun|moon/i);
  await themeToggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("joining a room uses canonical query-route URL format", async ({ page }) => {
  const roomName = makeRoomName("query-route");
  await page.goto(`${APP_BASE_PATH}/`, { waitUntil: "domcontentloaded" });

  await page.getByTestId("room-name-input").fill(roomName);
  await page.getByTestId("join-room-button").click();

  await expect(page).toHaveURL(`${APP_BASE_PATH}/?room=${roomName}`);
  await expect(page.getByTestId("session-status")).toContainText(
    "Connecting to room host"
  );
});

test("invalid room query values do not load a session", async ({ page }) => {
  await page.goto(`${APP_BASE_PATH}/?room=bad%20room`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("room-name-input")).toBeVisible();
  await expect(page.getByTestId("room-name-feedback")).toBeVisible();
  await expect(page.getByTestId("session-status")).toHaveCount(0);
});

test("invalid room names keep warning visible without shifting content", async ({
  page,
}) => {
  await page.goto(`${APP_BASE_PATH}/`, {
    waitUntil: "domcontentloaded",
  });

  const roomInput = page.getByTestId("room-name-input");
  const feedback = page.getByTestId("room-name-feedback");
  const joinButton = page.getByTestId("join-room-button");
  await expect(roomInput).toBeVisible();

  const heightBefore = (await feedback.boundingBox())?.height;
  await roomInput.fill("bad room");
  await expect(feedback).toContainText("Room name contains an unsupported character.");
  await expect(joinButton).toBeDisabled();
  const heightWithError = (await feedback.boundingBox())?.height;

  await roomInput.fill("good-room");
  await expect(joinButton).toBeEnabled();
  const heightAfter = (await feedback.boundingBox())?.height;

  expect(heightBefore).toBeDefined();
  expect(heightWithError).toBeDefined();
  expect(heightAfter).toBeDefined();
  expect(heightWithError).toBeGreaterThanOrEqual(
    (heightBefore ?? 0) - warningHeightTolerance
  );
  expect(heightWithError).toBeLessThanOrEqual(
    (heightBefore ?? 0) + warningHeightTolerance
  );
  expect(heightAfter).toBeGreaterThanOrEqual(
    (heightBefore ?? 0) - warningHeightTolerance
  );
  expect(heightAfter).toBeLessThanOrEqual((heightBefore ?? 0) + warningHeightTolerance);
  expect(joinButton).toBeEnabled();
});
