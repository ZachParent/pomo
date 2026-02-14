import { get, writable } from "svelte/store";
import {
  createInitialTimerState,
  pauseTimerState,
  resetTimerState as resetTimerStateValue,
  sanitizeTimerState,
  setCycleInfoState,
  setDurationsState,
  setTimeLeftState,
  startTimerState,
  synchronizeTimerState,
  timerStateEquals,
  toTimerDisplayState,
  type TimerDisplayState,
  type TimerDurations,
  type TimerState,
  TimerPhase,
} from "./timerEngine";

export { TimerPhase, type TimerState, type TimerDisplayState, type TimerDurations };
export { formatTimer, timerStateEquals, toTimerDisplayState } from "./timerEngine";

const store = writable<TimerState>(createInitialTimerState());

export const timerState = {
  subscribe: store.subscribe,
};

const apply = (updater: (current: TimerState) => TimerState): TimerState => {
  let nextSnapshot = get(store);
  store.update((current) => {
    const next = sanitizeTimerState(updater(current));
    nextSnapshot = next;
    return next;
  });
  return nextSnapshot;
};

const isIncomingNewer = (current: TimerState, incoming: TimerState): boolean => {
  if (incoming.revision !== current.revision) {
    return incoming.revision > current.revision;
  }

  if (incoming.updatedAtMs !== current.updatedAtMs) {
    return incoming.updatedAtMs > current.updatedAtMs;
  }

  return incoming.alertToken > current.alertToken;
};

export const getTimerSnapshot = (): TimerState => get(store);

export const setTimerStateFromRemote = (incoming: TimerState): TimerState =>
  apply((current) => {
    const sanitizedIncoming = sanitizeTimerState(incoming);
    return isIncomingNewer(current, sanitizedIncoming) ? sanitizedIncoming : current;
  });

export const synchronizeTimer = (nowMs: number = Date.now()): TimerState =>
  apply((current) => synchronizeTimerState(current, nowMs, true));

export const startTimer = (nowMs: number = Date.now()): TimerState =>
  apply((current) => startTimerState(current, nowMs));

export const pauseTimer = (nowMs: number = Date.now()): TimerState =>
  apply((current) => pauseTimerState(current, nowMs));

export const resetTimer = (nowMs: number = Date.now()): TimerState =>
  apply((current) => resetTimerStateValue(current, nowMs));

export const resetTimerStore = (
  nowMs: number = Date.now(),
  durations: Partial<TimerDurations> = {}
): TimerState =>
  apply((current) => {
    const next = createInitialTimerState(nowMs, {
      ...current,
      ...durations,
    });
    return {
      ...next,
      revision: current.revision + 1,
      alertToken: current.alertToken,
    };
  });

export const setCycleInfo = (
  cycleCount: number,
  longBreakInterval: number,
  nowMs: number = Date.now()
): TimerState =>
  apply((current) => setCycleInfoState(current, cycleCount, longBreakInterval, nowMs));

export const setTimeLeft = (
  remainingSeconds: number,
  nowMs: number = Date.now()
): TimerState => apply((current) => setTimeLeftState(current, remainingSeconds, nowMs));

export const setDurations = (
  durations: Partial<TimerDurations>,
  nowMs: number = Date.now()
): TimerState => apply((current) => setDurationsState(current, durations, nowMs));

export const getTimerDisplayState = (nowMs: number = Date.now()): TimerDisplayState =>
  toTimerDisplayState(get(store), nowMs);

export const replaceTimerState = (next: TimerState): void => {
  const normalized = sanitizeTimerState(next);
  store.update((current) =>
    timerStateEquals(current, normalized) ? current : normalized
  );
};
