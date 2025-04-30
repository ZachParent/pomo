<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { p2pState, initializeHost, connectToHost, disconnectPeer, requestStartTimer, requestPauseTimer, requestResetTimer } from './p2pStore';
  import { timerState } from './timerStore'; // Import timerState for direct reading
  import { navigate } from "svelte-routing"; // Import navigate for leaving
  import { get } from 'svelte/store'; // Import get for checking state in timeout

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
  let connectionTimedOut = false; // New flag for timeout
  let connectionTimeoutId: number | null = null; // Timeout ID

  // PeerJS ID prefix from environment variables
  // Ensure you have VITE_PEERJS_ID_PREFIX defined in your .env file
  const peerIdPrefix = import.meta.env.VITE_PEERJS_ID_PREFIX || 'pomo-dev-'; // Default prefix if env var is not set

  const CONNECTION_TIMEOUT_MS = 3000; // 3 seconds

  // Function to clear the connection timeout
  function clearConnectionTimeout() {
    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId);
      connectionTimeoutId = null;
      console.log('[Timeout] Cleared connection timeout.');
    }
  }

  onMount(() => {
    effectiveSessionId = peerIdPrefix + roomName;
    canOfferHosting = false; // Reset on mount
    connectionError = ''; // Reset on mount
    connectionTimedOut = false; // Reset timeout flag on mount
    clearConnectionTimeout(); // Clear any lingering timeout
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

    // Start connection timeout
    console.log(`[Timeout] Starting connection timeout (${CONNECTION_TIMEOUT_MS}ms)`);
    connectionTimeoutId = window.setTimeout(() => {
      console.log('[Timeout] Connection timeout fired.');
      const currentState = get(p2pState); // Check current state
      // If still connecting and not yet connected/hosting/error
      if (currentState.isConnecting && !currentState.isConnected && !currentState.isHost && !currentState.error) {
          console.log('[Timeout] Connection timed out. Offering host option.');
          connectionTimedOut = true;
          canOfferHosting = true; // Allow user to become host
          // We might want to force a disconnect/cleanup in p2pStore here too?
          // For now, just update UI state.
          p2pState.update(s => ({ ...s, isConnecting: false, error: "Connection attempt timed out." })); // Update store state
      }
       connectionTimeoutId = null; // Ensure ID is cleared after firing
    }, CONNECTION_TIMEOUT_MS);

    // Update session link when myId changes (only if hosting)
    // This needs adjustment as myId is now prefixed
    const unsubscribeP2p = p2pState.subscribe(state => {
      console.log('[SUB] State update:', JSON.stringify({ isConnected: state.isConnected, isConnecting: state.isConnecting, isHost: state.isHost, error: state.error?.substring(0, 50) })); // Log key state props

      const wasOfferingHosting = canOfferHosting;

      // Update session link if hosting
      if (state.isHost && state.myId === effectiveSessionId) {
        sessionLink = `${window.location.origin}/session/${encodeURIComponent(roomName)}`;
        clearConnectionTimeout(); // Clear timeout if we become host
        connectionTimedOut = false; // Reset timeout flag
      } else {
        sessionLink = '';
      }

      // Reset hosting offer ONLY if we successfully connect
      if (state.isConnected) {
          if (canOfferHosting) console.log('[SUB] Resetting canOfferHosting due to isConnected = true');
          canOfferHosting = false;
          connectionError = '';
          clearConnectionTimeout(); // Clear timeout on successful connection
          connectionTimedOut = false; // Reset timeout flag
      }

      // Handle connection failures specifically to offer hosting
      // This block should only run if not connected and not connecting
      if (!state.isConnected && !state.isConnecting && state.error && !state.isHost) {
           // Avoid overwriting if already offering host
           if (!canOfferHosting && !connectionTimedOut) {
               connectionError = state.error; // Store the error only if not already handled
               console.log(`[SUB] Connection Error Detected: ${state.error.substring(0,100)}`);
               if (state.error.includes('Could not connect to peer') && state.error.includes(effectiveSessionId)) {
                   console.log("[SUB] Setting canOfferHosting = true due to PeerUnavailable error");
                   canOfferHosting = true; // Set flag to show the button
                   connectionError = ''; // Clear specific error message, use the offer UI instead
                   clearConnectionTimeout(); // Clear timeout if we get explicit failure
               } else if (state.error === "Connection attempt timed out.") {
                    // This case is handled by the timeout itself setting flags
                    console.log("[SUB] Ignoring timeout error here, handled by setTimeout callback.");
               } else {
                   console.log("[SUB] Connection error (not peer unavailable):", state.error);
                   clearConnectionTimeout(); // Clear timeout on other errors too
               }
           } else {
                console.log("[SUB] Ignoring connection error because canOfferHosting or connectionTimedOut is already true.")
           }
      } else if (!state.error && !state.isConnected && !state.isConnecting) {
           // Error cleared, and we are idle (not connected/connecting)
           if (connectionError) {
               console.log('[SUB] Clearing connectionError because state.error is null and idle');
               connectionError = '';
           }
           // If we were offering hosting but the error cleared without connecting/hosting, reset the offer.
           if (canOfferHosting && !connectionTimedOut) {
                console.log('[SUB] Resetting canOfferHosting because error cleared and idle (and not timed out)');
                canOfferHosting = false;
           }
      }

      // Reset hosting offer if we become the host
      if(state.isHost) {
          if (canOfferHosting) console.log('[SUB] Resetting canOfferHosting because isHost is true');
          canOfferHosting = false;
          connectionError = '';
          clearConnectionTimeout(); // Ensure timeout cleared
          connectionTimedOut = false; // Reset timeout flag
      }

      // Log if the flag actually changed
      if (wasOfferingHosting !== canOfferHosting) {
          console.log(`[SUB] canOfferHosting changed from ${wasOfferingHosting} to ${canOfferHosting}`);
      }
    });

    // Cleanup on component destroy
    return () => {
      console.log('PomodoroSession component unmounting, disconnecting PeerJS...');
      clearConnectionTimeout(); // Clear timeout on unmount
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
    console.log("[ACTION] User triggered handleBecomeHost for session:", effectiveSessionId);
    canOfferHosting = false;
    connectionError = '';
    connectionTimedOut = false;
    clearConnectionTimeout();
    p2pState.update(s => ({ ...s, error: null, isConnecting: true }));
    // Call initializeHost *after* the state update has likely been processed
    setTimeout(() => {
        initializeHost(effectiveSessionId);
    }, 0);
  }

  // Leave session button handler
  function handleLeaveSession() {
      console.log("Leaving session...");
      // Disconnect PeerJS (handled by onDestroy, but good practice to be explicit)
      clearConnectionTimeout(); // Clear timeout on leaving
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
      <span>{#if $p2pState.isHost}Initializing host...{:else}Connecting to P2P network for room '{roomName}'... (This may take up to {CONNECTION_TIMEOUT_MS / 1000}s){/if}</span>
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
      <!-- Specific state: Connection failed OR timed out, offering option to host -->
      <div class="status status--offer-host">
          {#if connectionTimedOut}
            <span>Connection to room '{roomName}' timed out. The host might be unavailable.</span>
          {:else}
            <span>Room '{roomName}' appears to be empty.</span>
          {/if}
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