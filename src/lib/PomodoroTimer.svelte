<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    requestPauseTimer,
    requestResetTimer,
    requestSetCycleInfo,
    requestSetDurations,
    requestSetTimeLeft,
    requestStartTimer,
  } from "./p2pStore";
  import {
    toDurationPayload,
    willShortenActivePhase,
    type DurationMinutesInput,
  } from "./scheduleSafety";
  import { timerState, toTimerDisplayState } from "./timerStore";
  import { withBasePath } from "./basePath";

  let nowMs = Date.now();
  let clockId: number | null = null;
  let audioPlayer: HTMLAudioElement | null = null;
  let flashActive = false;
  let flashTimeoutId: number | null = null;
  let lastAlertToken = -1;
  let lastSyncedRevision = -1;

  let remainingMinutes = 0;
  let remainingSeconds = 0;
  let workMinutes = 25;
  let shortBreakMinutes = 5;
  let longBreakMinutes = 15;
  let cycleCount = 0;
  let longBreakInterval = 4;

  let remainingEditorPinned = false;
  let scheduleSafetyMessage = "";
  let pendingDurationConfirmKey: string | null = null;

  $: view = toTimerDisplayState($timerState, nowMs);

  $: if (view.revision !== lastSyncedRevision) {
    remainingMinutes = Math.floor(view.timeLeftSeconds / 60);
    remainingSeconds = view.timeLeftSeconds % 60;
    workMinutes = Math.floor(view.workDurationSeconds / 60);
    shortBreakMinutes = Math.floor(view.shortBreakDurationSeconds / 60);
    longBreakMinutes = Math.floor(view.longBreakDurationSeconds / 60);
    cycleCount = view.cycleCount;
    longBreakInterval = view.longBreakInterval;
    pendingDurationConfirmKey = null;
    scheduleSafetyMessage = "";
    lastSyncedRevision = view.revision;
  }

  const clearFlashTimeout = (): void => {
    if (flashTimeoutId !== null) {
      clearTimeout(flashTimeoutId);
      flashTimeoutId = null;
    }
  };

  const triggerFlash = (): void => {
    flashActive = true;
    clearFlashTimeout();
    flashTimeoutId = window.setTimeout(() => {
      flashActive = false;
      flashTimeoutId = null;
    }, 900);
  };

  const playAlert = (): void => {
    if (!audioPlayer) {
      return;
    }

    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {
      // Ignore autoplay policy errors. We still keep visual feedback.
    });
  };

  $: if (view.alertToken !== lastAlertToken) {
    if (lastAlertToken >= 0 && view.alertToken > lastAlertToken) {
      triggerFlash();
      playAlert();
    }
    lastAlertToken = view.alertToken;
  }

  const setRemaining = (): void => {
    const nextSeconds =
      Math.max(0, Math.floor(remainingMinutes)) * 60 +
      Math.max(0, Math.floor(remainingSeconds));
    requestSetTimeLeft(nextSeconds);
  };

  const getDurationInput = (): DurationMinutesInput => ({
    workMinutes,
    shortBreakMinutes,
    longBreakMinutes,
  });

  const getDurationConfirmKey = (): string =>
    [workMinutes, shortBreakMinutes, longBreakMinutes]
      .map((value) => Math.floor(value))
      .join(":");

  const setDurationsWithSafety = (): void => {
    const durationInput = getDurationInput();
    const shouldConfirm = willShortenActivePhase(view, durationInput);
    const confirmKey = getDurationConfirmKey();

    if (shouldConfirm && pendingDurationConfirmKey !== confirmKey) {
      pendingDurationConfirmKey = confirmKey;
      scheduleSafetyMessage =
        "Applying these durations will shorten the active phase immediately. Submit again to confirm.";
      return;
    }

    requestSetDurations(toDurationPayload(durationInput));
    pendingDurationConfirmKey = null;
    scheduleSafetyMessage = "";
  };

  const setCycleSettings = (): void => {
    requestSetCycleInfo(
      Math.max(0, Math.floor(cycleCount)),
      Math.max(1, Math.floor(longBreakInterval))
    );
  };

  const toggleRemainingEditor = (): void => {
    remainingEditorPinned = !remainingEditorPinned;
  };

  onMount(() => {
    const basePath = import.meta.env.BASE_URL;
    const chimePath = withBasePath(basePath, "/chime-alert.mp3");
    audioPlayer = new Audio(chimePath);
    audioPlayer.preload = "auto";
    audioPlayer.load();

    clockId = window.setInterval(() => {
      nowMs = Date.now();
    }, 250);
  });

  onDestroy(() => {
    if (clockId !== null) {
      clearInterval(clockId);
      clockId = null;
    }

    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
    }

    clearFlashTimeout();
  });
</script>

<section class="timer-shell" data-testid="timer-shell">
  <div class="timer-header">
    <p class="phase" data-testid="timer-phase">
      {view.phaseLabel} ({view.isRunning ? "Running" : "Paused"})
    </p>
    <p class="cycle">
      Cycle {view.cycleCount} of {view.longBreakInterval}
    </p>
  </div>

  <p
    class:flash={flashActive}
    class="timer-readout"
    data-testid="timer-display"
    aria-live="polite"
  >
    {view.formattedTime}
  </p>

  <div class="progress-track" aria-hidden="true">
    <div
      class="progress-fill"
      style={`width: ${Math.round(view.progress * 100)}%`}
    ></div>
  </div>

  <div class="controls">
    {#if view.isRunning}
      <button data-testid="control-pause" type="button" on:click={requestPauseTimer}>
        Pause
      </button>
    {:else}
      <button
        data-testid="control-start"
        class="primary"
        type="button"
        on:click={requestStartTimer}
      >
        Start
      </button>
    {/if}
    <button data-testid="control-reset" type="button" on:click={requestResetTimer}>
      Reset
    </button>
  </div>

  <div class="editor-grid">
    <section
      class:remaining-editor-pinned={remainingEditorPinned}
      class="editor remaining-editor"
      data-testid="remaining-editor"
    >
      <div class="remaining-editor-header">
        <h3>Adjust Remaining Time</h3>
        <button
          type="button"
          data-testid="toggle-remaining-editor"
          aria-expanded={remainingEditorPinned}
          on:click={toggleRemainingEditor}
        >
          {remainingEditorPinned ? "Hide" : "Edit"}
        </button>
      </div>
      <form
        class="remaining-inline-form"
        data-testid="remaining-editor-panel"
        on:submit|preventDefault={setRemaining}
      >
        <label class="sr-only" for="remaining-minutes">Minutes</label>
        <input
          id="remaining-minutes"
          data-testid="remaining-minutes"
          bind:value={remainingMinutes}
          type="number"
          min="0"
          inputmode="numeric"
        />
        <span aria-hidden="true">:</span>
        <label class="sr-only" for="remaining-seconds">Seconds</label>
        <input
          id="remaining-seconds"
          data-testid="remaining-seconds"
          bind:value={remainingSeconds}
          type="number"
          min="0"
          max="59"
          inputmode="numeric"
        />
        <button data-testid="apply-remaining" type="submit">Apply</button>
      </form>
    </section>

    <form class="editor" on:submit|preventDefault={setDurationsWithSafety}>
      <h3>Duration Settings</h3>
      <p class="editor-note">
        Changes apply to future phases. If a running phase would be shortened, apply
        again to confirm.
      </p>
      <div class="row">
        <label for="work-minutes">Work minutes</label>
        <input id="work-minutes" bind:value={workMinutes} type="number" min="1" />
      </div>
      <div class="row">
        <label for="short-break-minutes">Short break minutes</label>
        <input
          id="short-break-minutes"
          bind:value={shortBreakMinutes}
          type="number"
          min="1"
        />
      </div>
      <div class="row">
        <label for="long-break-minutes">Long break minutes</label>
        <input
          id="long-break-minutes"
          bind:value={longBreakMinutes}
          type="number"
          min="1"
        />
      </div>
      {#if scheduleSafetyMessage}
        <p class="schedule-warning" data-testid="schedule-warning">
          {scheduleSafetyMessage}
        </p>
      {/if}
      <button data-testid="apply-durations" type="submit">Apply Durations</button>
    </form>

    <form class="editor" on:submit|preventDefault={setCycleSettings}>
      <h3>Cycle Settings</h3>
      <p class="editor-note">
        Cycle values update progression only and do not adjust current phase duration.
      </p>
      <div class="row">
        <label for="cycle-count">Current cycle</label>
        <input id="cycle-count" bind:value={cycleCount} type="number" min="0" />
      </div>
      <div class="row">
        <label for="long-break-interval">Long break interval</label>
        <input
          id="long-break-interval"
          bind:value={longBreakInterval}
          type="number"
          min="1"
        />
      </div>
      <button data-testid="apply-cycle-settings" type="submit">Apply Cycle</button>
    </form>
  </div>
</section>
