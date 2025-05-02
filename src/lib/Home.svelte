<script lang="ts">
  import { navigate } from "svelte-routing";
  import Button from "@smui/button";
  import Card, { Content, Actions } from "@smui/card";
  import Textfield from "@smui/textfield";
  import HelperText from "@smui/textfield/helper-text";

  const base_url = import.meta.env.BASE_URL;

  let roomName = "";
  let roomNameInvalid = false;

  function handleSubmit() {
    roomName = roomName.trim();
    if (roomName) {
      roomNameInvalid = false;
      // Navigate to the session page with the entered room name
      navigate(`${base_url}/session/${encodeURIComponent(roomName)}`, { replace: true });
    } else {
      roomNameInvalid = true;
    }
  }
</script>

<div class="container">
  <Card padded style="max-width: 400px; margin: 2rem auto;">
    <Content class="mdc-typography--body1">
      <h2>Welcome to PomoCollabo!</h2>
      <p>Enter a room name to start or join a collaborative Pomodoro session.</p>
      <form on:submit|preventDefault={handleSubmit}>
        <Textfield
          bind:value={roomName}
          label="Room Name"
          style="width: 100%;"
          input$aria-label="Room Name"
          required
          invalid={roomNameInvalid}
        >
          {#if roomNameInvalid}
            <HelperText slot="helper">Room name cannot be empty.</HelperText>
          {/if}
        </Textfield>
      </form>
    </Content>
    <Actions>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- @ts-ignore -->
      <Button variant="raised" onclick={handleSubmit}>Start / Join Session</Button>
    </Actions>
  </Card>
</div>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 1rem;
  }
</style> 
