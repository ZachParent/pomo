import { writable } from "svelte/store";

// Define Timer Phases
export enum TimerPhase {
  Work = "Work",
  ShortBreak = "Short Break",
  LongBreak = "Long Break",
}

// Define Timer State Structure
export interface TimerState {
  phase: TimerPhase;
  timeLeft: number; // Seconds
  isRunning: boolean;
  // Settings (can be expanded later)
  workDuration: number; // Seconds
  shortBreakDuration: number; // Seconds
  longBreakDuration: number; // Seconds
  longBreakInterval: number; // Number of work cycles before a long break
  cycleCount: number; // How many work cycles completed in the current sequence
}

// Initial State Configuration
const DEFAULT_WORK_DURATION = 25 * 60; // 25 minutes
const DEFAULT_SHORT_BREAK_DURATION = 5 * 60; // 5 minutes
const DEFAULT_LONG_BREAK_DURATION = 15 * 60; // 15 minutes
const DEFAULT_LONG_BREAK_INTERVAL = 4;

const initialState: TimerState = {
  phase: TimerPhase.Work,
  timeLeft: DEFAULT_WORK_DURATION,
  isRunning: false,
  workDuration: DEFAULT_WORK_DURATION,
  shortBreakDuration: DEFAULT_SHORT_BREAK_DURATION,
  longBreakDuration: DEFAULT_LONG_BREAK_DURATION,
  longBreakInterval: DEFAULT_LONG_BREAK_INTERVAL,
  cycleCount: 0,
};

// Create the writable store
export const timerState = writable<TimerState>(initialState);

// --- Internal Helper Functions ---

const _advancePhase = (state: TimerState): TimerState => {
  let nextPhase: TimerPhase;
  let nextTimeLeft: number;
  let nextCycleCount = state.cycleCount;

  if (state.phase === TimerPhase.Work) {
    nextCycleCount++;
    if (nextCycleCount >= state.longBreakInterval) {
      nextPhase = TimerPhase.LongBreak;
      nextTimeLeft = state.longBreakDuration;
      nextCycleCount = 0; // Reset cycle count after long break
    } else {
      nextPhase = TimerPhase.ShortBreak;
      nextTimeLeft = state.shortBreakDuration;
    }
  } else {
    // After any break, return to Work
    nextPhase = TimerPhase.Work;
    nextTimeLeft = state.workDuration;
  }

  return {
    ...state,
    phase: nextPhase,
    timeLeft: nextTimeLeft,
    cycleCount: nextCycleCount,
    isRunning: true, // Automatically start the next phase
  };
};

// --- Actions --- (These modify the store)

/** Decrements timer if running, advances phase if time runs out. */
export const tick = () => {
  timerState.update((state) => {
    if (!state.isRunning) {
      return state; // Do nothing if paused
    }

    if (state.timeLeft > 1) {
      return { ...state, timeLeft: state.timeLeft - 1 };
    } else {
      // Time is up, advance to the next phase
      // Consider adding a small buffer or sound notification here
      return _advancePhase(state);
    }
  });
};

/** Starts or resumes the timer. */
export const startTimer = () => {
  timerState.update((state) => {
    // If starting from a finished state (time is 0), advance first
    if (state.timeLeft <= 0 && !state.isRunning) {
      const advancedState = _advancePhase(state);
      return { ...advancedState, isRunning: true };
    }
    // Otherwise, just resume
    return { ...state, isRunning: true };
  });
};

/** Pauses the timer. */
export const pauseTimer = () => {
  timerState.update((state) => ({ ...state, isRunning: false }));
};

/** Resets the timer to the initial work phase. */
export const resetTimer = () => {
  // Reset to the initial state but keep configured durations
  timerState.update((state) => ({
    ...initialState,
    workDuration: state.workDuration,
    shortBreakDuration: state.shortBreakDuration,
    longBreakDuration: state.longBreakDuration,
    longBreakInterval: state.longBreakInterval,
  }));
};

/** Sets the entire timer state. Used by clients receiving updates. */
export const setTimerState = (newState: TimerState) => {
  timerState.set(newState);
};

// TODO: Add action for setTimerSettings if needed later
// export const setTimerSettings = (settings: Partial<TimerState>) => { ... };
