import { describe, expect, it } from "vitest";
import { TimerPhase, type TimerDisplayState } from "./timerEngine";
import {
  minutesToSeconds,
  toDurationPayload,
  willShortenActivePhase,
} from "./scheduleSafety";

const createDisplayState = (
  patch: Partial<TimerDisplayState> = {}
): TimerDisplayState => ({
  phase: TimerPhase.Work,
  phaseLabel: TimerPhase.Work,
  timeLeftSeconds: 20 * 60,
  formattedTime: "20:00",
  progress: 0.2,
  isRunning: true,
  cycleCount: 1,
  longBreakInterval: 4,
  workDurationSeconds: 25 * 60,
  shortBreakDurationSeconds: 5 * 60,
  longBreakDurationSeconds: 15 * 60,
  revision: 1,
  alertToken: 0,
  ...patch,
});

describe("scheduleSafety", () => {
  it("clamps minutes to positive bounded seconds", () => {
    expect(minutesToSeconds(0)).toBe(60);
    expect(minutesToSeconds(6 * 60 + 100)).toBe(6 * 60 * 60);
    expect(minutesToSeconds(Number.NaN)).toBe(60);
  });

  it("builds duration payloads from minutes", () => {
    expect(
      toDurationPayload({
        workMinutes: 30,
        shortBreakMinutes: 7,
        longBreakMinutes: 20,
      })
    ).toEqual({
      workDurationSeconds: 1800,
      shortBreakDurationSeconds: 420,
      longBreakDurationSeconds: 1200,
    });
  });

  it("detects when active running phase would be shortened", () => {
    const view = createDisplayState({
      phase: TimerPhase.Work,
      timeLeftSeconds: 12 * 60,
      isRunning: true,
    });

    expect(
      willShortenActivePhase(view, {
        workMinutes: 8,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
      })
    ).toBe(true);
  });

  it("does not require confirmation when timer is paused", () => {
    const paused = createDisplayState({
      isRunning: false,
      timeLeftSeconds: 12 * 60,
    });

    expect(
      willShortenActivePhase(paused, {
        workMinutes: 8,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
      })
    ).toBe(false);
  });

  it("checks short-break phase duration when determining confirmation", () => {
    const shortBreak = createDisplayState({
      phase: TimerPhase.ShortBreak,
      timeLeftSeconds: 4 * 60,
      isRunning: true,
    });

    expect(
      willShortenActivePhase(shortBreak, {
        workMinutes: 25,
        shortBreakMinutes: 3,
        longBreakMinutes: 15,
      })
    ).toBe(true);
  });

  it("checks long-break phase duration when determining confirmation", () => {
    const longBreak = createDisplayState({
      phase: TimerPhase.LongBreak,
      timeLeftSeconds: 4 * 60,
      isRunning: true,
    });

    expect(
      willShortenActivePhase(longBreak, {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 6,
      })
    ).toBe(false);
  });
});
