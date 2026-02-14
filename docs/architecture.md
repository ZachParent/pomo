# Architecture

## Overview

Pomo Relay is a client-side Svelte app built with Vite and pnpm. Users join a room by URL and synchronize a collaborative timer through one of two transports:

- `peerjs` for production cross-user connectivity.
- `broadcast` for deterministic local multi-tab automation and e2e tests.

## High-Level Components

1. UI

- `src/App.svelte`: shell, routing, theme toggle.
- `src/lib/Home.svelte`: room entry and route handoff.
- `src/lib/PomodoroSession.svelte`: connection lifecycle and host/join controls.
- `src/lib/PomodoroTimer.svelte`: timer rendering, controls, schedule editing, alerts.

2. Timer Core

- `src/lib/timerEngine.ts`: pure timer state machine with deterministic projection/synchronization.
- `src/lib/timerStore.ts`: Svelte store wrapper for state mutation and conflict-safe remote updates.

3. Collaboration Transport

- `src/lib/p2pStore.ts`: runtime session orchestration, host heartbeats, action forwarding, state broadcast.

## Timer Model

The timer uses a canonical state snapshot with:

- `remainingSeconds` at `updatedAtMs`.
- phase, running state, cycle counters, durations.
- monotonic `revision` for ordering.
- `alertToken` for phase-change notifications.

Host synchronization uses elapsed-time integration, not naive decrement loops. This avoids drift and catches up after tab throttling.

## Synchronization Strategy

1. Host is authoritative for committed state transitions.
2. Clients send action requests (`start`, `pause`, `reset`, `set time`, `set cycles`, `set durations`).
3. Host applies action, updates timer state, broadcasts full snapshot.
4. Clients accept newer snapshots based on `revision` and `updatedAtMs`.
5. Host heartbeat periodically synchronizes and rebroadcasts running timer state.

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
- Connection timeout explicitly surfaces host fallback UX.
- Host heartbeat reconciles delayed timers and rebroadcasts canonical state.
- UI projects timer display from state+clock to avoid visual freezes.

## Assets and Branding

- `public/brandmark.svg`: app brand symbol.
- `public/favicon.svg`: dedicated favicon used by `index.html`.

## Known Constraints

- `broadcast` transport does not cross devices or browsers.
- PeerJS connectivity depends on broker/network conditions.
- Host disconnect currently requires manual recovery (future work in roadmap).
