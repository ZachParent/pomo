<script lang="ts">

  // Import SMUI base typography styles (optional, but recommended)
  import '@material/typography/mdc-typography.scss';

  // Router imports
  import { Router, Route } from "svelte-routing";

  // Component Imports
  import Home from './lib/Home.svelte';
  import PomodoroSession from './lib/PomodoroSession.svelte';

  // Import P2P store only if needed globally (e.g., for a global disconnect button?)
  // import { disconnectPeer } from './lib/p2pStore';

  // Theme Store
  import { theme, toggleTheme } from './lib/themeStore';
  import IconButton, { Icon as IconButtonIcon } from '@smui/icon-button';
  import { mdiWhiteBalanceSunny, mdiWeatherNight } from '@mdi/js'; // Material Design Icons

  // Base path for the router, useful if deploying to a subfolder
  // export let url = ""; // Remove this line or comment it out
  const base_url = import.meta.env.BASE_URL; // Get base URL from Vite
  console.log(base_url);

  // Determine which icon to show based on the theme
  $: themeIcon = $theme === 'light' ? mdiWeatherNight : mdiWhiteBalanceSunny;
  $: themeLabel = $theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';

</script>

<div class="app-container">
  <header class="app-header">
    <h1>Collaborative Pomodoro</h1>
    <div class="spacer"></div>
    <!-- @ts-ignore -->
    <IconButton class="theme-toggle" onclick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
        <IconButtonIcon class="material-icons" tag="svg" viewBox="0 0 24 24">
            <path d={themeIcon} />
        </IconButtonIcon>
    </IconButton>
  </header>

  <main>
    <Router basepath={base_url}>
      <Route path="/session/:roomName" let:params>
        <!-- Pass the roomName from the URL param to the component -->
        <PomodoroSession roomName={params.roomName} />
      </Route>
      <Route path="/">
        <Home />
      </Route>
      <Route>
         <!-- Optional: Fallback route for unmatched paths -->
         <p>Page not found.</p>
         <!-- Or redirect to home:
         <script>
           import { navigate } from "svelte-routing";
           navigate("/", { replace: true });
         </script>
         -->
      </Route>
    </Router>
  </main>
</div>

<style>
  .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
  }
  .app-header {
    display: flex;
    align-items: center;
    padding: 0.5em 1em;
    background-color: var(--mdc-theme-surface);
  }

  .app-header h1 {
    font-size: 1.5rem;
    margin: 0;
    color: var(--mdc-theme-primary);
  }

  .spacer {
      flex-grow: 1;
  }

  main {
    flex-grow: 1; /* Allow main content to take up remaining space */
    max-width: 800px;
    width: 100%; /* Ensure it takes width for centering */
    margin: 0 auto; /* Center main content area */
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }

  /* Global styles remain here */
  main {
    max-width: 800px;
    margin: 0 auto;
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }

</style>
