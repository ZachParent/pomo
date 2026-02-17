import { expect, test } from "@playwright/test";

import { APP_BASE_PATH, makeRoomName, startHostingRoom } from "./session-helpers";

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
    `/pomo/?room=${encodeURIComponent(roomName)}&transport=broadcast`
  );
});

test("shared room links with query params connect the same room", async ({
  page,
  context,
}) => {
  const roomName = makeRoomName("shared-link-query");
  await startHostingRoom(page, roomName);
  const sharedLink = `${APP_BASE_PATH}/?room=${encodeURIComponent(
    roomName
  )}&transport=broadcast`;

  const secondClient = await context.newPage();
  try {
    await secondClient.goto(sharedLink, { waitUntil: "domcontentloaded" });
    await expect(secondClient.getByTestId("timer-shell")).toBeVisible();
    await expect(secondClient.getByTestId("session-status")).toContainText(
      "Connected to host."
    );
  } finally {
    await secondClient.close();
  }
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
  expect(inviteLink).toContain("transport=broadcast");
  expect(inviteLink).toContain(`/pomo/?room=${encodeURIComponent(roomName)}`);
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
