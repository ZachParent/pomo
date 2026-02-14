# Task Tracker

Last updated: 2026-02-14

## Completed

- [x] Replaced legacy timer logic with deterministic timestamp-based engine.
- [x] Reworked session transport to support `peerjs` (production) and `broadcast` (test mode).
- [x] Rebuilt UI to remove fragile component dependencies and improve mobile behavior.
- [x] Added branded SVG assets (`brandmark.svg`, `favicon.svg`).
- [x] Finalized linting, formatting, and pre-commit automation.
- [x] Added and validated CI/CD workflow for GitHub Actions and Pages deployment.
- [x] Added end-to-end browser tests with screenshot capture.
- [x] Refreshed README and operations docs to match actual workflows.

## Planned Next

- [ ] Add reconnect UX improvements for transient network drops.
- [ ] Add host handoff recovery if host disconnects mid-session.
- [ ] Add optional task board per room with synchronized state.
- [ ] Add timer event history feed with phase transition audit log.
