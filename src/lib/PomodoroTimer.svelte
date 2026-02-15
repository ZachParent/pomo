<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    p2pState,
    requestPauseTimer,
    requestResetTimer,
    requestSetCycleInfo,
    requestSetDurations,
    requestSetRoomTheme,
    requestSetTimeLeft,
    requestStartTimer,
  } from "./p2pStore";
  import {
    toDurationPayload,
    willShortenActivePhase,
    type DurationMinutesInput,
  } from "./scheduleSafety";
  import { evaluateAlertTransition } from "./alertFeedback";
  import { timerState, toTimerDisplayState, type TimerPhase } from "./timerStore";
  import { withBasePath } from "./basePath";
  import type { RoomThemeMetadata } from "./roomTheme";

  type AlertSound = "chime" | "bell" | "marimba" | "pulse";

  interface AlertSoundOption {
    value: AlertSound;
    label: string;
  }

  interface EmojiPickerClickDetail {
    unicode?: string;
    emoji?: {
      unicode?: string;
    };
  }

  const ALERT_SOUND_STORAGE_KEY = "pomo.alertSound";
  const ALERT_SOUND_OPTIONS: AlertSoundOption[] = [
    { value: "chime", label: "Chime (classic)" },
    { value: "bell", label: "Bell" },
    { value: "marimba", label: "Marimba" },
    { value: "pulse", label: "Pulse beep" },
  ];

  let nowMs = Date.now();
  let clockId: number | null = null;
  let audioPlayer: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;
  let flashActive = false;
  let flashTimeoutId: number | null = null;
  let lastAlertToken = -1;
  let lastPhase: TimerPhase | null = null;
  let suppressedTokenAlert: number | null = null;
  let pendingVisibilityAlert = false;
  let lastSyncedRevision = -1;

  let settingsOpen = false;
  let settingsHelpOpen = false;
  let emojiPickerOpen = false;
  let emojiPickerReady = false;

  let remainingMinutes = 0;
  let remainingSeconds = 0;
  let workMinutes = 25;
  let shortBreakMinutes = 5;
  let longBreakMinutes = 15;
  let cycleCount = 0;
  let longBreakInterval = 4;

  let displayNameInput = "Focus Room";
  let accentColorInput = "#0d7c8f";
  let lastThemeRevision = -1;

  let selectedAlertSound: AlertSound = "chime";
  let alertSoundReady = false;
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

  $: if ($p2pState.roomThemeRevision !== lastThemeRevision) {
    displayNameInput = $p2pState.roomTheme.displayName;
    accentColorInput = $p2pState.roomTheme.accentColor;
    lastThemeRevision = $p2pState.roomThemeRevision;
  }

  $: selectedAlertSoundLabel =
    ALERT_SOUND_OPTIONS.find((option) => option.value === selectedAlertSound)?.label ??
    "Chime (classic)";

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
    if (selectedAlertSound === "chime") {
      if (!audioPlayer) {
        return;
      }

      audioPlayer.currentTime = 0;
      audioPlayer.play().catch(() => {
        // Ignore autoplay policy errors. We still keep visual feedback.
      });
      return;
    }

    const context = ensureAudioContext();
    if (!context) {
      return;
    }

    if (selectedAlertSound === "bell") {
      playBellTone(context);
      return;
    }

    if (selectedAlertSound === "marimba") {
      playMarimbaTone(context);
      return;
    }

    playPulseTone(context);
  };

  const playAlertFeedback = (): void => {
    triggerFlash();
    if (typeof document !== "undefined" && document.hidden) {
      pendingVisibilityAlert = true;
      return;
    }

    pendingVisibilityAlert = false;
    playAlert();
  };

  const ensureAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        // Ignore autoplay policy failures.
      });
    }

    return audioContext;
  };

  const scheduleTone = (
    context: AudioContext,
    frequency: number,
    startOffsetSeconds: number,
    durationSeconds: number,
    type: "sine" | "triangle" | "square" | "sawtooth",
    gainPeak = 0.2
  ): void => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startAt = context.currentTime + startOffsetSeconds;
    const endAt = startAt + durationSeconds;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  };

  const playBellTone = (context: AudioContext): void => {
    scheduleTone(context, 784, 0, 0.45, "sine", 0.22);
    scheduleTone(context, 1_176, 0.01, 0.38, "triangle", 0.13);
  };

  const playMarimbaTone = (context: AudioContext): void => {
    scheduleTone(context, 523.25, 0, 0.19, "triangle", 0.2);
    scheduleTone(context, 659.25, 0.12, 0.19, "triangle", 0.18);
    scheduleTone(context, 783.99, 0.24, 0.22, "triangle", 0.16);
  };

  const playPulseTone = (context: AudioContext): void => {
    scheduleTone(context, 988, 0, 0.09, "square", 0.16);
    scheduleTone(context, 988, 0.15, 0.09, "square", 0.16);
    scheduleTone(context, 1_319, 0.3, 0.1, "square", 0.15);
  };

  const flushPendingAlert = (): void => {
    nowMs = Date.now();
    if (typeof document === "undefined" || document.hidden || !pendingVisibilityAlert) {
      return;
    }

    pendingVisibilityAlert = false;
    triggerFlash();
    playAlert();
  };

  const previewAlertSound = (): void => {
    pendingVisibilityAlert = false;
    triggerFlash();
    playAlert();
  };

  const loadStoredAlertSound = (): AlertSound => {
    if (typeof window === "undefined") {
      return "chime";
    }

    const stored = window.localStorage.getItem(ALERT_SOUND_STORAGE_KEY);
    return ALERT_SOUND_OPTIONS.some((option) => option.value === stored)
      ? (stored as AlertSound)
      : "chime";
  };

  const persistAlertSound = (value: AlertSound): void => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ALERT_SOUND_STORAGE_KEY, value);
  };

  const ensureEmojiPickerLoaded = async (): Promise<void> => {
    if (emojiPickerReady) {
      return;
    }

    await import("emoji-picker-element");
    emojiPickerReady = true;
  };

  const openSettings = async (): Promise<void> => {
    settingsOpen = true;
    settingsHelpOpen = false;
    await ensureEmojiPickerLoaded();
  };

  const closeSettings = (): void => {
    settingsOpen = false;
    settingsHelpOpen = false;
    emojiPickerOpen = false;
  };

  const toggleSettingsHelp = (): void => {
    settingsHelpOpen = !settingsHelpOpen;
  };

  const handleBackdropClick = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) {
      closeSettings();
    }
  };

  const handleWindowKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && settingsOpen) {
      closeSettings();
    }
  };

  const applyRoomThemePatch = (patch: Partial<RoomThemeMetadata>): void => {
    requestSetRoomTheme(patch);
  };

  const handleDisplayNameInput = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    displayNameInput = target.value;
    applyRoomThemePatch({ displayName: target.value });
  };

  const handleAccentInput = (event: Event): void => {
    const target = event.currentTarget as HTMLInputElement;
    accentColorInput = target.value;
    applyRoomThemePatch({ accentColor: target.value });
  };

  const toggleEmojiPicker = async (): Promise<void> => {
    if (!emojiPickerOpen) {
      await ensureEmojiPickerLoaded();
    }
    emojiPickerOpen = !emojiPickerOpen;
  };

  const handleEmojiClick = (event: Event): void => {
    const detail = (event as CustomEvent<EmojiPickerClickDetail>).detail;
    const unicode = detail?.unicode ?? detail?.emoji?.unicode;
    if (!unicode) {
      return;
    }

    applyRoomThemePatch({ emoji: unicode });
    emojiPickerOpen = false;
  };

  $: if (alertSoundReady) {
    persistAlertSound(selectedAlertSound);
  }

  $: {
    const transition = evaluateAlertTransition({
      previousAlertToken: lastAlertToken,
      previousPhase: lastPhase,
      suppressedTokenAlert,
      currentAlertToken: view.alertToken,
      currentPhase: view.phase,
    });

    if (transition.shouldAlert) {
      playAlertFeedback();
    }

    suppressedTokenAlert = transition.nextSuppressedTokenAlert;
    lastAlertToken = view.alertToken;
    lastPhase = view.phase;
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

  onMount(() => {
    const basePath = import.meta.env.BASE_URL;
    const chimePath = withBasePath(basePath, "/chime-alert.mp3");
    audioPlayer = new Audio(chimePath);
    audioPlayer.preload = "auto";
    audioPlayer.load();
    selectedAlertSound = loadStoredAlertSound();
    alertSoundReady = true;

    clockId = window.setInterval(() => {
      nowMs = Date.now();
    }, 250);

    document.addEventListener("visibilitychange", flushPendingAlert);
    window.addEventListener("focus", flushPendingAlert);
    window.addEventListener("keydown", handleWindowKeydown);

    return () => {
      document.removeEventListener("visibilitychange", flushPendingAlert);
      window.removeEventListener("focus", flushPendingAlert);
      window.removeEventListener("keydown", handleWindowKeydown);
    };
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

    if (audioContext) {
      audioContext.close().catch(() => {
        // Ignore close failures during teardown.
      });
      audioContext = null;
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

  <div class="controls" data-testid="timer-primary-controls">
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
    <button data-testid="open-settings" type="button" on:click={openSettings}>
      Settings
    </button>
  </div>

  <p class="settings-summary" data-testid="settings-summary">
    Alert: {selectedAlertSoundLabel}
  </p>
</section>

{#if settingsOpen}
  <div
    class="settings-backdrop"
    data-testid="settings-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
  >
    <div
      class="settings-modal"
      data-testid="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div class="settings-sheet-handle" aria-hidden="true"></div>

      <div class="settings-header">
        <h3 id="settings-title">Room Settings</h3>
        <div class="settings-header-actions">
          <button
            type="button"
            class="settings-icon-button"
            data-testid="settings-help"
            aria-expanded={settingsHelpOpen}
            aria-label="Toggle settings help"
            on:click={toggleSettingsHelp}
          >
            ?
          </button>
          <button
            type="button"
            class="settings-icon-button"
            data-testid="close-settings"
            aria-label="Close settings"
            on:click={closeSettings}
          >
            ×
          </button>
        </div>
      </div>

      {#if settingsHelpOpen}
        <p class="settings-help" data-testid="settings-help-tooltip">
          Theme updates and timer settings sync immediately.
        </p>
      {/if}

      <div class="settings-content">
        <section class="settings-card" data-testid="theme-settings-section">
          <h4>Theme</h4>
          <label>
            Name
            <input
              data-testid="room-display-name-input"
              value={displayNameInput}
              maxlength="48"
              autocomplete="off"
              on:input={handleDisplayNameInput}
            />
          </label>

          <div class="theme-inline">
            <label>
              Accent
              <input
                data-testid="room-accent-input"
                value={accentColorInput}
                type="color"
                on:input={handleAccentInput}
              />
            </label>
            <div class="emoji-field">
              <span>Emoji</span>
              <button
                type="button"
                class="emoji-trigger"
                data-testid="emoji-trigger"
                aria-label="Pick room emoji"
                aria-expanded={emojiPickerOpen}
                on:click={toggleEmojiPicker}
              >
                {$p2pState.roomTheme.emoji}
              </button>
            </div>
          </div>

          {#if emojiPickerOpen}
            <div class="emoji-picker-wrap" data-testid="emoji-picker-panel">
              {#if emojiPickerReady}
                <emoji-picker on:emoji-click={handleEmojiClick}></emoji-picker>
              {/if}
            </div>
          {/if}
        </section>

        <section class="settings-card" data-testid="timer-settings-section">
          <h4>Timer</h4>

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

          <form class="editor" on:submit|preventDefault={setDurationsWithSafety}>
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
            <button data-testid="apply-cycle-settings" type="submit">Apply Cycle</button
            >
          </form>
        </section>

        <section class="settings-card" data-testid="sound-settings-section">
          <h4>Sound</h4>
          <div class="sound-row">
            <label for="alert-sound-select">Alert sound</label>
            <select
              id="alert-sound-select"
              data-testid="alert-sound-select"
              bind:value={selectedAlertSound}
            >
              {#each ALERT_SOUND_OPTIONS as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            <button
              type="button"
              data-testid="preview-alert-sound"
              on:click={previewAlertSound}
            >
              Preview
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}
