# Roadmap

## Recently Completed (2026-02-15)

- Ticket `0001`: removed brandmark artifact line by simplifying `public/brandmark.svg`.
- Ticket `0002`: fixed base-path session/home render stalls and added first-load home-route regression coverage.
- Ticket `0003`: split duration/cycle controls and added active-phase shortening confirmation guard.
- Ticket `0005`: surfaced host fallback actions in connecting state when safe.
- Ticket `0006`: shipped room display name/emoji/accent customization with synchronized room theme revisions.
- Ticket `0007`: expanded e2e regression coverage for schedule safety, connecting fallback controls, and room theme sync.
- Ticket `0008`: migrated e2e suite to Playwright, expanded multi-flow session coverage, and enforced stricter unit coverage thresholds.
- Ticket `0009`: tightened UI density for desktop/mobile and replaced textual sun/moon theme labels with icons.

## Near-Term Reliability

- Host handoff protocol:
  - Elect a backup host when current host disconnects.
  - Resume timer from latest consensus state.
- Reconnect flow:
  - Auto-retry join with bounded exponential backoff.
  - Clearer UI messaging for broker/network outages.
- Session recovery:
  - Persist recent room name and transport mode in local storage.
  - Offer one-click rejoin on app load.

## Product and UX Improvements

- Compact timer editing UI:
  - Convert remaining-time controls to a compact `MM:SS` interaction pattern.
- Branded onboarding:
  - Add landing page examples for common room naming conventions.
- Room personalization follow-ons:
  - Persist room theme defaults for quick room recreation.
  - Add contrast validation messaging when custom accents reduce readability.
- Accessibility pass:
  - Full keyboard controls and improved aria-live announcements.
- Notification controls:
  - Per-user sound toggle and volume preference.

## Collaboration Features

- Shared room notes:
  - Minimal synchronized text panel for focus goals.
- Session events feed:
  - Log start/pause/reset/phase transitions with timestamps.
- Optional host moderation:
  - Host-only lock for schedule changes.

## Engineering Enhancements

- Visual diff regression tooling:
  - Add light/dark screenshot baseline comparison for room theme parity.
- Transport abstraction tests:
  - Integration tests that run against both `peerjs` and `broadcast` adapters.
- Contract tests for session messages:
  - Enforce payload compatibility between versions.
- Release automation:
  - Semver tagging and changelog generation on release workflow.
