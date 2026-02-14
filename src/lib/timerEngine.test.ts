import { describe, expect, it } from "vitest";
import {
  TimerPhase,
  createInitialTimerState,
  projectTimerState,
  setCycleInfoState,
  setDurationsState,
  setTimeLeftState,
  startTimerState,
  synchronizeTimerState,
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
});
