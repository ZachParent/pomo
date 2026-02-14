<script lang="ts">
  import { navigate } from "svelte-routing";
  import { normalizeBasePath, withBasePath } from "./basePath";

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);

  let roomName = "";
  let formError = "";

  const readTransportFromQuery = (): string => {
    if (import.meta.env.SSR) {
      return "";
    }

    const params = new URLSearchParams(window.location.search);
    const transport = params.get("transport");
    if (transport === "broadcast") {
      return "?transport=broadcast";
    }

    return "";
  };

  const submit = (): void => {
    const normalizedRoom = roomName.trim();
    if (!normalizedRoom) {
      formError = "Room name is required.";
      return;
    }

    formError = "";
    const roomPath = withBasePath(
      basePath,
      `/session/${encodeURIComponent(normalizedRoom)}`
    );
    navigate(`${roomPath}${readTransportFromQuery()}`);
  };
</script>

<section class="home-panel">
  <p class="eyebrow">Collaborative Focus Timer</p>
  <h2>Start A Room In One Link</h2>
  <p class="description">
    Enter a room name. If a host already exists, you join instantly. If not, you can
    take ownership and begin the session.
  </p>

  <form class="room-form" on:submit|preventDefault={submit}>
    <label for="room-name">Room name</label>
    <input
      id="room-name"
      data-testid="room-name-input"
      bind:value={roomName}
      placeholder="team-standup"
      autocomplete="off"
      required
    />
    <button data-testid="join-room-button" type="submit">Join Room</button>
  </form>

  {#if formError}
    <p class="form-error">{formError}</p>
  {/if}
</section>
