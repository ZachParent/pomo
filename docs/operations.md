# Operations Runbook

## Environment

- Node.js: `>=20`
- Package manager: `pnpm`

## Local Workflow

```bash
just install
just verify
just dev
```

## Frequently Used Commands

- `just lint`
- `just typecheck`
- `just test-unit`
- `just test-e2e`
- `just build`
- `just explore-ui`

## Pre-commit Hooks

Install hooks once:

```bash
just hooks-install
```

Run all hooks manually:

```bash
just hooks-run
```

## Deployment

- Deployment target: GitHub Pages
- Build output directory: `dist`
- Base path: `/pomo/` in production
- Workflow gates:
  - lint
  - typecheck
  - unit tests
  - e2e tests
  - build

## Incident Checklist

If users report timer stalls:

1. Reproduce with `just test-e2e`.
2. Run `just explore-ui` and inspect screenshots.
3. Verify host heartbeat and phase transition logs in browser console.
4. Confirm no stale room ID prefix mismatch (`VITE_PEERJS_ID_PREFIX`).
