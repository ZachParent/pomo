# Pomo Relay

Collaborative Pomodoro rooms with direct links and synchronized timers.

## Stack

- Svelte + Vite
- pnpm
- PeerJS (production transport)
- BroadcastChannel (deterministic test transport)

## Quick Start

```bash
just install
just verify
just dev
```

Open: `http://127.0.0.1:5173`

## Room URLs

- Production transport:
  - `/session/<room-name>`
- Deterministic local transport:
  - `/session/<room-name>?transport=broadcast`

Use broadcast mode for repeatable automation and local multi-tab testing.

## Quality Gates

```bash
just lint-tickets
just lint
just typecheck
just test-unit
just test-e2e
just build
```

`just verify` runs all checks (including ticket/index linting).

## Frontend Automation

Playwright end-to-end regression suite:

```bash
just test-e2e
```

Artifacts:

- `artifacts/playwright-report`
- `test-results` (failure traces/videos/screenshots)

Autonomous UI journey with screenshot capture:

```bash
just explore-ui
```

Artifacts:

- `artifacts/screenshots/explore`

## Pre-commit Hooks

```bash
just hooks-install
```

## Documentation

- `/AGENTS.md`
- `/docs/README.md`
- `/docs/architecture.md`
- `/docs/testing.md`
- `/docs/roadmap.md`
- `/docs/tasks.md`
- `/docs/tasks/`

## Deployment

GitHub Actions runs CI and deploys `dist` to GitHub Pages on successful `main` builds.
