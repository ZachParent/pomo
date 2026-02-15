# 0001 - Remove Brandmark Artifact Line

- Status: `done`
- Priority: `P2`
- Type: `bug`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0001-logo-artifact`
- Suggested worktree: `../pomo-0001-logo`

## Summary

At small sizes, the current brandmark appears to have an unintended line artifact through the logo. This degrades perceived quality and makes the icon look visually broken.

## Scope

### In scope

- Adjust `public/brandmark.svg` to remove the artifact.
- Validate legibility at header icon sizes in both light and dark themes.

### Out of scope

- Full rebrand or new logo concept.

## Likely Files

- `public/brandmark.svg`

## Acceptance Criteria

- [x] Brandmark has no visible unintended line artifact at typical app sizes.
- [x] Header layout still renders cleanly in desktop and mobile widths.
- [x] Existing favicon/brand references remain intact.

## Notes

- `public/brandmark.svg` now uses simplified dial geometry and removes the prior thin relay line path that was producing the artifact.
