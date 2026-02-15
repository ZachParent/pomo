import type { TimerPhase } from "./timerEngine";

export interface AlertTransitionInput {
  previousAlertToken: number;
  previousPhase: TimerPhase | null;
  suppressedTokenAlert: number | null;
  currentAlertToken: number;
  currentPhase: TimerPhase;
}

export interface AlertTransitionResult {
  shouldAlert: boolean;
  nextSuppressedTokenAlert: number | null;
}

export const evaluateAlertTransition = (
  input: AlertTransitionInput
): AlertTransitionResult => {
  const tokenAdvanced =
    input.previousAlertToken >= 0 && input.currentAlertToken > input.previousAlertToken;
  const phaseAdvanced =
    input.previousPhase !== null && input.currentPhase !== input.previousPhase;

  let nextSuppressedTokenAlert = input.suppressedTokenAlert;
  const tokenAlertSuppressed =
    nextSuppressedTokenAlert !== null &&
    tokenAdvanced &&
    input.currentAlertToken <= nextSuppressedTokenAlert;

  let shouldAlert = false;

  if (tokenAdvanced && !tokenAlertSuppressed) {
    shouldAlert = true;
  } else if (!tokenAdvanced && phaseAdvanced) {
    // Fallback for long tab inactivity: projected phase change can occur before
    // the host commits an alert-token increment.
    shouldAlert = true;
    nextSuppressedTokenAlert = input.currentAlertToken + 1;
  }

  if (
    nextSuppressedTokenAlert !== null &&
    input.currentAlertToken >= nextSuppressedTokenAlert
  ) {
    nextSuppressedTokenAlert = null;
  }

  return {
    shouldAlert,
    nextSuppressedTokenAlert,
  };
};
