<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import PomodoroTimer from "./PomodoroTimer.svelte";
  import {
    connectToHost,
    disconnectPeer,
    initializeHost,
    p2pState,
    type TransportMode,
  } from "./p2pStore";
  import { deriveRoomThemeTokens, toRoomThemeStyle } from "./roomTheme";
  import { theme } from "./themeStore";
  import { normalizeBasePath, withBasePath } from "./basePath";
  import { navigate } from "./navigation";

  export let roomName: string;

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const peerIdPrefix = import.meta.env.VITE_PEERJS_ID_PREFIX ?? "pomo-live-";

  let mode: TransportMode = "peerjs";
  let effectiveRoomId = "";
  let copiedLink = false;
  let copiedTimeoutId: number | null = null;
  let sessionBootstrapped = false;

  const getModeFromQuery = (): TransportMode => {
    if (import.meta.env.SSR) {
      return "peerjs";
    }

    const queryMode = new URLSearchParams(window.location.search).get("transport");
    return queryMode === "broadcast" ? "broadcast" : "peerjs";
  };

  const getSharePath = (): string => {
    const roomPath = withBasePath(basePath, `/session/${encodeURIComponent(roomName)}`);
    if (mode === "broadcast") {
      return `${roomPath}?transport=broadcast`;
    }
    return roomPath;
  };

  const getShareLink = (): string => {
    if (import.meta.env.SSR) {
      return "";
    }
    return `${window.location.origin}${getSharePath()}`;
  };

  const clearCopiedTimeout = (): void => {
    if (copiedTimeoutId !== null) {
      clearTimeout(copiedTimeoutId);
      copiedTimeoutId = null;
    }
  };

  const connect = (): void => {
    connectToHost(effectiveRoomId, {
      mode,
      timeoutMs: 8_000,
      roomTheme: {
        displayName: roomName,
      },
    });
  };

  onMount(() => {
    mode = getModeFromQuery();
    effectiveRoomId = `${peerIdPrefix}${roomName}`;
    connect();
    sessionBootstrapped = true;
  });

  onDestroy(() => {
    clearCopiedTimeout();
    disconnectPeer();
  });

  $: sessionThemeTokens = deriveRoomThemeTokens(
    $p2pState.roomTheme.accentColor,
    $theme
  );
  $: sessionThemeStyle = toRoomThemeStyle(sessionThemeTokens);

  const leaveSession = (): void => {
    clearCopiedTimeout();
    disconnectPeer();
    navigate(withBasePath(basePath, "/"), { replace: true });
  };

  const becomeHost = (): void => {
    initializeHost(effectiveRoomId, {
      mode,
      roomTheme: {
        displayName: roomName,
      },
    });
  };

  const retryConnection = (): void => {
    connect();
  };

  const copySessionLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      copiedLink = true;
      clearCopiedTimeout();
      copiedTimeoutId = window.setTimeout(() => {
        copiedLink = false;
        copiedTimeoutId = null;
      }, 1_500);
    } catch {
      copiedLink = false;
    }
  };
</script>

<section
  class="session-shell themed-session"
  style={sessionThemeStyle}
  data-testid="session-shell"
>
  <div class="session-topbar">
    <div>
      <p class="eyebrow">Room</p>
      <h2 data-testid="room-display-name">
        {$p2pState.roomTheme.emoji}
        {$p2pState.roomTheme.displayName}
      </h2>
      <p class="meta">Room ID: {roomName}</p>
      <p class="meta">
        Transport: {mode === "peerjs" ? "PeerJS" : "Broadcast test mode"}
      </p>
    </div>
    <button type="button" on:click={leaveSession}>Leave</button>
  </div>

  {#if !sessionBootstrapped}
    <div class="status status-waiting" data-testid="session-status">
      Preparing room…
    </div>
  {:else if $p2pState.isConnecting}
    <div class="status status-waiting" data-testid="session-status">
      Connecting to room host...
      {#if $p2pState.canBecomeHost}
        <span> No host has responded yet. You can host now.</span>
      {/if}
    </div>

    {#if $p2pState.canBecomeHost}
      <div class="session-actions" data-testid="connecting-host-fallback">
        <button
          data-testid="start-hosting"
          class="primary"
          type="button"
          on:click={becomeHost}
        >
          Start Hosting
        </button>
        <button type="button" on:click={retryConnection}>Retry Join</button>
      </div>
    {/if}
  {:else if $p2pState.isConnected}
    <div class="status status-ok" data-testid="session-status">
      {#if $p2pState.isHost}
        Hosting this room.
      {:else}
        Connected to host.
      {/if}
      <span class="peer-id">Peer: {$p2pState.myId}</span>
    </div>

    {#if $p2pState.isHost}
      <div class="host-tools">
        <button data-testid="copy-link-button" type="button" on:click={copySessionLink}>
          {copiedLink ? "Invite Link Copied" : "Copy Invite Link"}
        </button>
      </div>
    {/if}

    <PomodoroTimer />
  {:else if $p2pState.canBecomeHost}
    <div class="status status-warning" data-testid="session-status">
      {$p2pState.error ?? "No active host was found for this room."}
    </div>
    <div class="session-actions">
      <button
        data-testid="start-hosting"
        class="primary"
        type="button"
        on:click={becomeHost}
      >
        Start Hosting
      </button>
      <button type="button" on:click={retryConnection}>Retry Join</button>
    </div>
  {:else}
    <div class="status status-error" data-testid="session-status">
      {$p2pState.error ?? "Could not join the room."}
    </div>
    <div class="session-actions">
      <button type="button" on:click={retryConnection}>Retry Join</button>
    </div>
  {/if}
</section>
