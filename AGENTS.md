# AGENTS.md

This repository is optimized for autonomous and human contributors.

## Core Rules

1. Use `just` as the command entrypoint for all routine tasks.
2. Keep `README.md`, `docs/architecture.md`, and `docs/roadmap.md` current with code changes.
3. Update `docs/tasks.md` and `docs/tasks/*.md` as work progresses. Do not leave stale ticket state.
4. Prefer deterministic behavior and tests over assumptions.
5. Do not merge changes that skip `just verify`.
6. Ticket docs must pass `just lint-tickets` (template + index consistency).

## Fast Start

```bash
just install
just verify
just dev
```

## Agent Command Workflow

Agents can author runnable scripts in `.agent/commands/` and execute them with:

```bash
just agent-run <name>
```

Create a new executable command stub with:

```bash
just agent-new <name>
```

This keeps command execution explicit, versioned, and permission-friendly.

## Required Documentation Updates

When architecture or behavior changes:

1. Update `docs/architecture.md`.
2. Update `docs/testing.md` if verification changes.
3. Update `docs/roadmap.md` for future-facing ideas and follow-ons.
4. Update `docs/tasks.md` with status and dates.
5. Update the corresponding `docs/tasks/NNNN-*.md` file for the work item.

## Quality Gates

All changes should pass:

```bash
just lint-tickets
just lint
just typecheck
just test-unit
just test-e2e
just build
```

`just verify` runs the full sequence.

## Pre-commit

Install hooks once per clone:

```bash
just hooks-install
```

Run manually:

```bash
just hooks-run
```

## CI/CD Expectations

GitHub Actions runs lint, typecheck, unit tests, e2e tests, and build checks.
Deploys to GitHub Pages happen only after quality checks succeed on `main`.

## Testing Modes

- `peerjs`: production room transport for real users.
- `broadcast`: deterministic local transport for automated e2e tests.

Use `?transport=broadcast` in URLs for deterministic browser automation.
