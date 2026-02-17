<script lang="ts">
  import { normalizeBasePath, withBasePath } from "./basePath";
  import { navigate } from "./navigation";

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const roomNamePattern = /^[A-Za-z0-9-]+$/;

  let roomName = "";
  let submitError = "";

  const readTransportFromQuery = (): string => {
    if (import.meta.env.SSR) {
      return "";
    }

    const params = new URLSearchParams(window.location.search);
    const transport = params.get("transport");
    return transport === "broadcast" ? "broadcast" : "peerjs";
  };

  const isRoomNameInvalid = (value: string): boolean => {
    if (!value) {
      return false;
    }

    return !roomNamePattern.test(value);
  };

  const validationMessage = (value: string): string =>
    isRoomNameInvalid(value) ? "Room name contains an unsupported character." : "";

  const joinRoomPath = (value: string): string => {
    const mode = readTransportFromQuery();
    const query = new URLSearchParams({ room: value });

    if (mode === "broadcast") {
      query.set("transport", "broadcast");
    }

    return `${withBasePath(basePath, "/")}?${query.toString()}`;
  };

  $: normalizedRoom = roomName.trim();
  $: hasValidationError = isRoomNameInvalid(normalizedRoom);
  $: canJoin = Boolean(normalizedRoom) && !hasValidationError;

  const submit = (): void => {
    if (!normalizedRoom) {
      submitError = "Room name is required.";
      return;
    }

    if (hasValidationError) {
      submitError = validationMessage(normalizedRoom);
      return;
    }

    submitError = "";
    navigate(joinRoomPath(normalizedRoom));
  };

  const clearSubmitError = (): void => {
    if (submitError) {
      submitError = "";
    }
  };

  $: isJoinDisabled = !canJoin;
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
      autocomplete="off"
      required
      on:input={clearSubmitError}
    />
    <button data-testid="join-room-button" type="submit" disabled={isJoinDisabled}>
      Join Room
    </button>
  </form>

  <p class="form-error" data-testid="room-name-feedback" aria-live="polite">
    {submitError || validationMessage(normalizedRoom) || "\u00a0"}
  </p>
</section>
