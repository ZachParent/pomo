# Ticket Files

This folder contains one task per file so work can be parallelized across agents.

## Naming

- Format: `NNNN-short-slug.md`
- `NNNN` is zero-padded and monotonic.

## Status Values

- `ready`: scoped and ready to pick up
- `in_progress`: actively being worked
- `blocked`: cannot proceed without dependency/decision
- `done`: accepted and merged

## Parallel Workflow

1. Pick a `ready` ticket from `docs/tasks.md`.
2. Create a worktree and branch dedicated to that ticket.
3. Update the ticket `status`, `owner`, and `updated` date.
4. Keep all scope notes and acceptance criteria current in the ticket file.
5. Merge and mark the ticket `done`.

## Validation

- Run `just lint-tickets` to validate ticket templates and index consistency.
- `just lint` and `just verify` include ticket linting.

## Required Updates

- Keep `docs/tasks.md` in sync with ticket status changes.
- If architecture/behavior changes while resolving a ticket, also update:
  - `README.md`
  - `docs/architecture.md`
  - `docs/roadmap.md`
