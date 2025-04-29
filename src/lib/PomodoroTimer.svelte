<script lang="ts">
    // Removed onMount, onDestroy as internal interval is gone
    import Card, { Content } from '@smui/card';
    import Button from '@smui/button';
    import LinearProgress from '@smui/linear-progress';

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
        color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
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
        color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
    }
</style> 