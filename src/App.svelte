<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // Import the global SASS theme file
  import './theme/_smui-theme.scss';

  // Import SMUI base typography styles (optional, but recommended)
  import '@material/typography/mdc-typography.scss';

  // Import SMUI Components
  import Button from '@smui/button';
  import CircularProgress from '@smui/circular-progress'; // For connection indication

  // Import the Pomodoro Timer component
  import PomodoroTimer from './lib/PomodoroTimer.svelte';

  // Import P2P store and functions
  import { p2pState, initializeHost, connectToHost, disconnectPeer } from './lib/p2pStore';

  let sessionLink = '';
  let showCopiedMessage = false;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');

    if (sessionId) {
      console.log('Attempting to join session:', sessionId);
      connectToHost(sessionId);
    } else {
      // No session ID in URL, user needs to create one or join manually (for now, only create)
      console.log('No session ID in URL.');
    }

    // Update session link when myId changes (only if hosting)
    const unsubscribe = p2pState.subscribe(state => {
      if (state.isHost && state.myId) {
        sessionLink = `${window.location.origin}${window.location.pathname}?session=${state.myId}`;
      } else {
        sessionLink = ''; // Clear link if not hosting or no ID yet
      }
    });

    // Cleanup on component destroy
    return () => {
      console.log('App component unmounting, disconnecting PeerJS...');
      disconnectPeer();
      unsubscribe(); // Unsubscribe from the store
    };
  });

  function handleCreateSession() {
    console.log('Creating new session...');
    initializeHost();
  }

  async function copySessionLink() {
    if (!sessionLink) return;
    try {
      await navigator.clipboard.writeText(sessionLink);
      showCopiedMessage = true;
      setTimeout(() => showCopiedMessage = false, 2000); // Hide message after 2s
      console.log('Session link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy session link: ', err);
      // Maybe show an error message to the user
    }
  }

</script>

<main>
  <h1>Collaborative Pomodoro</h1>

  {#if $p2pState.isConnecting}
    <div class="status">
      <CircularProgress style="width: 24px; height: 24px;" indeterminate />
      <span>Connecting to P2P network...</span>
      {#if $p2pState.isHost} (as host) {:else if $p2pState.myId} (as client) {/if}
    </div>
  {:else if $p2pState.isConnected}
    <div class="status status--connected">
      {#if $p2pState.isHost}
        <span>Hosting session: {$p2pState.myId}</span>
        {#if sessionLink}
          <Button onclick={copySessionLink} variant="raised">
              {#if showCopiedMessage}Copied!{:else}Copy Invite Link{/if}
          </Button>
        {/if}
      {:else}
        <span>Connected to session! (My ID: {$p2pState.myId})</span>
      {/if}
    </div>
  {:else if $p2pState.error}
     <div class="status status--error">
        Error: {$p2pState.error}
        {#if !$p2pState.myId && !$p2pState.isConnecting}
         <!-- Show create button again if connection failed before establishing ID -->
         <Button onclick={handleCreateSession} variant="raised">Create New Session</Button>
       {/if}
     </div>
  {:else}
    <!-- Initial state: Not connecting, not connected, no error -->
    <div class="status">
      <p>Start a new Pomodoro session or join one using an invite link.</p>
      <Button onclick={handleCreateSession} variant="raised">Create New Session</Button>
    </div>
  {/if}

  <!-- Only show the timer if connected (or maybe always show it?) -->
  {#if $p2pState.isConnected}
    <PomodoroTimer />
  {:else}
    <p style="text-align: center; margin-top: 2em;"><i>Connect to a session to start the timer.</i></p>
  {/if}

</main>

<style>
  /* You can add global styles here or within theme.scss */
  main {
    padding: 1em;
    max-width: 800px;
    margin: 0 auto;
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    margin-bottom: 1em;
    border-radius: 4px;
    background-color: #eee; /* Light background for status */
  }

  .status--connected {
     background-color: #e0f2f7; /* Light cyan for connected */
  }
   .status--error {
     background-color: #ffebee; /* Light pink for error */
     color: #c62828; /* Darker red text for error */
   }

   .status span {
     flex-grow: 1;
   }
</style>
