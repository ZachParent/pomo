<script lang="ts">
  // Import the global SASS theme file
  import './theme/_smui-theme.scss';

  // Import SMUI base typography styles (optional, but recommended)
  import '@material/typography/mdc-typography.scss';

  // Router imports
  import { Router, Route } from "svelte-routing";

  // Component Imports
  import Home from './lib/Home.svelte';
  import PomodoroSession from './lib/PomodoroSession.svelte';

  // Import P2P store only if needed globally (e.g., for a global disconnect button?)
  // import { disconnectPeer } from './lib/p2pStore';

  // Base path for the router, useful if deploying to a subfolder
  export let url = "";

</script>

<main>
  <h1>Collaborative Pomodoro</h1>

  <Router {url}>
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

<style>
  /* Global styles remain here */
  main {
    max-width: 800px;
    margin: 0 auto;
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }

  /* Remove component-specific styles that were moved to PomodoroSession.svelte */
  /* e.g., .status, .status--connected, .status--error */

</style>
