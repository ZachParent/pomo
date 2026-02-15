import { describe, expect, it } from "vitest";
import { TimerPhase } from "./timerEngine";
import { evaluateAlertTransition } from "./alertFeedback";

describe("evaluateAlertTransition", () => {
  it("does not alert on first render snapshot", () => {
    expect(
      evaluateAlertTransition({
        previousAlertToken: -1,
        previousPhase: null,
        suppressedTokenAlert: null,
        currentAlertToken: 0,
        currentPhase: TimerPhase.Work,
      })
    ).toEqual({
      shouldAlert: false,
      nextSuppressedTokenAlert: null,
    });
  });

  it("alerts when alert token increments", () => {
    expect(
      evaluateAlertTransition({
        previousAlertToken: 2,
        previousPhase: TimerPhase.Work,
        suppressedTokenAlert: null,
        currentAlertToken: 3,
        currentPhase: TimerPhase.ShortBreak,
      })
    ).toEqual({
      shouldAlert: true,
      nextSuppressedTokenAlert: null,
    });
  });

  it("alerts on projected phase changes even if token is unchanged", () => {
    expect(
      evaluateAlertTransition({
        previousAlertToken: 4,
        previousPhase: TimerPhase.Work,
        suppressedTokenAlert: null,
        currentAlertToken: 4,
        currentPhase: TimerPhase.ShortBreak,
      })
    ).toEqual({
      shouldAlert: true,
      nextSuppressedTokenAlert: 5,
    });
  });

  it("suppresses the next token-based alert after a projected fallback alert", () => {
    expect(
      evaluateAlertTransition({
        previousAlertToken: 4,
        previousPhase: TimerPhase.ShortBreak,
        suppressedTokenAlert: 5,
        currentAlertToken: 5,
        currentPhase: TimerPhase.ShortBreak,
      })
    ).toEqual({
      shouldAlert: false,
      nextSuppressedTokenAlert: null,
    });
  });
});
