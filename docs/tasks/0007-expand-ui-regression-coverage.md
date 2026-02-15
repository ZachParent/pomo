# 0007 - Expand Visual And Interaction Regression Coverage

- Status: `ready`
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

### Out of scope

- Replacing Puppeteer stack or building a visual diff platform from scratch.

## Likely Files

- `tests/e2e/session.e2e.test.ts`
- `scripts/explore-ui.mjs`
- `docs/testing.md`

## Acceptance Criteria

- [ ] New tests fail before corresponding bug fixes and pass afterward.
- [ ] Coverage includes both interaction assertions and screenshot artifacts.
- [ ] `just test-e2e` remains stable and deterministic in `broadcast` mode.

## Notes

- Keep runtime bounded; split heavy tests into focused cases.
