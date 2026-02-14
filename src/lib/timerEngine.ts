export enum TimerPhase {
  Work = "Work",
  ShortBreak = "Short Break",
  LongBreak = "Long Break",
}

export interface TimerState {
  phase: TimerPhase;
  remainingSeconds: number;
  isRunning: boolean;
  workDurationSeconds: number;
  shortBreakDurationSeconds: number;
  longBreakDurationSeconds: number;
  longBreakInterval: number;
  cycleCount: number;
  updatedAtMs: number;
  revision: number;
  alertToken: number;
  lastCompletedPhase: TimerPhase | null;
}

export interface TimerDurations {
  workDurationSeconds: number;
  shortBreakDurationSeconds: number;
  longBreakDurationSeconds: number;
  longBreakInterval: number;
}

export interface TimerDisplayState {
  phase: TimerPhase;
  phaseLabel: string;
  timeLeftSeconds: number;
  formattedTime: string;
  progress: number;
  isRunning: boolean;
  cycleCount: number;
  longBreakInterval: number;
  workDurationSeconds: number;
  shortBreakDurationSeconds: number;
  longBreakDurationSeconds: number;
  revision: number;
  alertToken: number;
}

const SECOND_MS = 1_000;
const MAX_DURATION_SECONDS = 6 * 60 * 60;

export const DEFAULT_DURATIONS: TimerDurations = {
  workDurationSeconds: 25 * 60,
  shortBreakDurationSeconds: 5 * 60,
  longBreakDurationSeconds: 15 * 60,
  longBreakInterval: 4,
};

const clampDuration = (value: number): number => {
  const numeric = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(1, Math.min(MAX_DURATION_SECONDS, numeric));
};

const clampCycleCount = (cycleCount: number, interval: number): number => {
  const numeric = Number.isFinite(cycleCount) ? Math.floor(cycleCount) : 0;
  return Math.max(0, Math.min(interval - 1, numeric));
};

const normalizeDurations = (
  partial: Partial<TimerDurations>
): TimerDurations => {
  const workDurationSeconds = clampDuration(
    partial.workDurationSeconds ?? DEFAULT_DURATIONS.workDurationSeconds
  );
  const shortBreakDurationSeconds = clampDuration(
    partial.shortBreakDurationSeconds ?? DEFAULT_DURATIONS.shortBreakDurationSeconds
  );
  const longBreakDurationSeconds = clampDuration(
    partial.longBreakDurationSeconds ?? DEFAULT_DURATIONS.longBreakDurationSeconds
  );
  const longBreakInterval = Math.max(
    1,
    Math.floor(partial.longBreakInterval ?? DEFAULT_DURATIONS.longBreakInterval)
  );

  return {
    workDurationSeconds,
    shortBreakDurationSeconds,
    longBreakDurationSeconds,
    longBreakInterval,
  };
};

const normalizeState = (state: TimerState): TimerState => {
  const durations = normalizeDurations(state);
  const phaseDuration = getPhaseDuration(state.phase, durations);

  return {
    ...state,
    ...durations,
    remainingSeconds: Math.max(
      0,
      Math.min(phaseDuration, Math.floor(state.remainingSeconds))
    ),
    cycleCount: clampCycleCount(state.cycleCount, durations.longBreakInterval),
    updatedAtMs: Math.max(0, Math.floor(state.updatedAtMs)),
    revision: Math.max(0, Math.floor(state.revision)),
    alertToken: Math.max(0, Math.floor(state.alertToken)),
  };
};

const getPhaseDuration = (
  phase: TimerPhase,
  durations: TimerDurations
): number => {
  if (phase === TimerPhase.Work) {
    return durations.workDurationSeconds;
  }

  if (phase === TimerPhase.ShortBreak) {
    return durations.shortBreakDurationSeconds;
  }

  return durations.longBreakDurationSeconds;
};

const transitionPhase = (
  state: TimerState,
  atMs: number,
  commitTransitions: boolean
): TimerState => {
  let nextPhase: TimerPhase;
  let nextCycleCount = state.cycleCount;

  if (state.phase === TimerPhase.Work) {
    nextCycleCount += 1;
    if (nextCycleCount >= state.longBreakInterval) {
      nextPhase = TimerPhase.LongBreak;
      nextCycleCount = 0;
    } else {
      nextPhase = TimerPhase.ShortBreak;
    }
  } else {
    nextPhase = TimerPhase.Work;
  }

  const nextDuration = getPhaseDuration(nextPhase, state);
  const isRunning = nextPhase !== TimerPhase.Work;

  return {
    ...state,
    phase: nextPhase,
    cycleCount: nextCycleCount,
    remainingSeconds: nextDuration,
    isRunning,
    updatedAtMs: atMs,
    revision: commitTransitions ? state.revision + 1 : state.revision,
    alertToken: commitTransitions ? state.alertToken + 1 : state.alertToken,
    lastCompletedPhase: state.phase,
  };
};

const integrate = (
  state: TimerState,
  nowMs: number,
  commitTransitions: boolean
): TimerState => {
  const safeNow = Math.max(0, Math.floor(nowMs));
  const normalized = normalizeState(state);

  if (!normalized.isRunning || safeNow <= normalized.updatedAtMs) {
    return normalized;
  }

  let elapsedSeconds = Math.floor((safeNow - normalized.updatedAtMs) / SECOND_MS);
  if (elapsedSeconds <= 0) {
    return normalized;
  }

  let cursorMs = normalized.updatedAtMs;
  let current = { ...normalized };

  while (current.isRunning) {
    if (current.remainingSeconds <= 0) {
      current = transitionPhase(current, cursorMs, commitTransitions);
      continue;
    }

    if (elapsedSeconds < current.remainingSeconds) {
      current = {
        ...current,
        remainingSeconds: current.remainingSeconds - elapsedSeconds,
        updatedAtMs: cursorMs + elapsedSeconds * SECOND_MS,
      };
      elapsedSeconds = 0;
      break;
    }

    elapsedSeconds -= current.remainingSeconds;
    cursorMs += current.remainingSeconds * SECOND_MS;
    current = transitionPhase(current, cursorMs, commitTransitions);
  }

  if (elapsedSeconds > 0 && !current.isRunning) {
    current = {
      ...current,
      updatedAtMs: cursorMs,
    };
  }

  return normalizeState(current);
};

const commitPatch = (
  state: TimerState,
  patch: Partial<TimerState>,
  nowMs: number
): TimerState => {
  const merged = normalizeState({
    ...state,
    ...patch,
    updatedAtMs: Math.max(0, Math.floor(nowMs)),
    revision: state.revision + 1,
  });

  if (timerStateEquals(state, merged)) {
    return state;
  }

  return merged;
};

export const createInitialTimerState = (
  nowMs: number = Date.now(),
  durations: Partial<TimerDurations> = {}
): TimerState => {
  const normalizedDurations = normalizeDurations(durations);

  return {
    phase: TimerPhase.Work,
    remainingSeconds: normalizedDurations.workDurationSeconds,
    isRunning: false,
    ...normalizedDurations,
    cycleCount: 0,
    updatedAtMs: Math.max(0, Math.floor(nowMs)),
    revision: 0,
    alertToken: 0,
    lastCompletedPhase: null,
  };
};

export const synchronizeTimerState = (
  state: TimerState,
  nowMs: number = Date.now(),
  commitTransitions = true
): TimerState => integrate(state, nowMs, commitTransitions);

export const projectTimerState = (
  state: TimerState,
  nowMs: number = Date.now()
): TimerState => integrate(state, nowMs, false);

export const startTimerState = (
  state: TimerState,
  nowMs: number = Date.now()
): TimerState => {
  const synced = integrate(state, nowMs, true);
  if (synced.isRunning) {
    return synced;
  }

  let next = synced;
  if (next.remainingSeconds <= 0) {
    next = transitionPhase(next, nowMs, true);
    if (next.isRunning) {
      return next;
    }
  }

  return commitPatch(next, { isRunning: true }, nowMs);
};

export const pauseTimerState = (
  state: TimerState,
  nowMs: number = Date.now()
): TimerState => {
  const synced = integrate(state, nowMs, true);
  if (!synced.isRunning) {
    return synced;
  }

  return commitPatch(synced, { isRunning: false }, nowMs);
};

export const resetTimerState = (
  state: TimerState,
  nowMs: number = Date.now()
): TimerState => {
  const next = createInitialTimerState(nowMs, state);
  next.revision = state.revision + 1;
  next.alertToken = state.alertToken;
  return next;
};

export const setCycleInfoState = (
  state: TimerState,
  cycleCount: number,
  longBreakInterval: number,
  nowMs: number = Date.now()
): TimerState => {
  const synced = integrate(state, nowMs, true);
  const nextLongBreakInterval = Math.max(1, Math.floor(longBreakInterval));
  const nextCycleCount = clampCycleCount(cycleCount, nextLongBreakInterval);

  return commitPatch(
    synced,
    {
      cycleCount: nextCycleCount,
      longBreakInterval: nextLongBreakInterval,
    },
    nowMs
  );
};

export const setTimeLeftState = (
  state: TimerState,
  remainingSeconds: number,
  nowMs: number = Date.now()
): TimerState => {
  const synced = integrate(state, nowMs, true);
  const phaseDuration = getPhaseDuration(synced.phase, synced);
  const nextRemaining = Math.max(
    0,
    Math.min(phaseDuration, Math.floor(remainingSeconds))
  );

  return commitPatch(
    synced,
    {
      remainingSeconds: nextRemaining,
    },
    nowMs
  );
};

export const setDurationsState = (
  state: TimerState,
  durations: Partial<TimerDurations>,
  nowMs: number = Date.now()
): TimerState => {
  const synced = integrate(state, nowMs, true);
  const normalizedDurations = normalizeDurations({
    workDurationSeconds: durations.workDurationSeconds ?? synced.workDurationSeconds,
    shortBreakDurationSeconds:
      durations.shortBreakDurationSeconds ?? synced.shortBreakDurationSeconds,
    longBreakDurationSeconds:
      durations.longBreakDurationSeconds ?? synced.longBreakDurationSeconds,
    longBreakInterval: durations.longBreakInterval ?? synced.longBreakInterval,
  });

  const phaseDuration = getPhaseDuration(synced.phase, normalizedDurations);
  const nextCycleCount = clampCycleCount(
    synced.cycleCount,
    normalizedDurations.longBreakInterval
  );

  return commitPatch(
    synced,
    {
      ...normalizedDurations,
      cycleCount: nextCycleCount,
      remainingSeconds: Math.min(synced.remainingSeconds, phaseDuration),
    },
    nowMs
  );
};

export const timerStateEquals = (a: TimerState, b: TimerState): boolean =>
  a.phase === b.phase &&
  a.remainingSeconds === b.remainingSeconds &&
  a.isRunning === b.isRunning &&
  a.workDurationSeconds === b.workDurationSeconds &&
  a.shortBreakDurationSeconds === b.shortBreakDurationSeconds &&
  a.longBreakDurationSeconds === b.longBreakDurationSeconds &&
  a.longBreakInterval === b.longBreakInterval &&
  a.cycleCount === b.cycleCount &&
  a.updatedAtMs === b.updatedAtMs &&
  a.revision === b.revision &&
  a.alertToken === b.alertToken &&
  a.lastCompletedPhase === b.lastCompletedPhase;

export const formatTimer = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export const toTimerDisplayState = (
  state: TimerState,
  nowMs: number = Date.now()
): TimerDisplayState => {
  const projected = projectTimerState(state, nowMs);
  const phaseDuration = getPhaseDuration(projected.phase, projected);
  const progress =
    phaseDuration > 0
      ? (phaseDuration - projected.remainingSeconds) / phaseDuration
      : 0;

  return {
    phase: projected.phase,
    phaseLabel: projected.phase,
    timeLeftSeconds: projected.remainingSeconds,
    formattedTime: formatTimer(projected.remainingSeconds),
    progress: Math.max(0, Math.min(1, progress)),
    isRunning: projected.isRunning,
    cycleCount: projected.cycleCount,
    longBreakInterval: projected.longBreakInterval,
    workDurationSeconds: projected.workDurationSeconds,
    shortBreakDurationSeconds: projected.shortBreakDurationSeconds,
    longBreakDurationSeconds: projected.longBreakDurationSeconds,
    revision: projected.revision,
    alertToken: projected.alertToken,
  };
};

export const sanitizeTimerState = (state: TimerState): TimerState =>
  normalizeState(state);
