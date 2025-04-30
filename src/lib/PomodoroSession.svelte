<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { p2pState, initializeHost, connectToHost, disconnectPeer, requestStartTimer, requestPauseTimer, requestResetTimer } from './p2pStore';
  import { timerState } from './timerStore'; // Import timerState for direct reading
  import { navigate } from "svelte-routing"; // Import navigate for leaving

  import Button from '@smui/button';
  import CircularProgress from '@smui/circular-progress';
  import PomodoroTimer from './PomodoroTimer.svelte';

  // Prop to receive the room name from the router
  export let roomName: string;

  let sessionLink = '';
  let showCopiedMessage = false;
  let effectiveSessionId = '';
  let canOfferHosting = false; // New state variable
  let connectionError = ''; // Store specific connection error for display

  // PeerJS ID prefix from environment variables
  // Ensure you have VITE_PEERJS_ID_PREFIX defined in your .env file
  const peerIdPrefix = import.meta.env.VITE_PEERJS_ID_PREFIX || 'pomo-dev-'; // Default prefix if env var is not set

  onMount(() => {
    effectiveSessionId = peerIdPrefix + roomName;
    canOfferHosting = false; // Reset on mount
    connectionError = ''; // Reset on mount
    console.log('PomodoroSession mounted for room:', roomName, '-> Effective ID:', effectiveSessionId);

    // Check if someone is already hosting this session ID
    // This is tricky with PeerJS's public broker. We'll try to connect first.
    // If connection fails with 'peer-unavailable', we offer to host.
    // If connection succeeds, we joined.
    // If connection fails for other reasons, show error.

    // For simplicity now: Let's *assume* the first user tries to host.
    // A better approach is needed for the "Option to become host" feature.
    // TODO: Implement logic to check if host exists before deciding to host or connect.

    // Initial approach: try connecting first
    connectToHost(effectiveSessionId);

    // Update session link when myId changes (only if hosting)
    // This needs adjustment as myId is now prefixed
    const unsubscribeP2p = p2pState.subscribe(state => {
      console.log('[SUB] State update:', JSON.stringify({ isConnected: state.isConnected, isConnecting: state.isConnecting, isHost: state.isHost, error: state.error?.substring(0, 50) })); // Log key state props

      const wasOfferingHosting = canOfferHosting;

      // Update session link if hosting
      if (state.isHost && state.myId === effectiveSessionId) {
        sessionLink = `${window.location.origin}/session/${encodeURIComponent(roomName)}`;
      } else {
        sessionLink = '';
      }

      // Reset hosting offer ONLY if we successfully connect
      if (state.isConnected) {
          if (canOfferHosting) console.log('[SUB] Resetting canOfferHosting due to isConnected = true');
          canOfferHosting = false;
          connectionError = '';
      }

      // Handle connection failures specifically to offer hosting
      // This block should only run if not connected and not connecting
      if (!state.isConnected && !state.isConnecting && state.error && !state.isHost) {
           // Avoid overwriting if already offering host
           if (!canOfferHosting) {
               connectionError = state.error; // Store the error only if not already handled
               console.log(`[SUB] Connection Error Detected: ${state.error.substring(0,100)}`);
               if (state.error.includes('Could not connect to peer') && state.error.includes(effectiveSessionId)) {
                   console.log("[SUB] Setting canOfferHosting = true");
                   canOfferHosting = true; // Set flag to show the button
                   connectionError = ''; // Clear specific error message, use the offer UI instead
               } else {
                   console.log("[SUB] Connection error (not peer unavailable):", state.error);
                   // Keep connectionError set for display
               }
           } else {
                console.log("[SUB] Ignoring connection error because canOfferHosting is already true.")
           }
      } else if (!state.error && !state.isConnected && !state.isConnecting) {
           // Error cleared, and we are idle (not connected/connecting)
           if (connectionError) {
               console.log('[SUB] Clearing connectionError because state.error is null and idle');
               connectionError = '';
           }
           // If we were offering hosting but the error cleared without connecting/hosting, reset the offer.
           if (canOfferHosting) {
                console.log('[SUB] Resetting canOfferHosting because error cleared and idle');
                canOfferHosting = false;
           }
      }

      // Reset hosting offer if we become the host
      if(state.isHost) {
          if (canOfferHosting) console.log('[SUB] Resetting canOfferHosting because isHost is true');
          canOfferHosting = false;
          connectionError = '';
      }

      // Log if the flag actually changed
      if (wasOfferingHosting !== canOfferHosting) {
          console.log(`[SUB] canOfferHosting changed from ${wasOfferingHosting} to ${canOfferHosting}`);
      }
    });

    // Cleanup on component destroy
    return () => {
      console.log('PomodoroSession component unmounting, disconnecting PeerJS...');
      disconnectPeer();
      unsubscribeP2p(); // Unsubscribe from the p2p store
    };
  });

  async function copySessionLink() {
    if (!sessionLink) return;
    try {
      await navigator.clipboard.writeText(sessionLink);
      showCopiedMessage = true;
      setTimeout(() => showCopiedMessage = false, 2000);
      console.log('Session link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy session link: ', err);
    }
  }

  // User clicks the button to become host
  function handleBecomeHost() {
    console.log("User triggered become host for session:", effectiveSessionId);
    canOfferHosting = false; // Hide button immediately
    connectionError = ''; // Clear local error message
    // Clear the error in the main store before initializing
    p2pState.update(s => ({ ...s, error: null, isConnecting: true })); // Set connecting true
    initializeHost(effectiveSessionId);
  }

  // Leave session button handler
  function handleLeaveSession() {
      console.log("Leaving session...");
      // Disconnect PeerJS (handled by onDestroy, but good practice to be explicit)
      disconnectPeer();
      // Navigate back to the home page
      navigate('/', { replace: true });
  }

</script>

<div class="session-container">
  <!-- Leave Session Button -->
  <div style="text-align: right; margin-bottom: 1em;">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- @ts-ignore -->
      <Button variant="outlined" onclick={handleLeaveSession}>Leave Session</Button>
  </div>

  {#if $p2pState.isConnecting && !canOfferHosting}
    <div class="status">
      <CircularProgress style="width: 24px; height: 24px;" indeterminate />
      <span>{#if $p2pState.isHost}Initializing host...{:else}Connecting to P2P network for room '{roomName}'...{/if}</span>
    </div>
  {:else if $p2pState.isConnected}
    <div class="status status--connected">
       {#if $p2pState.isHost}
         <span>Hosting session: {roomName}</span>
         {#if sessionLink}
           <!-- svelte-ignore a11y_click_events_have_key_events -->
           <!-- @ts-ignore -->
           <Button onclick={copySessionLink} variant="raised">
             {#if showCopiedMessage}Copied Link!{:else}Copy Invite Link{/if}
           </Button>
         {/if}
       {:else}
         <span>Connected to session: {roomName}</span>
       {/if}
       <span>(Peer ID: {$p2pState.myId})</span>
     </div>

     <!-- Only render Pomodoro Timer when fully connected -->
     <PomodoroTimer />

  {:else if canOfferHosting}
      <!-- Specific state: Connection failed, offering option to host -->
      <div class="status status--offer-host">
          <span>Room '{roomName}' appears to be empty.</span>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- @ts-ignore -->
          <Button onclick={handleBecomeHost} variant="raised" style="margin-left: 1em;">Start Hosting</Button>
      </div>
       <p style="text-align: center; margin-top: 2em;"><i>Click "Start Hosting" to begin the session.</i></p>

  {:else if connectionError}
      <!-- General connection error state -->
     <div class="status status--error">
        Error connecting to room '{roomName}': {connectionError}
        <!-- Maybe add a retry button? -->
     </div>
      <p style="text-align: center; margin-top: 2em;"><i>Could not establish connection for room '{roomName}'. Please check the room name or try again later.</i></p>

   {:else}
     <!-- Fallback / Initializing state (should be brief) -->
     <div class="status">
         <span>Initializing session '{roomName}'...</span>
          <CircularProgress style="width: 24px; height: 24px;" indeterminate />
     </div>
   {/if}

   <!-- Timer is now rendered only inside the 'isConnected' block -->

</div>

<style>
  .session-container {
    padding: 1em;
    /* Inherits styles from App.svelte or global styles */
  }

  .status {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 1em;
    border-radius: 4px;
    background-color: #eee; /* Light background for status */
    border: 1px solid #ddd;
  }

  .status--connected {
     background-color: #e0f2f7; /* Light cyan for connected */
     border-color: #b2ebf2;
  }

  .status--error {
     background-color: #ffebee; /* Light pink for error */
     color: #c62828; /* Darker red text for error */
     border-color: #ffcdd2;
   }

   .status span:first-of-type {
     flex-grow: 1; /* Allow main status text to take available space */
     font-weight: 500;
   }

   .status--offer-host {
      background-color: #fff9c4; /* Light yellow */
      border-color: #fff176;
      color: #795548; /* Brownish text */
  }
</style> 