# 0006 - Room Theme Customization (Name, Emoji, Accent Color)

- Status: `ready`
- Priority: `P3`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0006-room-theme-customization`
- Suggested worktree: `../pomo-0006-room-theme`

## Summary

Add room-level delight by allowing a display name, emoji, and a single user-selected accent color (hex/HSL). The UI should derive gradients and preserve readability in both light and dark modes.

## Scope

### In scope

- Add editable room display metadata separate from fixed room ID.
- Add emoji field and single accent color control.
- Generate derived theme tokens (accent, soft accent, gradients) for both theme modes.
- Synchronize room theme metadata across participants.

### Out of scope

- Multi-color theme editor or arbitrary full CSS customization.

## Likely Files

- `src/lib/PomodoroSession.svelte`
- `src/lib/p2pStore.ts`
- `src/lib/themeStore.ts`
- `src/app.css`
- `docs/architecture.md`

## Acceptance Criteria

- [ ] Room has editable display name (distinct from immutable room ID).
- [ ] Room has editable emoji and accent color.
- [ ] Derived styling remains legible in light and dark modes.
- [ ] Metadata/theme settings stay in sync for all room participants.
- [ ] Feature has e2e and/or integration coverage.

## Notes

- Consider extracting color derivation into a pure utility module with unit tests.
