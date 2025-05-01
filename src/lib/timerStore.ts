import { writable, get } from "svelte/store";

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
  justFinished: boolean; // Flag to indicate the timer just hit 0
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
  justFinished: false,
};

// Create the writable store
export const timerState = writable<TimerState>(initialState);

// --- Timer Logic Actions ---

/** Decrements the timer by one second and handles phase transitions */
export const tick = () => {
  timerState.update((state) => {
    if (!state.isRunning || state.timeLeft <= 0) {
      // Ensure flag is false if not running or already 0
      if (state.justFinished) return { ...state, justFinished: false };
      return state;
    }

    const newTimeLeft = state.timeLeft - 1;
    // Start with current state, assume justFinished is false unless timer hits 0
    let newState = { ...state, timeLeft: newTimeLeft, justFinished: false };

    if (newTimeLeft <= 0) {
      // Timer finished, transition to next phase
      newState.justFinished = true; // Signal that the timer just finished
      // newState.isRunning = false; // Stop timer (will be set based on next phase)

      // Determine next phase
      let nextPhase: TimerPhase;
      let nextTimeLeft: number;
      let nextCycleCount = state.cycleCount;

      if (state.phase === TimerPhase.Work) {
        nextCycleCount++; // Increment cycle count after work phase completes
        if (nextCycleCount >= state.longBreakInterval) {
          nextPhase = TimerPhase.LongBreak;
          nextTimeLeft = state.longBreakDuration;
          nextCycleCount = 0; // Reset cycle count for the long break
        } else {
          nextPhase = TimerPhase.ShortBreak;
          nextTimeLeft = state.shortBreakDuration;
        }
      } else {
        // Phase was ShortBreak or LongBreak
        nextPhase = TimerPhase.Work;
        nextTimeLeft = state.workDuration;
        // Keep cycle count as is until next work phase completes
      }

      newState.phase = nextPhase;
      newState.timeLeft = nextTimeLeft;
      newState.cycleCount = nextCycleCount;

      // Set isRunning based on the *next* phase
      newState.isRunning =
        nextPhase === TimerPhase.ShortBreak ||
        nextPhase === TimerPhase.LongBreak;

      console.log(
        `Timer finished. Transitioning to ${newState.phase}. Auto-starting: ${newState.isRunning}. Cycle count: ${newState.cycleCount}`
      );
    }
    // No need to explicitly set justFinished = false here,
    // it defaults to false and is only true if newTimeLeft <= 0.

    return newState;
  });
};

// --- Actions --- (These modify the store)

/** Starts or resumes the timer. */
export const startTimer = () => {
  timerState.update((state) => {
    // If starting from a non-running state at exactly 0, we should advance first.
    // The tick function now handles the transition *when hitting* 0,
    // but not if it's already 0 and paused.
    if (state.timeLeft <= 0 && !state.isRunning) {
      console.log("Timer at 0 and paused, advancing phase before starting.");
      // Let's reuse the logic from tick for advancing phase
      let nextPhase: TimerPhase;
      let nextTimeLeft: number;
      let nextCycleCount = state.cycleCount;

      if (state.phase === TimerPhase.Work) {
        nextCycleCount++;
        if (nextCycleCount >= state.longBreakInterval) {
          nextPhase = TimerPhase.LongBreak;
          nextTimeLeft = state.longBreakDuration;
          nextCycleCount = 0;
        } else {
          nextPhase = TimerPhase.ShortBreak;
          nextTimeLeft = state.shortBreakDuration;
        }
      } else {
        nextPhase = TimerPhase.Work;
        nextTimeLeft = state.workDuration;
      }
      // Return new state for the next phase, and set isRunning true
      return {
        ...state,
        phase: nextPhase,
        timeLeft: nextTimeLeft,
        cycleCount: nextCycleCount,
        isRunning: true,
        justFinished: false,
      };
    }
    // Otherwise, just resume
    return { ...state, isRunning: true, justFinished: false }; // Ensure flag is false on manual start
  });
};

/** Pauses the timer. */
export const pauseTimer = () => {
  timerState.update((state) => ({
    ...state,
    isRunning: false,
    justFinished: false,
  })); // Ensure flag is false on pause
};

/** Resets the timer to the initial work phase. */
export const resetTimer = () => {
  timerState.update((state) => ({
    ...initialState,
    workDuration: state.workDuration,
    shortBreakDuration: state.shortBreakDuration,
    longBreakDuration: state.longBreakDuration,
    longBreakInterval: state.longBreakInterval,
    justFinished: false, // Ensure flag is false on reset
  }));
};

/** Sets the entire timer state. Used by clients receiving updates. */
export const setTimerState = (newState: TimerState) => {
  // When receiving state from others, assume it's not 'just finished'
  timerState.set({ ...newState, justFinished: false });
};

// TODO: Add action for setTimerSettings if needed later
// export const setTimerSettings = (settings: Partial<TimerState>) => { ... };

// --- Internal Helper Function (_advancePhase) ---
// This might need review/removal if startTimer logic handles it directly now
const _advancePhase = (state: TimerState): TimerState => {
  let nextPhase: TimerPhase;
  let nextTimeLeft: number;
  let nextCycleCount = state.cycleCount;

  // This logic seems duplicated from the tick function now, simplify?
  if (state.phase === TimerPhase.Work) {
    nextCycleCount++;
    if (nextCycleCount >= state.longBreakInterval) {
      nextPhase = TimerPhase.LongBreak;
      nextTimeLeft = state.longBreakDuration;
      nextCycleCount = 0;
    } else {
      nextPhase = TimerPhase.ShortBreak;
      nextTimeLeft = state.shortBreakDuration;
    }
  } else {
    nextPhase = TimerPhase.Work;
    nextTimeLeft = state.workDuration;
  }

  return {
    ...state,
    phase: nextPhase,
    timeLeft: nextTimeLeft,
    cycleCount: nextCycleCount,
    isRunning: true, // This helper assumes auto-start
    justFinished: false, // Ensure flag is false when advancing manually
  };
};
