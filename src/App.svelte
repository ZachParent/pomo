<script lang="ts">
  import { onMount } from "svelte";
  import Home from "./lib/Home.svelte";
  import PomodoroSession from "./lib/PomodoroSession.svelte";
  import { normalizeBasePath, withBasePath } from "./lib/basePath";
  import { theme, toggleTheme } from "./lib/themeStore";

  const roomNamePattern = /^[A-Za-z0-9-]+$/;

  const normalizePath = (path: string): string => {
    if (!path || path === "/") {
      return "/";
    }

    return path.endsWith("/") ? path.slice(0, -1) : path;
  };

  const isValidRoomName = (value: string): boolean => roomNamePattern.test(value);

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const homePath = withBasePath(basePath, "/");

  const getCurrentPathname = (): string =>
    typeof window === "undefined" ? homePath : window.location.pathname;

  const getCurrentSearch = (): string =>
    typeof window === "undefined" ? "" : window.location.search;

  let currentPathname = getCurrentPathname();
  let currentSearch = getCurrentSearch();

  const parseRoomNameFromSearch = (search: string): string | null => {
    if (!search) {
      return null;
    }

    const params = new URLSearchParams(search);
    const rawRoom = params.get("room");
    if (!rawRoom) {
      return null;
    }

    if (!isValidRoomName(rawRoom)) {
      return null;
    }
    return rawRoom;
  };

  const syncPathname = (): void => {
    currentPathname = getCurrentPathname();
    currentSearch = getCurrentSearch();
  };

  onMount(() => {
    syncPathname();
    window.addEventListener("popstate", syncPathname);

    return () => {
      window.removeEventListener("popstate", syncPathname);
    };
  });

  $: themeLabel = $theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  $: activeRoomName = parseRoomNameFromSearch(currentSearch);
  $: showHome =
    normalizePath(currentPathname) === normalizePath(homePath) &&
    activeRoomName === null;
</script>

<div class="app-shell">
  <header class="app-header">
    <div class="brand">
      <img src="{import.meta.env.BASE_URL}brandmark.svg" alt="Pomo logo" />
      <div>
        <p class="brand-kicker">Live Focus Rooms</p>
        <h1>Pomo Collabo</h1>
      </div>
    </div>
    <button
      class="theme-toggle"
      type="button"
      on:click={toggleTheme}
      aria-label={themeLabel}
      title={themeLabel}
    >
      {#if $theme === "light"}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          class="theme-icon"
        >
          <path d="M20.4 14.6A9 9 0 1 1 9.4 3.6a7 7 0 1 0 11 11z" fill="currentColor" />
        </svg>
      {:else}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          class="theme-icon"
        >
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <g
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1.8"
            fill="none"
          >
            <path d="M12 2.5v2.4" />
            <path d="M12 19.1v2.4" />
            <path d="M2.5 12h2.4" />
            <path d="M19.1 12h2.4" />
            <path d="M5.2 5.2l1.7 1.7" />
            <path d="M17.1 17.1l1.7 1.7" />
            <path d="M18.8 5.2l-1.7 1.7" />
            <path d="M6.9 17.1l-1.7 1.7" />
          </g>
        </svg>
      {/if}
      <span class="sr-only">{themeLabel}</span>
    </button>
  </header>

  <main class="app-main">
    {#if activeRoomName}
      <PomodoroSession roomName={activeRoomName} />
    {:else if showHome}
      <Home />
    {:else}
      <section class="missing-page">
        <h2>Page not found</h2>
        <p>Use the room form to create or join a focus session.</p>
      </section>
    {/if}
  </main>
</div>
