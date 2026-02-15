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
- Focus:
  - phase transitions
  - long-break interval behavior
  - timer projection and non-mutating reads
  - catch-up behavior after long delays
  - timer state sanitization, reset, formatting, and progress bounds
  - schedule duration safety logic (`src/lib/scheduleSafety.test.ts`)
  - room theme normalization and token derivation (`src/lib/roomTheme.test.ts`)

Run:

```bash
just test-unit
```

### End-to-End Tests

- Framework: Vitest + Puppeteer
- Location: `tests/e2e/**/*.e2e.test.ts`
- Transport mode: `broadcast` (deterministic local sync)
- Coverage:
  - host flow from room initialization
  - no-stall transition from work to break
  - host/client synchronization in multi-page session
  - active-phase duration-shortening warning + confirmation behavior
  - connecting-state host fallback controls
  - room theme synchronization across participants
  - screenshot capture for visual validation

Run:

```bash
just test-e2e
```

Screenshots are emitted to:

- `artifacts/screenshots/e2e`

### Autonomous UI Exploration

Script:

```bash
just explore-ui
```

This runs a Puppeteer-driven journey and writes screenshots to:

- `artifacts/screenshots/explore`

### Full Verification

```bash
just verify
```

This runs lint, type checks, unit tests, e2e tests, and production build.
