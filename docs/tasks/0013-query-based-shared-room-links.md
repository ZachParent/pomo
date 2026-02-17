# 0013 - Query-Based Shared Room Links

- Status: `done`
- Priority: `P2`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-17`
- Updated: `2026-02-17`
- Depends on: `0012`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0013-query-based-shared-room-links`
- Suggested worktree: `../pomo-0013-shared-room-links`

## Summary

Copy-to-share links previously relied on path-only routes, which can be brittle on static hosts that do not reliably rewrite deep routes.
This change adds root query-based room routing (`/?room=<room-name>`) as a fallback and updates invite-link generation to produce that format.

## Scope

### In scope

- Resolve sessions from both `/session/<room-name>` and `/?room=<room-name>` URLs.
- Generate copy links using root query format while keeping display name unchanged.
- Preserve transport selector behavior for broadcast mode in shared URLs.
- Expand e2e coverage for shared-link query-style entry and connection behavior.

### Out of scope

- Full deployment routing rewrites / server configuration for single-page apps.
- Cross-transport fallback policy beyond existing peerjs/broadcast transport handling.

## Likely Files

- `src/App.svelte`
- `src/lib/PomodoroSession.svelte`
- `tests/e2e/session.spec.ts`

## Acceptance Criteria

- [x] Opening `/?room=<room-name>` enters the same session flow as `/session/<room-name>`.
- [x] Invite links include room query params and preserve broadcast query flag when active.
- [x] Shared-query links connect a second client to an existing host within existing e2e transport setup.
- [x] Unit/e2e/type/lint checks remain green after change.

## Notes

- Path-based links are still supported for compatibility and direct navigation.
