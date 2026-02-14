<script lang="ts">
  import { Route, Router } from "svelte-routing";
  import Home from "./lib/Home.svelte";
  import PomodoroSession from "./lib/PomodoroSession.svelte";
  import { normalizeBasePath } from "./lib/basePath";
  import { theme, toggleTheme } from "./lib/themeStore";

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const routerBasePath = basePath === "/" ? "" : basePath;

  $: themeLabel = $theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  $: themeSymbol = $theme === "light" ? "moon" : "sun";
</script>

<div class="app-shell">
  <header class="app-header">
    <div class="brand">
      <img src="{import.meta.env.BASE_URL}brandmark.svg" alt="Pomo logo" />
      <div>
        <p class="brand-kicker">Live Focus Rooms</p>
        <h1>Pomo Relay</h1>
      </div>
    </div>
    <button
      class="theme-toggle"
      type="button"
      on:click={toggleTheme}
      aria-label={themeLabel}
    >
      <span>{themeSymbol}</span>
      <span>{themeLabel}</span>
    </button>
  </header>

  <main class="app-main">
    <Router basepath={routerBasePath}>
      <Route path="/" component={Home} />
      <Route path="/session/:roomName" let:params>
        <PomodoroSession roomName={params.roomName} />
      </Route>
      <Route>
        <section class="missing-page">
          <h2>Page not found</h2>
          <p>Use the room form to create or join a focus session.</p>
        </section>
      </Route>
    </Router>
  </main>
</div>
