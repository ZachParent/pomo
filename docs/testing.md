# Testing Strategy

## Goals

1. Verify deterministic timer transitions and cycle behavior.
2. Verify cross-participant synchronization in real browser flows.
3. Verify schedule-safety and room-theme logic via fast deterministic unit tests.
4. Capture screenshots during automation to validate rendered behavior.

## Test Layers

### Documentation Consistency Checks

- Script: `scripts/lint-tickets.mjs`
- Command: `just lint-tickets`
- Coverage:
  - ticket files in `docs/tasks/` match required template structure
  - ticket metadata values are valid
  - `docs/tasks.md` links only existing tickets
  - open/completed sections align with ticket status values

### Unit Tests

- Framework: Vitest
- Location: `src/**/*.test.ts`
- Coverage threshold gate (`vitest.config.ts`):
  - statements: `>= 97%`
  - branches: `>= 92%`
  - functions: `>= 100%`
  - lines: `>= 97%`
- Focus:
  - phase transitions
  - long-break interval behavior
  - timer projection and non-mutating reads
  - catch-up behavior after long delays
  - timer state sanitization, reset, formatting, and progress bounds
  - schedule duration safety logic (`src/lib/scheduleSafety.test.ts`)
  - alert transition fallback/suppression logic (`src/lib/alertFeedback.test.ts`)
  - room theme normalization and token derivation (`src/lib/roomTheme.test.ts`)

Run:

```bash
just test-unit
```

### End-to-End Tests

- Framework: Playwright Test
- Location: `tests/e2e/**/*.spec.ts`
- Transport mode: `broadcast` (deterministic local sync)
- Coverage:
  - home route renders room controls immediately on first load (no theme-toggle workaround required)
  - connecting-state host fallback controls
  - pre-connect theme controls are shown as locked/non-actionable
  - host lifecycle (start/pause/reset/leave)
  - no-stall transition from work to break
  - remaining-time editing is explicit (non-hover) and always directly actionable
  - cycle settings and duration settings behavior
  - active-phase duration-shortening warning + confirmation behavior
  - alert sound preference selection and persistence
  - host/client synchronization in multi-page sessions
  - client-issued control requests (pause/time edits)
  - room theme synchronization plus draft reset behavior
  - host-only invite-link controls and clipboard copy behavior
  - late-join synchronization behavior
  - transport labeling and route assertions in broadcast mode
  - copy-button timeout behavior and no-op theme submit behavior

Run:

```bash
just test-e2e
```

Reports and artifacts are emitted to:

- `artifacts/playwright-report`
- `test-results` (on failure, includes traces/videos/screenshots)

### Autonomous UI Exploration

Script:

```bash
just explore-ui
```

This runs a Playwright-driven journey and writes screenshots to:

- `artifacts/screenshots/explore`

### Full Verification

```bash
just verify
```

This runs lint, type checks, unit tests, e2e tests, and production build.
