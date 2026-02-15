# 0006 - Room Theme Customization (Name, Emoji, Accent Color)

- Status: `done`
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
- `src/lib/roomTheme.ts`
- `src/lib/roomTheme.test.ts`
- `src/app.css`
- `docs/architecture.md`

## Acceptance Criteria

- [x] Room has editable display name (distinct from immutable room ID).
- [x] Room has editable emoji and accent color.
- [x] Derived styling remains legible in light and dark modes.
- [x] Metadata/theme settings stay in sync for all room participants.
- [x] Feature has automated utility coverage.

## Notes

- Theme metadata now synchronizes through host-authoritative `ROOM_THEME_UPDATE` messages with monotonic `roomThemeRevision`.
- `src/lib/roomTheme.ts` handles sanitization and token derivation; `src/lib/roomTheme.test.ts` covers normalization, merge behavior, token derivation, and equality semantics.
