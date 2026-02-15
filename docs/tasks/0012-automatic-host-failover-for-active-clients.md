# 0012 - Automatic Host Failover For Active Clients

- Status: `done`
- Priority: `P1`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0012-automatic-host-failover`
- Suggested worktree: `../pomo-0012-host-failover`

## Summary

When the active host dropped, clients entered a degraded state and required manual host startup. This work adds automatic client takeover so the session timer remains continuous when host connectivity is lost.

## Scope

### In scope

- Detect stale/missing host connectivity for active clients.
- Promote disconnected clients to host automatically with deterministic backoff.
- Preserve local timer continuity during takeover (no reset to defaults).
- Handle host-claim races by reconnecting losing contenders to the new host.
- Add e2e regression coverage for host disconnect failover behavior.

### Out of scope

- Full multi-client consensus/election protocol.
- Cross-room persistence for failover history.

## Likely Files

- `src/lib/p2pStore.ts`
- `tests/e2e/session.spec.ts`

## Acceptance Criteria

- [x] Connected client auto-promotes to host after host becomes unavailable.
- [x] Timer display remains continuous through failover and does not reset.
- [x] CI/e2e coverage includes host-disconnect takeover regression test.
- [x] `just verify` passes.

## Notes

- Added client healthcheck probing (`REQUEST_STATE`) and stale-host detection.
- Added takeover jitter to reduce concurrent host-claim collisions.
