# Architecture

## Overview

Pomo Collabo is a client-side Svelte app built with Vite and pnpm. Users join a room by URL and synchronize a collaborative timer through one of two transports:

- `peerjs` for production cross-user connectivity.
- `broadcast` for deterministic local multi-tab automation and e2e tests.

Room sessions now include synchronized room theme metadata (`displayName`, `emoji`, `accentColor`) alongside timer state, with host-authoritative revisions.

## High-Level Components

1. UI

- `src/App.svelte`: shell, pathname-based view selection, compact layout structure, icon-based theme toggle.
- `src/lib/Home.svelte`: room entry and route handoff.
- `src/lib/PomodoroSession.svelte`: connection lifecycle, host/join fallback actions, and session-level theme styling.
- `src/lib/PomodoroTimer.svelte`: timer rendering, compact primary controls, responsive settings modal/sheet, live room-theme editing, hidden-tab-safe alerts, and per-user sound selection.
- `src/lib/navigation.ts`: lightweight programmatic navigation helper that pushes/replaces history and emits `popstate` to keep app view state synchronized.

2. Timer Core

- `src/lib/timerEngine.ts`: pure timer state machine with deterministic projection/synchronization.
- `src/lib/timerStore.ts`: Svelte store wrapper for state mutation and conflict-safe remote updates.
- `src/lib/scheduleSafety.ts`: pure helpers for duration payload normalization and active-phase shortening detection.
- `src/lib/alertFeedback.ts`: pure helper to determine when UI should fire alert feedback across token-based and projected phase transitions.

3. Room Theme

- `src/lib/roomTheme.ts`: metadata sanitization (display name, emoji, accent color) and derived CSS token generation for light/dark modes.

4. Collaboration Transport

- `src/lib/p2pStore.ts`: runtime session orchestration, host heartbeats, client host-health probing, automatic host takeover, timer action forwarding, timer state broadcast, room theme patch/update synchronization.

5. UI Integrations

- `emoji-picker-element`: lazy-loaded web component used inside settings for full emoji selection.

5. Browser Regression Harness

- `playwright.config.ts`: deterministic Playwright harness with preview web server bootstrapping, failure traces/videos/screenshots, and HTML report output.
- `tests/e2e/*.spec.ts`: broadcast-mode multi-page flow coverage for host, client, timer control, synchronization, and room theme behaviors.

## Timer Model

The timer uses a canonical state snapshot with:

- `remainingSeconds` at `updatedAtMs`.
- phase, running state, cycle counters, durations.
- monotonic `revision` for ordering.
- `alertToken` for phase-change notifications.

Host synchronization uses elapsed-time integration, not naive decrement loops. This avoids drift and catches up after tab throttling.

## Synchronization Strategy

1. Host is authoritative for both timer and room theme updates.
2. Clients send timer action requests (`start`, `pause`, `reset`, `set time`, `set cycles`, `set durations`) and room theme patch requests (`REQUEST_SET_ROOM_THEME`).
3. Host applies actions, increments corresponding revisions, and broadcasts full timer snapshots (`STATE_UPDATE`) and room theme updates (`ROOM_THEME_UPDATE`).
4. Clients accept timer snapshots by timer revision/timestamp and theme updates by monotonic `roomThemeRevision`.
5. Host heartbeat periodically synchronizes and rebroadcasts running timer state; room theme is rebroadcast on initial state request and when changed.
6. Session links use root query routing (`/?room=<room-name>`) as the canonical entry path for both host and peers.

## Schedule Safety Behavior

- Duration edits and cycle edits are separated in the UI to make impact explicit.
- When a running phase would be shortened by a duration change, first submit shows warning text and second submit confirms the change.
- Confirmation draft is reset when a newer timer revision is received.

## Transport Modes

### PeerJS (`peerjs`)

- Real multi-user connectivity via PeerJS broker.
- Used for deployed GitHub Pages sessions.
- Host binds to deterministic `roomId` (`VITE_PEERJS_ID_PREFIX + roomName`).

### Broadcast (`broadcast`)

- Uses browser `BroadcastChannel`.
- Deterministic, local-only, ideal for automated tests.
- Activated with URL query `?transport=broadcast`.

## Reliability Decisions

- Runtime token guard prevents stale event handlers from mutating new sessions.
- App-level pathname parsing avoids root-route activation stalls and keeps home/session rendering deterministic under the `/pomo/` base path.
- Room names are validated against a strict `[A-Za-z0-9-]+` pattern at entry. Invalid names are blocked with an inline warning while preserving layout height.
- Connecting-state host fallback actions are available when `canBecomeHost` is true, without waiting for timeout expiration.
- Host heartbeat reconciles delayed timers and rebroadcasts canonical state.
- UI projects timer display from state+clock to avoid visual freezes and includes a phase-transition fallback path for alert feedback when token commits lag behind projected transitions.
- Alert playback includes retrying behavior for suppressed audio while hidden, with periodic attempts and immediate retry stop on first successful playback attempt.
- Room theme updates are sanitized and ignored when stale (`roomThemeRevision` ordering).
- Settings are hidden by default and rendered as a modal (desktop) / bottom sheet (mobile) to keep the timer surface one-screen dense.
- Theme edits (name, accent, emoji) dispatch immediately without save/cancel confirmation state.
- Connected clients probe host liveness and automatically promote to host when stale-host thresholds are exceeded, preserving local timer state across takeover.

## Assets and Branding

- `public/brandmark.svg`: app brand symbol.
- `public/favicon.svg`: dedicated favicon used by `index.html`.

## Known Constraints

- `broadcast` transport does not cross devices or browsers.
- PeerJS connectivity depends on broker/network conditions.
- Host disconnect currently requires manual recovery (future work in roadmap).
- Visual regression validation still relies on screenshot capture rather than baseline image diffing.
