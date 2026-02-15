export type AppThemeMode = "light" | "dark";

export interface RoomThemeMetadata {
  displayName: string;
  emoji: string;
  accentColor: string;
}

export interface RoomThemeTokens {
  accent: string;
  accentStrong: string;
  accentSoft: string;
  ring: string;
  glowStart: string;
  glowEnd: string;
}

const DEFAULT_ACCENT_COLOR = "#0d7c8f";
const DEFAULT_EMOJI = "🍅";
const DEFAULT_ROOM_NAME = "Focus Room";
const MAX_ROOM_NAME_LENGTH = 48;
const MAX_EMOJI_CODEPOINTS = 2;
const HEX_COLOR_PATTERN = /^#?[0-9a-f]{6}$/i;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clampRgb = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string): Rgb => {
  const normalized = hex.replace(/^#/, "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = (rgb: Rgb): string =>
  `#${clampRgb(rgb.r).toString(16).padStart(2, "0")}${clampRgb(rgb.g)
    .toString(16)
    .padStart(2, "0")}${clampRgb(rgb.b).toString(16).padStart(2, "0")}`;

const mixRgb = (left: Rgb, right: Rgb, ratio: number): Rgb => {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  return {
    r: left.r + (right.r - left.r) * safeRatio,
    g: left.g + (right.g - left.g) * safeRatio,
    b: left.b + (right.b - left.b) * safeRatio,
  };
};

const toRgba = (rgb: Rgb, alpha: number): string =>
  `rgba(${clampRgb(rgb.r)}, ${clampRgb(rgb.g)}, ${clampRgb(rgb.b)}, ${Math.max(
    0,
    Math.min(1, alpha)
  ).toFixed(2)})`;

const sanitizeRoomName = (
  value: string | undefined,
  fallbackName = DEFAULT_ROOM_NAME
): string => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    const fallback = fallbackName.trim();
    return fallback ? fallback.slice(0, MAX_ROOM_NAME_LENGTH) : DEFAULT_ROOM_NAME;
  }
  return trimmed.slice(0, MAX_ROOM_NAME_LENGTH);
};

const sanitizeEmoji = (value: string | undefined): string => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return DEFAULT_EMOJI;
  }

  return Array.from(trimmed).slice(0, MAX_EMOJI_CODEPOINTS).join("");
};

export const normalizeAccentColor = (value: string | undefined): string => {
  const trimmed = (value ?? "").trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return DEFAULT_ACCENT_COLOR;
  }
  return `#${trimmed.replace(/^#/, "").toLowerCase()}`;
};

export const createRoomTheme = (
  defaultRoomName: string,
  patch: Partial<RoomThemeMetadata> = {}
): RoomThemeMetadata => ({
  displayName: sanitizeRoomName(patch.displayName, defaultRoomName),
  emoji: sanitizeEmoji(patch.emoji),
  accentColor: normalizeAccentColor(patch.accentColor),
});

export const mergeRoomTheme = (
  current: RoomThemeMetadata,
  patch: Partial<RoomThemeMetadata>
): RoomThemeMetadata =>
  createRoomTheme(current.displayName, {
    displayName: patch.displayName ?? current.displayName,
    emoji: patch.emoji ?? current.emoji,
    accentColor: patch.accentColor ?? current.accentColor,
  });

export const roomThemeEquals = (
  left: RoomThemeMetadata,
  right: RoomThemeMetadata
): boolean =>
  left.displayName === right.displayName &&
  left.emoji === right.emoji &&
  left.accentColor === right.accentColor;

export const deriveRoomThemeTokens = (
  accentColor: string,
  mode: AppThemeMode
): RoomThemeTokens => {
  const base = hexToRgb(normalizeAccentColor(accentColor));
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };

  if (mode === "dark") {
    const strong = mixRgb(base, white, 0.24);
    const soft = mixRgb(base, black, 0.62);
    return {
      accent: rgbToHex(base),
      accentStrong: rgbToHex(strong),
      accentSoft: rgbToHex(soft),
      ring: toRgba(base, 0.45),
      glowStart: toRgba(mixRgb(base, white, 0.22), 0.38),
      glowEnd: toRgba(mixRgb(base, black, 0.45), 0.2),
    };
  }

  const strong = mixRgb(base, black, 0.26);
  const soft = mixRgb(base, white, 0.74);
  return {
    accent: rgbToHex(base),
    accentStrong: rgbToHex(strong),
    accentSoft: rgbToHex(soft),
    ring: toRgba(base, 0.25),
    glowStart: toRgba(mixRgb(base, white, 0.6), 0.46),
    glowEnd: toRgba(mixRgb(base, black, 0.2), 0.18),
  };
};

export const toRoomThemeStyle = (tokens: RoomThemeTokens): string =>
  [
    `--accent:${tokens.accent}`,
    `--accent-strong:${tokens.accentStrong}`,
    `--accent-soft:${tokens.accentSoft}`,
    `--ring:${tokens.ring}`,
    `--session-glow-start:${tokens.glowStart}`,
    `--session-glow-end:${tokens.glowEnd}`,
  ].join(";");
