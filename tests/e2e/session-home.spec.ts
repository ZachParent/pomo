import { expect, test } from "@playwright/test";

import { APP_BASE_PATH, startHostingRoom } from "./session-helpers";

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

test("room names with spaces are URL decoded in the session heading", async ({
  page,
}) => {
  const roomName = "deep work";
  await startHostingRoom(page, roomName);
  await expect(page).toHaveURL(/\/pomo\/session\/deep%20work\?transport=broadcast$/);
  await expect(page.getByTestId("room-display-name")).toBeVisible();
});
