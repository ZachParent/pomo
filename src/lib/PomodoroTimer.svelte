<script lang="ts">
    // Removed onMount, onDestroy as internal interval is gone
    import Card, { Content } from '@smui/card';
    import Button from '@smui/button';
    import LinearProgress from '@smui/linear-progress';
    import { onDestroy, onMount } from 'svelte'; // Import onMount
    import Dialog, { Title, Content as DialogContent, Actions } from '@smui/dialog';
    import Textfield from '@smui/textfield';
    import HelperText from '@smui/textfield/helper-text'; // Import HelperText

    // Import the shared timer state and phase enum
    import { timerState, TimerPhase } from './timerStore';
    // Import P2P action request functions
    import {
        requestStartTimer,
        requestPauseTimer,
        requestResetTimer,
        requestSetCycleInfo,
        requestSetTimeLeft
    } from './p2pStore';

    // --- Reactive State (derived from store) ---
    $: state = $timerState; // Convenience alias

    // --- Edit Cycle Dialog State ---
    let editCycleDialogOpen = false;
    let editCycleCount: number = 0;
    let editLongBreakInterval: number = 4;

    // Function to open the edit dialog and initialize values
    function openEditCycleDialog() {
        editCycleCount = state.cycleCount;
        editLongBreakInterval = state.longBreakInterval;
        editCycleDialogOpen = true;
    }

    // Function to handle saving the cycle changes
    function handleSaveCycleChanges() {
        console.log(`Saving changes: Cycle Count = ${editCycleCount}, Interval = ${editLongBreakInterval}`);
        const cycleCountNum = Number(editCycleCount);
        const intervalNum = Number(editLongBreakInterval);
        if (!isNaN(cycleCountNum) && !isNaN(intervalNum)) {
            requestSetCycleInfo(cycleCountNum, intervalNum);
        }
        editCycleDialogOpen = false;
    }

    // --- Edit Time Dialog State ---
    let editTimeDialogOpen = false;
    let editMinutes: number = 0;
    let editSeconds: number = 0;

    // Function to open the edit time dialog and initialize values
    function openEditTimeDialog() {
        const currentTotalSeconds = state.timeLeft;
        editMinutes = Math.floor(currentTotalSeconds / 60);
        editSeconds = currentTotalSeconds % 60;
        editTimeDialogOpen = true;
    }

    // Function to handle saving the time changes
    function handleSaveTimeChanges() {
        const minutesNum = Number(editMinutes);
        const secondsNum = Number(editSeconds);
        if (!isNaN(minutesNum) && !isNaN(secondsNum)) {
            const newTotalSeconds = (minutesNum * 60) + secondsNum;
            console.log(`Saving time changes: Total Seconds = ${newTotalSeconds}`);
            requestSetTimeLeft(newTotalSeconds);
        }
        editTimeDialogOpen = false;
    }

    // --- Derived State (calculations based on store) ---
    $: currentDuration = (
        state.phase === TimerPhase.Work ? state.workDuration :
        state.phase === TimerPhase.ShortBreak ? state.shortBreakDuration :
        state.phase === TimerPhase.LongBreak ? state.longBreakDuration :
        state.workDuration // Default
    );
    // Prevent division by zero or negative progress if duration is 0 or less
    $: progress = currentDuration > 0 ? (currentDuration - state.timeLeft) / currentDuration : 0;
    // Ensure progress is between 0 and 1
    $: clampedProgress = Math.max(0, Math.min(1, progress));

    $: formattedTime = `${Math.floor(state.timeLeft / 60).toString().padStart(2, '0')}:${(state.timeLeft % 60).toString().padStart(2, '0')}`;

    // --- Alert and Sound Effect ---
    let audioPlayer: HTMLAudioElement | null = null;
    const base_url = import.meta.env.BASE_URL;

    // Initialize Audio on Mount
    onMount(() => {
         console.log("PomodoroTimer mounted, initializing audio...");
         try {
            // Use the path provided by the user
            audioPlayer = new Audio(`${base_url}/chime-alert.mp3`);
            // Optional: Preload the audio metadata/data
            audioPlayer.preload = 'auto'; 

            audioPlayer.addEventListener('canplaythrough', () => {
                console.log("Audio ready to play (onMount listener).");
                // No need to set a flag, playSound will just try to play
            });
            audioPlayer.addEventListener('error', (e) => {
                console.error("Audio player error (onMount listener):", e);
                // Potentially disable sound playing functionality here if needed
            });
            // Attempt to load the audio. Some browsers might require this.
            audioPlayer.load();
        } catch (e) {
            console.error("Failed to initialize audio player:", e);
            audioPlayer = null; // Ensure it's null on failure
        }
    });

    // Reactive statement to trigger effects when timer finishes
    $: if (state.justFinished) {
        console.log("Timer finished! Triggering sound.");
        // Play sound
        playSound();
        // Show alert - REMOVED as it blocks execution
        // alert(`${state.phase} finished!`);
    }

    // Function to play the sound (now simpler)
    function playSound() {
        if (audioPlayer) {
            // Reset playback position and play
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(e => {
                 console.error("Error playing sound:", e);
                 // Handle potential playback errors (e.g., user hasn't interacted yet)
            });
        } else {
             console.warn("Audio player not initialized. Sound won't play.");
        }
    }

    // Cleanup audio player on component destroy
    onDestroy(() => {
        if (audioPlayer) {
            audioPlayer.pause();
            // Remove listeners if added? Optional but good practice if concerned about leaks
            audioPlayer = null; // Release reference
        }
    });

    // --- Control Functions (Call P2P actions) ---
    const handleStart = () => {
        console.log('Start button clicked');
        requestStartTimer();
    };

    const handlePause = () => {
        console.log('Pause button clicked');
        requestPauseTimer();
    };

    const handleReset = () => {
        console.log('Reset button clicked');
        requestResetTimer();
    };

    // No internal timer interval or cleanup needed here anymore

</script>

<Card padded class="pomodoro-card">
    <div class="status">{state.phase} {state.isRunning ? '(Running)' : '(Paused)'}</div>
    <!-- Make timer display clickable -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="timer-display" onclick={openEditTimeDialog} role="button" tabindex="0" title="Click to edit time remaining">
        {formattedTime}
        <span style="font-size: 0.4em; vertical-align: middle; opacity: 0.7;"> (edit)</span>
    </div>
    <LinearProgress progress={clampedProgress} buffer={1} closed={!state.isRunning} />
    <Content class="mdc-typography--body2 controls">
        {#if !state.isRunning}
            <!-- Simplified disabled logic for now, might depend on host/client later -->
            <Button variant="raised" onclick={handleStart}>
                Start
            </Button>
        {:else}
            <Button variant="raised" onclick={handlePause}>
                Pause
            </Button>
        {/if}
        <!-- Simplified disabled logic -->
        <Button onclick={handleReset} disabled={!state.isRunning && state.timeLeft === state.workDuration && state.phase === TimerPhase.Work}>
            Reset
        </Button>
    </Content>
    <!-- Make cycle info clickable -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="cycle-info" onclick={openEditCycleDialog} title="Click to edit cycles" role="button" tabindex="0" aria-label="Click to edit cycles">
        Cycles Completed: {state.cycleCount} / {state.longBreakInterval}
        <span style="font-size: 0.8em; opacity: 0.7;"> (edit)</span>
    </div>
</Card>

<!-- Edit Time Dialog -->
<Dialog
  bind:open={editTimeDialogOpen}
  aria-labelledby="edit-time-title"
  aria-describedby="edit-time-content"
>
  <Title id="edit-time-title">Edit Time Remaining</Title>
  <DialogContent id="edit-time-content" class="time-edit-content" style="display: grid; grid-template-columns: 1fr 0.1fr 1fr; align-items: center; justify-content: center; min-height: 200px; min-width: 400px;">
     <Textfield
        bind:value={editMinutes}
        label="Minutes"
        type="number"
        input$min="0"
        input$step="1"
      />
      <span class="time-separator">:</span>
      <Textfield
        bind:value={editSeconds}
        label="Seconds"
        type="number"
        input$min="0"
        input$max="59"
        input$step="1"
      />
  </DialogContent>
  <Actions>
    <Button onclick={() => editTimeDialogOpen = false}>Cancel</Button>
    <Button onclick={handleSaveTimeChanges} variant="raised">Save</Button>
  </Actions>
</Dialog>

<!-- Edit Cycle Info Dialog -->
<Dialog
  bind:open={editCycleDialogOpen}
  aria-labelledby="edit-cycle-title"
  aria-describedby="edit-cycle-content"
>
  <Title id="edit-cycle-title">Edit Cycle Information</Title>
  <DialogContent id="edit-cycle-content">
    <Textfield
      bind:value={editCycleCount}
      label="Current Cycle (Completed)"
      type="number"
      input$min="0"
      input$step="1"
      style="width: 100%; margin-bottom: 1em;"
    >
      <!-- Use HelperText component for persistent text -->
      <HelperText persistent slot="helper">Number of work cycles completed in the current sequence.</HelperText>
    </Textfield>
    <Textfield
      bind:value={editLongBreakInterval}
      label="Cycles Before Long Break"
      type="number"
      input$min="1" 
      input$step="1"
      style="width: 100%;"
    >
      <!-- Use HelperText component for persistent text -->
      <HelperText persistent slot="helper">How many work cycles until a long break starts. Must be at least 1.</HelperText>
    </Textfield>
  </DialogContent>
  <Actions>
    <Button onclick={() => editCycleDialogOpen = false}>Cancel</Button>
    <Button onclick={handleSaveCycleChanges} variant="raised">Save</Button>
  </Actions>
</Dialog>

<style lang="scss">
    .pomodoro-card {
        text-align: center;
        max-width: 350px;
        margin: 2em auto;
        padding: 1em;
    }

    .status {
        font-size: 1.2em;
        margin-bottom: 0.5em;
        min-height: 1.5em; // Prevent layout shift when (Running)/(Paused) appears
    }

    .timer-display {
        font-size: 4em;
        font-weight: bold;
        margin-bottom: 0.2em;
        font-family: 'Roboto Mono', monospace; // Use monospace for stable width
        cursor: pointer; // Make it clickable
        padding: 5px 0; // Add some padding for easier clicking
        border-radius: 4px; // Slightly rounded corners
        transition: background-color 0.2s ease-in-out;
        display: inline-block; // Prevent full width block

        &:hover {
            background-color: rgba(0, 0, 0, 0.05); // Subtle hover effect
        }
    }

    .controls {
        margin-top: 1.5em;
        display: flex;
        justify-content: center;
        gap: 1em;
    }

    // Override default LinearProgress height if needed
    :global(.pomodoro-card .mdc-linear-progress) {
        height: 8px;
        margin-top: 1em;
    }

    .time-edit-content {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .time-separator {
        font-size: 2em;
        font-weight: bold;
        margin: 0 5px;
        line-height: 1; // Adjust vertical alignment if needed
    }

    .cycle-info {
        margin-top: 1em;
        font-size: 0.9em;
        cursor: pointer; // Add cursor pointer to indicate it's clickable
        padding: 5px; // Add some padding for easier clicking
        border-radius: 4px; // Slightly rounded corners
        transition: background-color 0.2s ease-in-out;

        &:hover {
            background-color: rgba(0, 0, 0, 0.05); // Subtle hover effect
        }
    }

    // Media Query for smaller screens
    @media (max-width: 400px) {
        .timer-display {
            font-size: 3.2em; // Reduce font size slightly
        }
         .pomodoro-card {
             padding: 0.8em; // Reduce padding slightly
         }
    }
</style> 