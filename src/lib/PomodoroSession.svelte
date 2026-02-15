<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import PomodoroTimer from "./PomodoroTimer.svelte";
  import {
    connectToHost,
    disconnectPeer,
    initializeHost,
    p2pState,
    requestSetRoomTheme,
    type TransportMode,
  } from "./p2pStore";
  import {
    deriveRoomThemeTokens,
    toRoomThemeStyle,
    type RoomThemeMetadata,
  } from "./roomTheme";
  import { theme } from "./themeStore";
  import { normalizeBasePath, withBasePath } from "./basePath";

  export let roomName: string;

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const peerIdPrefix = import.meta.env.VITE_PEERJS_ID_PREFIX ?? "pomo-live-";

  let mode: TransportMode = "peerjs";
  let effectiveRoomId = "";
  let copiedLink = false;
  let copiedTimeoutId: number | null = null;
  let sessionBootstrapped = false;

  let displayNameInput = roomName;
  let emojiInput = "🍅";
  let accentColorInput = "#0d7c8f";
  let lastThemeRevision = -1;

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

  const toThemePatch = (): Partial<RoomThemeMetadata> => ({
    displayName: displayNameInput,
    emoji: emojiInput,
    accentColor: accentColorInput,
  });

  const connect = (): void => {
    connectToHost(effectiveRoomId, {
      mode,
      timeoutMs: 8_000,
      roomTheme: {
        displayName: roomName,
        emoji: emojiInput,
        accentColor: accentColorInput,
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

  $: if ($p2pState.roomThemeRevision !== lastThemeRevision) {
    displayNameInput = $p2pState.roomTheme.displayName;
    emojiInput = $p2pState.roomTheme.emoji;
    accentColorInput = $p2pState.roomTheme.accentColor;
    lastThemeRevision = $p2pState.roomThemeRevision;
  }

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
        ...toThemePatch(),
      },
    });
  };

  const retryConnection = (): void => {
    connect();
  };

  const applyRoomTheme = (): void => {
    requestSetRoomTheme(toThemePatch());
  };

  const resetThemeDraft = (): void => {
    displayNameInput = $p2pState.roomTheme.displayName;
    emojiInput = $p2pState.roomTheme.emoji;
    accentColorInput = $p2pState.roomTheme.accentColor;
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

  <form class="room-theme-form" on:submit|preventDefault={applyRoomTheme}>
    <h3>Room Theme</h3>
    <div class="room-theme-grid">
      <label>
        Display Name
        <input
          data-testid="room-display-name-input"
          bind:value={displayNameInput}
          maxlength="48"
          autocomplete="off"
        />
      </label>
      <label>
        Emoji
        <input
          data-testid="room-emoji-input"
          bind:value={emojiInput}
          maxlength="8"
          autocomplete="off"
        />
      </label>
      <label>
        Accent Color
        <input
          data-testid="room-accent-input"
          bind:value={accentColorInput}
          type="color"
        />
      </label>
    </div>
    <div class="room-theme-actions">
      <button type="submit" class="primary">Save Theme</button>
      <button type="button" on:click={resetThemeDraft}>Reset</button>
    </div>
  </form>

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
