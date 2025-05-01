<script lang="ts">
    // Removed onMount, onDestroy as internal interval is gone
    import Card, { Content } from '@smui/card';
    import Button from '@smui/button';
    import LinearProgress from '@smui/linear-progress';
    import { onDestroy, onMount } from 'svelte'; // Import onMount

    // Import the shared timer state and phase enum
    import { timerState, TimerPhase } from './timerStore';
    // Import P2P action request functions
    import { requestStartTimer, requestPauseTimer, requestResetTimer } from './p2pStore';

    // --- Reactive State (derived from store) ---
    $: state = $timerState; // Convenience alias

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

    // Initialize Audio on Mount
    onMount(() => {
         console.log("PomodoroTimer mounted, initializing audio...");
         try {
            // Use the path provided by the user
            audioPlayer = new Audio('/chime-alert.mp3');
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
    <div class="timer-display">{formattedTime}</div>
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
    <div class="cycle-info">
        Cycles Completed: {state.cycleCount} / {state.longBreakInterval}
    </div>
</Card>

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

    .cycle-info {
        margin-top: 1em;
        font-size: 0.9em;
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