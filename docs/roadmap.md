# Roadmap

## Near-Term Reliability

- Session render reliability:
  - Reproduce and fix reported first-load render stalls in session view.
  - Add regression checks so theme toggles never gate UI visibility.
- Host handoff protocol:
  - Elect a backup host when current host disconnects.
  - Resume timer from latest consensus state.
- Reconnect flow:
  - Auto-retry join with bounded exponential backoff.
  - Clearer UI messaging for broker/network outages.
- Session recovery:
  - Persist recent room name and transport mode in local storage.
  - Offer one-click rejoin on app load.

## Collaboration Features

- Shared room notes:
  - Minimal synchronized text panel for focus goals.
- Session events feed:
  - Log start/pause/reset/phase transitions with timestamps.
- Optional host moderation:
  - Host-only lock for schedule changes.

## Product and UX Improvements

- Safer schedule controls:
  - Make schedule edits clearly non-destructive during active timers.
  - Add explicit confirmation when changes shorten active phase durations.
- Compact timer editing UI:
  - Convert remaining-time controls to a compact `MM:SS` interaction pattern.
- Branded onboarding:
  - Landing page examples for common room naming conventions.
- Room personalization:
  - Add room display name, emoji, and accent color customization.
  - Derive legible gradients in both light and dark modes.
- Accessibility pass:
  - Full keyboard controls and improved aria-live announcements.
- Notification controls:
  - Per-user sound toggle and volume preference.

## Engineering Enhancements

- Transport abstraction tests:
  - Integration tests that run against both `peerjs` and `broadcast` adapters.
- Contract tests for session messages:
  - Enforce payload compatibility between versions.
- Release automation:
  - Semver tagging and changelog generation on release workflow.
