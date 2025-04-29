<script lang="ts">
  // Import the global SASS theme file
  import './theme/_smui-theme.scss';

  // Import SMUI base typography styles (optional, but recommended)
  import '@material/typography/mdc-typography.scss';

  // Import the Pomodoro Timer component
  import PomodoroTimer from './lib/PomodoroTimer.svelte';

  // Example: Importing an SMUI component (we'll add real ones later)
  // import Button from '@smui/button';

</script>

<main>
  <h1>Collaborative Pomodoro</h1>

  <!-- App content will go here -->
  <PomodoroTimer />

</main>

<style>
  /* You can add global styles here or within theme.scss */
  main {
    padding: 1em;
    max-width: 800px;
    margin: 0 auto;
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }
</style>
