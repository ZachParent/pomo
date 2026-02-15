import { describe, expect, it } from "vitest";
import {
  DEFAULT_DURATIONS,
  TimerPhase,
  createInitialTimerState,
  formatTimer,
  pauseTimerState,
  projectTimerState,
  resetTimerState,
  sanitizeTimerState,
  setCycleInfoState,
  setDurationsState,
  setTimeLeftState,
  startTimerState,
  synchronizeTimerState,
  timerStateEquals,
  toTimerDisplayState,
} from "./timerEngine";

describe("timerEngine", () => {
  it("counts down and transitions work into short break", () => {
    let state = createInitialTimerState(0);
    state = setDurationsState(
      state,
      {
        workDurationSeconds: 3,
        shortBreakDurationSeconds: 5,
      },
      0
    );
    state = setTimeLeftState(state, 3, 0);
    state = startTimerState(state, 0);

    state = synchronizeTimerState(state, 3_100, true);

    expect(state.phase).toBe(TimerPhase.ShortBreak);
    expect(state.remainingSeconds).toBe(5);
    expect(state.isRunning).toBe(true);
    expect(state.alertToken).toBe(1);
    expect(state.cycleCount).toBe(1);
  });

  it("auto-starts breaks but pauses on work phase", () => {
    let state = createInitialTimerState(0);
    state = setDurationsState(
      state,
      {
        workDurationSeconds: 2,
        shortBreakDurationSeconds: 1,
      },
      0
    );
    state = setTimeLeftState(state, 2, 0);
    state = startTimerState(state, 0);

    state = synchronizeTimerState(state, 5_000, true);

    expect(state.phase).toBe(TimerPhase.Work);
    expect(state.remainingSeconds).toBe(2);
    expect(state.isRunning).toBe(false);
    expect(state.alertToken).toBe(2);
  });

  it("supports long break intervals correctly", () => {
    let state = createInitialTimerState(0);
    state = setCycleInfoState(state, 0, 2, 0);
    state = setDurationsState(
      state,
      {
        workDurationSeconds: 2,
        shortBreakDurationSeconds: 1,
        longBreakDurationSeconds: 3,
      },
      0
    );

    state = setTimeLeftState(state, 2, 0);
    state = startTimerState(state, 0);
    state = synchronizeTimerState(state, 2_100, true);
    expect(state.phase).toBe(TimerPhase.ShortBreak);
    expect(state.cycleCount).toBe(1);

    state = synchronizeTimerState(state, 3_200, true);
    state = startTimerState(state, 3_200);
    state = synchronizeTimerState(state, 5_400, true);

    expect(state.phase).toBe(TimerPhase.LongBreak);
    expect(state.cycleCount).toBe(0);
  });

  it("projects future state without mutating revision counters", () => {
    let state = createInitialTimerState(0);
    state = setDurationsState(
      state,
      {
        workDurationSeconds: 10,
      },
      0
    );
    state = setTimeLeftState(state, 10, 0);
    state = startTimerState(state, 0);

    const projected = projectTimerState(state, 4_200);

    expect(projected.remainingSeconds).toBe(6);
    expect(projected.revision).toBe(state.revision);
    expect(projected.alertToken).toBe(state.alertToken);
    expect(state.remainingSeconds).toBe(10);
  });

  it("clamps invalid timer values through sanitizeTimerState", () => {
    const sanitized = sanitizeTimerState({
      phase: TimerPhase.Work,
      remainingSeconds: -42,
      isRunning: false,
      workDurationSeconds: 0,
      shortBreakDurationSeconds: 0,
      longBreakDurationSeconds: Number.POSITIVE_INFINITY,
      longBreakInterval: 0,
      cycleCount: 999,
      updatedAtMs: -10,
      revision: -4,
      alertToken: -3,
      lastCompletedPhase: null,
    });

    expect(sanitized.remainingSeconds).toBe(0);
    expect(sanitized.workDurationSeconds).toBe(1);
    expect(sanitized.shortBreakDurationSeconds).toBe(1);
    expect(sanitized.longBreakDurationSeconds).toBe(1);
    expect(sanitized.longBreakInterval).toBe(1);
    expect(sanitized.cycleCount).toBe(0);
    expect(sanitized.updatedAtMs).toBe(0);
    expect(sanitized.revision).toBe(0);
    expect(sanitized.alertToken).toBe(0);
  });

  it("resets state while preserving alert token and incrementing revision", () => {
    let state = createInitialTimerState(1000);
    state = setTimeLeftState(state, 20, 1000);
    state = startTimerState(state, 1000);
    state = synchronizeTimerState(state, 4000, true);

    const reset = resetTimerState(state, 5000);

    expect(reset.phase).toBe(TimerPhase.Work);
    expect(reset.remainingSeconds).toBe(state.workDurationSeconds);
    expect(reset.isRunning).toBe(false);
    expect(reset.revision).toBe(state.revision + 1);
    expect(reset.alertToken).toBe(state.alertToken);
  });

  it("does not mutate when pausing an already paused timer", () => {
    const state = createInitialTimerState(0);
    const paused = pauseTimerState(state, 0);
    expect(timerStateEquals(state, paused)).toBe(true);
  });

  it("clamps long cycle counts after interval changes", () => {
    let state = createInitialTimerState(0);
    state = setCycleInfoState(state, 10, 3, 0);

    expect(state.cycleCount).toBe(2);
    expect(state.longBreakInterval).toBe(3);
  });

  it("formats timer strings with minute/second padding", () => {
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(7)).toBe("00:07");
    expect(formatTimer(120)).toBe("02:00");
  });

  it("constrains display progress between 0 and 1", () => {
    const state = createInitialTimerState(0, {
      ...DEFAULT_DURATIONS,
      workDurationSeconds: 4,
    });

    const displayAtStart = toTimerDisplayState(state, 0);
    const displayFuture = toTimerDisplayState(
      { ...state, isRunning: true, remainingSeconds: 1 },
      20_000
    );

    expect(displayAtStart.progress).toBe(0);
    expect(displayFuture.progress).toBeLessThanOrEqual(1);
    expect(displayFuture.progress).toBeGreaterThanOrEqual(0);
  });

  it("does not decrement when less than one second has elapsed", () => {
    let state = createInitialTimerState(0, {
      ...DEFAULT_DURATIONS,
      workDurationSeconds: 10,
    });
    state = setTimeLeftState(state, 10, 0);
    state = startTimerState(state, 0);

    const synced = synchronizeTimerState(state, 500, true);
    expect(synced.remainingSeconds).toBe(10);
    expect(synced.updatedAtMs).toBe(0);
  });

  it("transitions immediately when starting with zero remaining work time", () => {
    const state = createInitialTimerState(0, {
      ...DEFAULT_DURATIONS,
      shortBreakDurationSeconds: 7,
    });

    const started = startTimerState(
      {
        ...state,
        remainingSeconds: 0,
      },
      1_000
    );

    expect(started.phase).toBe(TimerPhase.ShortBreak);
    expect(started.remainingSeconds).toBe(7);
    expect(started.isRunning).toBe(true);
  });

  it("pauses active timers and increments revision", () => {
    let state = createInitialTimerState(0);
    state = setTimeLeftState(state, 10, 0);
    state = startTimerState(state, 0);

    const paused = pauseTimerState(state, 1_000);
    expect(paused.isRunning).toBe(false);
    expect(paused.revision).toBeGreaterThan(state.revision);
  });

  it("increments revision when setting time left even if seconds are unchanged", () => {
    const state = createInitialTimerState(0);
    const sameState = setTimeLeftState(state, state.remainingSeconds, 0);
    expect(sameState.remainingSeconds).toBe(state.remainingSeconds);
    expect(sameState.revision).toBe(state.revision + 1);
  });

  it("keeps running timer active when start is requested twice", () => {
    let state = createInitialTimerState(0);
    state = setTimeLeftState(state, 10, 0);
    state = startTimerState(state, 0);

    const startedAgain = startTimerState(state, 0);
    expect(startedAgain.isRunning).toBe(true);
  });
});
