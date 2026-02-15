# 0008 - Migrate E2E Automation To Playwright With Strict Coverage Gates

- Status: `done`
- Priority: `P1`
- Type: `chore`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0008-playwright-coverage-gates`
- Suggested worktree: `../pomo-0008-playwright`

## Summary

The repository relied on Vitest+Puppeteer e2e checks with limited breadth and no hard coverage floor for unit tests. Standard session flows needed broader deterministic browser validation with enforceable quality thresholds.

## Scope

### In scope

- Replace the Puppeteer e2e harness with Playwright Test.
- Expand deterministic broadcast-mode browser coverage across host/client workflows.
- Enforce strict unit coverage thresholds in Vitest.
- Keep automation scripts and docs aligned with the new stack.

### Out of scope

- Redesigning app transport logic or changing production collaboration protocols.
- Building visual-diff baseline infrastructure.

## Likely Files

- `package.json`
- `playwright.config.ts`
- `tests/e2e/session.spec.ts`
- `scripts/explore-ui.mjs`
- `vitest.config.ts`
- `src/lib/timerEngine.test.ts`
- `src/lib/scheduleSafety.test.ts`
- `src/lib/roomTheme.test.ts`
- `README.md`
- `docs/testing.md`

## Acceptance Criteria

- [x] `just test-e2e` uses Playwright Test and runs deterministic broadcast-mode multi-flow coverage.
- [x] E2E coverage includes host controls, synchronization, schedule safety, theme sync/reset, and invite-link behaviors.
- [x] Vitest enforces high minimum coverage thresholds and the suite passes those thresholds.
- [x] Documentation and task index reflect the new testing stack and quality bar.

## Notes

- Added `playwright.config.ts` with preview web server bootstrapping and failure artifact capture.
- Replaced `tests/e2e/session.e2e.test.ts` with `tests/e2e/session.spec.ts` containing expanded host/client flow coverage.
- Migrated `scripts/explore-ui.mjs` from Puppeteer to Playwright.
- Added/extended unit tests to raise branch coverage and support strict coverage thresholds.
