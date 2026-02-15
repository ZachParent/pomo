# 0007 - Expand Visual And Interaction Regression Coverage

- Status: `done`
- Priority: `P2`
- Type: `chore`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0007-expand-ui-regression-tests`
- Suggested worktree: `../pomo-0007-ui-regression`

## Summary

Current tests cover core timer behavior but do not systematically guard against UI regressions in editing controls, schedule safety messaging, and theme-dependent rendering.

## Scope

### In scope

- Add e2e checks for remaining-time editing UX behavior.
- Add e2e checks for schedule-change warnings/confirmation behavior.
- Add screenshot checkpoints for light/dark theme parity.
- Add bug-specific regression coverage tied to tickets `0001`-`0005`.
- Add utility-level regression coverage where fast deterministic tests reduce e2e burden.

### Out of scope

- Replacing Puppeteer stack or building a visual diff platform from scratch.

## Likely Files

- `tests/e2e/session.spec.ts`
- `scripts/explore-ui.mjs`
- `src/lib/scheduleSafety.test.ts`
- `src/lib/roomTheme.test.ts`
- `docs/testing.md`

## Acceptance Criteria

- [x] Utility-level regression tests cover schedule safety and room theme token/sanitization behavior.
- [x] New e2e tests fail before corresponding bug fixes and pass afterward.
- [x] Coverage includes both interaction assertions and screenshot artifacts.
- [x] `just test-e2e` remains stable and deterministic in `broadcast` mode.

## Notes

- Added e2e assertions for schedule warning confirmation, connecting-state host fallback, and room theme synchronization in `tests/e2e/session.spec.ts`.
- Current e2e failure artifacts are captured in `test-results` and reports in `artifacts/playwright-report`.
