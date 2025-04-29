<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Card, { Content } from '@smui/card';
    import Button from '@smui/button';
    import LinearProgress from '@smui/linear-progress';

    type TimerState = 'Work' | 'Short Break' | 'Long Break' | 'Paused' | 'Stopped';

    // --- Settings (Hardcoded for now) ---
    const WORK_MINUTES = 25;
    const SHORT_BREAK_MINUTES = 5;
    const LONG_BREAK_MINUTES = 15;
    const SESSIONS_BEFORE_LONG_BREAK = 4;

    // --- Reactive State ---
    let currentState: TimerState = 'Stopped';
    let secondsRemaining = WORK_MINUTES * 60;
    let sessionsCompleted = 0;
    let timerInterval: number | null = null;
    let prePausedState: TimerState | null = null; // Store state before pausing

    // --- Derived State ---
    $: currentDuration = (
        currentState === 'Work' ? WORK_MINUTES * 60 :
        currentState === 'Short Break' ? SHORT_BREAK_MINUTES * 60 :
        currentState === 'Long Break' ? LONG_BREAK_MINUTES * 60 :
        WORK_MINUTES * 60 // Default to work duration if stopped/paused
    );
    $: progress = currentState === 'Stopped' || currentState === 'Paused' ? 0 : (currentDuration - secondsRemaining) / currentDuration;
    $: formattedTime = `${Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:${(secondsRemaining % 60).toString().padStart(2, '0')}`;
    $: isRunning = timerInterval !== null;

    // --- Timer Logic ---
    const tick = () => {
        if (secondsRemaining > 0) {
            secondsRemaining--;
        } else {
            // Timer finished, transition to next state
            if (currentState === 'Work') {
                sessionsCompleted++;
                if (sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK === 0) {
                    currentState = 'Long Break';
                    secondsRemaining = LONG_BREAK_MINUTES * 60;
                } else {
                    currentState = 'Short Break';
                    secondsRemaining = SHORT_BREAK_MINUTES * 60;
                }
            } else { // Must be 'Short Break' or 'Long Break'
                currentState = 'Work';
                secondsRemaining = WORK_MINUTES * 60;
            }
            // Automatically start next timer if it wasn't paused
            if (isRunning) {
                // Keep timer running
            } else {
                // If it finished naturally, stop the interval
                stopTimerInterval();
                currentState = 'Stopped'; // Or maybe stay on the break type but stopped?
                // Reset to Work if stopped after break
                 secondsRemaining = WORK_MINUTES * 60;
            }
        }
    };

    const startTimerInterval = () => {
        if (timerInterval === null) {
            timerInterval = window.setInterval(tick, 1000);
        }
    };

    const stopTimerInterval = () => {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    };

    // --- Control Functions ---
    const start = () => {
        let stateToStart: TimerState = 'Work'; // Default to Work

        if (currentState === 'Stopped') {
            // Starting fresh
            stateToStart = 'Work';
            secondsRemaining = WORK_MINUTES * 60;
            sessionsCompleted = 0;
        } else if (currentState === 'Paused') {
            // Resuming from pause
            stateToStart = prePausedState ?? 'Work'; // Restore pre-paused state or default to Work
            prePausedState = null; // Clear pre-paused state
        } else if (currentState === 'Short Break' || currentState === 'Long Break') {
            // If the break finished naturally and we hit start
            if (secondsRemaining === 0) {
                stateToStart = 'Work';
                secondsRemaining = WORK_MINUTES * 60;
            } else {
                // If starting during a break (treat as resuming break)
                stateToStart = currentState;
            }
        } else {
            // Should not happen if already running, but safe default
            stateToStart = 'Work';
            secondsRemaining = WORK_MINUTES * 60;
        }

        currentState = stateToStart;
        startTimerInterval();

         // Note: isRunning is reactive, no need to manually set UI state here
    };

    const pause = () => {
        if (isRunning) { // Only pause if actually running
            prePausedState = currentState; // Store current state before pausing
            stopTimerInterval();
            currentState = 'Paused';
        }
    };

    const reset = () => {
        stopTimerInterval();
        currentState = 'Stopped';
        secondsRemaining = WORK_MINUTES * 60;
        sessionsCompleted = 0;
        prePausedState = null; // Clear pre-paused state on reset
    };

    // Cleanup interval on component destroy
    onDestroy(() => {
        stopTimerInterval();
    });

</script>

<Card padded class="pomodoro-card">
    <div class="status">{currentState}</div>
    <div class="timer-display">{formattedTime}</div>
    <LinearProgress progress={progress} determinate={true} buffer={1} closed={currentState === 'Stopped' || currentState === 'Paused'} />
    <Content class="mdc-typography--body2 controls">
        {#if !isRunning}
            <Button variant="raised" onclick={start} disabled={currentState !== 'Stopped' && currentState !== 'Paused' && secondsRemaining === 0}>
                Start
            </Button>
        {:else}
            <Button variant="raised" onclick={pause}>
                Pause
            </Button>
        {/if}
        <Button onclick={reset} disabled={currentState === 'Stopped'}>
            Reset
        </Button>
    </Content>
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
        color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
        margin-bottom: 0.5em;
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
</style> 