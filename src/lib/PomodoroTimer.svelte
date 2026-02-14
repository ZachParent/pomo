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

  $: view = toTimerDisplayState($timerState, nowMs);

  $: if (view.revision !== lastSyncedRevision) {
    remainingMinutes = Math.floor(view.timeLeftSeconds / 60);
    remainingSeconds = view.timeLeftSeconds % 60;
    workMinutes = Math.floor(view.workDurationSeconds / 60);
    shortBreakMinutes = Math.floor(view.shortBreakDurationSeconds / 60);
    longBreakMinutes = Math.floor(view.longBreakDurationSeconds / 60);
    cycleCount = view.cycleCount;
    longBreakInterval = view.longBreakInterval;
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

  const setSchedule = (): void => {
    requestSetDurations({
      workDurationSeconds: Math.max(1, Math.floor(workMinutes * 60)),
      shortBreakDurationSeconds: Math.max(1, Math.floor(shortBreakMinutes * 60)),
      longBreakDurationSeconds: Math.max(1, Math.floor(longBreakMinutes * 60)),
      longBreakInterval: Math.max(1, Math.floor(longBreakInterval)),
    });
    requestSetCycleInfo(Math.max(0, Math.floor(cycleCount)), longBreakInterval);
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
    <form class="editor" on:submit|preventDefault={setRemaining}>
      <h3>Adjust Remaining Time</h3>
      <div class="row">
        <label for="remaining-minutes">Minutes</label>
        <input
          id="remaining-minutes"
          data-testid="remaining-minutes"
          bind:value={remainingMinutes}
          type="number"
          min="0"
        />
      </div>
      <div class="row">
        <label for="remaining-seconds">Seconds</label>
        <input
          id="remaining-seconds"
          data-testid="remaining-seconds"
          bind:value={remainingSeconds}
          type="number"
          min="0"
          max="59"
        />
      </div>
      <button data-testid="apply-remaining" type="submit">Apply Remaining Time</button>
    </form>

    <form class="editor" on:submit|preventDefault={setSchedule}>
      <h3>Schedule Settings</h3>
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
      <button type="submit">Apply Schedule</button>
    </form>
  </div>
</section>
