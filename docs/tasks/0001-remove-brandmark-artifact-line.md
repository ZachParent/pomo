# 0001 - Remove Brandmark Artifact Line

- Status: `ready`
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
- `src/App.svelte`

## Acceptance Criteria

- [ ] Brandmark has no visible unintended line artifact at typical app sizes.
- [ ] Header layout still renders cleanly in desktop and mobile widths.
- [ ] Existing favicon/brand references remain intact.

## Notes

- Keep geometry simple to avoid anti-aliasing artifacts at small scale.
