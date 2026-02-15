import { describe, expect, it } from "vitest";
import {
  createRoomTheme,
  deriveRoomThemeTokens,
  mergeRoomTheme,
  normalizeAccentColor,
  roomThemeEquals,
  toRoomThemeStyle,
} from "./roomTheme";

describe("roomTheme", () => {
  it("normalizes accent colors to lowercase hex", () => {
    expect(normalizeAccentColor("FF00AA")).toBe("#ff00aa");
    expect(normalizeAccentColor("#12AB34")).toBe("#12ab34");
    expect(normalizeAccentColor("invalid")).toBe("#0d7c8f");
  });

  it("creates defaults when fields are empty", () => {
    const theme = createRoomTheme("Team Focus", {
      displayName: "",
      emoji: "",
      accentColor: "",
    });

    expect(theme.displayName).toBe("Team Focus");
    expect(theme.emoji.length).toBeGreaterThan(0);
    expect(theme.accentColor).toBe("#0d7c8f");
  });

  it("merges patches without dropping existing values", () => {
    const original = createRoomTheme("Alpha", {
      emoji: "A",
      accentColor: "#123456",
    });
    const next = mergeRoomTheme(original, {
      displayName: "Beta",
    });

    expect(next.displayName).toBe("Beta");
    expect(next.emoji).toBe("A");
    expect(next.accentColor).toBe("#123456");
  });

  it("derives mode-specific tokens and css variables", () => {
    const light = deriveRoomThemeTokens("#4488cc", "light");
    const dark = deriveRoomThemeTokens("#4488cc", "dark");
    const style = toRoomThemeStyle(light);

    expect(light.accent).toBe("#4488cc");
    expect(dark.accent).toBe("#4488cc");
    expect(light.accentSoft).not.toBe(dark.accentSoft);
    expect(style).toContain("--accent:#4488cc");
    expect(style).toContain("--session-glow-start:");
  });

  it("compares equality consistently", () => {
    const left = createRoomTheme("Room 1", {
      emoji: "R",
      accentColor: "#123456",
    });
    const right = createRoomTheme("Room 1", {
      emoji: "R",
      accentColor: "#123456",
    });
    const different = createRoomTheme("Room 2", {
      emoji: "R",
      accentColor: "#123456",
    });

    expect(roomThemeEquals(left, right)).toBe(true);
    expect(roomThemeEquals(left, different)).toBe(false);
  });
});
