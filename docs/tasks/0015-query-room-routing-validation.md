# 0015 - Query-Routed Room UX Validation

- Status: `done`
- Priority: `P2`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-17`
- Updated: `2026-02-17`
- Depends on: `0013`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0015-query-room-routing-validation`
- Suggested worktree: `../pomo-0015-query-room-routing-validation`

## Summary

Room entry and shared-link routing now uses query-form session URLs (`/?room=<room-name>`) consistently for both host and peers. Room names are now validated on the home screen to allow only alphanumeric characters and dashes, with inline warnings shown only when invalid characters are typed.

## Scope

### In scope

- Force host and peer entry points to query-form URLs, including copied invite links.
- Validate room input to `[A-Za-z0-9-]+` and show inline warning for invalid characters.
- Keep validation UI space stable while typing and preserve disabled join state for invalid names.
- Expand Playwright coverage for query-only routing, invalid-name warning behavior, and copied-link format.
- Raise Playwright worker count for faster deterministic parallel e2e execution.

### Out of scope

- Changing transport routing rules or adding server-side redirects.
- Expanding supported room characters beyond validation constraints.

## Likely Files

- `src/App.svelte`
- `src/lib/Home.svelte`
- `src/app.css`
- `tests/e2e/session-home.spec.ts`
- `tests/e2e/session-links.spec.ts`
- `playwright.config.ts`
- `docs/*`

## Acceptance Criteria

- [x] New session joins generate `/?room=<room-name>` URLs.
- [x] Session route entry is query-only (`/?room=<room-name>`).
- [x] Invite links produced by session hosts are consistently query-based.
- [x] Invalid room names (`space`, special symbols) trigger an inline warning before submission.
- [x] The warning region stays in layout with no visible content shift while typing.
- [x] E2E coverage includes query-routing and validation regressions.
- [x] Playwright is configured for four concurrent workers.

## Notes

- A single NBSP placeholder and fixed feedback row height are used in the home form to prevent layout jumps during validation messaging.
