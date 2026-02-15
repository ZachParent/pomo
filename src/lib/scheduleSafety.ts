import { TimerPhase, type TimerDisplayState, type TimerDurations } from "./timerEngine";

const MAX_MINUTES = 6 * 60;

const clampMinutes = (value: number): number => {
  const numeric = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(1, Math.min(MAX_MINUTES, numeric));
};

export interface DurationMinutesInput {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export const minutesToSeconds = (value: number): number => clampMinutes(value) * 60;

export const toDurationPayload = (
  input: DurationMinutesInput
): Pick<
  TimerDurations,
  "workDurationSeconds" | "shortBreakDurationSeconds" | "longBreakDurationSeconds"
> => ({
  workDurationSeconds: minutesToSeconds(input.workMinutes),
  shortBreakDurationSeconds: minutesToSeconds(input.shortBreakMinutes),
  longBreakDurationSeconds: minutesToSeconds(input.longBreakMinutes),
});

const phaseDurationFromPayload = (
  phase: TimerPhase,
  payload: ReturnType<typeof toDurationPayload>
): number => {
  if (phase === TimerPhase.Work) {
    return payload.workDurationSeconds;
  }

  if (phase === TimerPhase.ShortBreak) {
    return payload.shortBreakDurationSeconds;
  }

  return payload.longBreakDurationSeconds;
};

export const willShortenActivePhase = (
  view: TimerDisplayState,
  input: DurationMinutesInput
): boolean => {
  if (!view.isRunning) {
    return false;
  }

  const payload = toDurationPayload(input);
  const nextPhaseDuration = phaseDurationFromPayload(view.phase, payload);
  return nextPhaseDuration < view.timeLeftSeconds;
};
