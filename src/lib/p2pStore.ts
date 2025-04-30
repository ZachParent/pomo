import { writable, get } from "svelte/store";
// Separate runtime Peer import from type-only DataConnection import
import Peer from "peerjs";
import type { DataConnection } from "peerjs";

// Import Timer Store
import type { TimerState } from "./timerStore";
import {
  timerState,
  tick,
  startTimer,
  pauseTimer,
  resetTimer,
  setTimerState,
} from "./timerStore";

interface P2PState {
  peer: Peer | null;
  myId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  isHost: boolean;
  // Track active connections (primarily for the host)
  connections: { [peerId: string]: DataConnection };
}

const initialState: P2PState = {
  peer: null,
  myId: null,
  isConnecting: false,
  isConnected: false,
  error: null,
  isHost: false,
  connections: {},
};

export const p2pState = writable<P2PState>(initialState);

let localPeer: Peer | null = null;
let timerIntervalId: number | null = null; // Store the timer interval ID
let timerStateUnsubscribe: (() => void) | null = null; // To unsubscribe from timer state changes

// --- Message Types ---
type TimerActionRequest =
  | { type: "REQUEST_START" }
  | { type: "REQUEST_PAUSE" }
  | { type: "REQUEST_RESET" };

type TimerStateBroadcast = {
  type: "STATE_UPDATE";
  payload: TimerState; // The full TimerState object
};

type P2PMessage = TimerActionRequest | TimerStateBroadcast | string; // Allow simple strings too

// --- Helper Functions ---

/** Broadcasts data to all connected peers (used by host). */
const broadcast = (data: P2PMessage) => {
  const state = get(p2pState); // Get current connections
  if (!state.isHost || !state.peer) return;

  console.log("Broadcasting:", data);
  Object.values(state.connections).forEach((conn) => {
    if (conn && conn.open) {
      conn.send(data);
    } else {
      console.warn(
        `Attempted to broadcast to closed connection: ${conn?.peer}`
      );
    }
  });
};

/** Starts the host's timer interval */
const startHostInterval = () => {
  if (timerIntervalId !== null) return; // Already running
  console.log("Starting host timer interval...");
  timerIntervalId = window.setInterval(() => {
    tick(); // Call the tick action from timerStore
  }, 1000);
};

/** Stops the host's timer interval */
const stopHostInterval = () => {
  if (timerIntervalId !== null) {
    console.log("Stopping host timer interval...");
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
};

/** Sets up subscription to timerState for broadcasting changes (host only) */
const subscribeToTimerChanges = () => {
  if (timerStateUnsubscribe) timerStateUnsubscribe(); // Unsubscribe previous if any

  timerStateUnsubscribe = timerState.subscribe(($timerState) => {
    // Only broadcast if we are the host
    const p2p = get(p2pState);
    if (p2p.isHost && p2p.isConnected) {
      broadcast({ type: "STATE_UPDATE", payload: $timerState });
    }
  });
};

// --- Core P2P Functions ---

// Function to initialize PeerJS as a host
export const initializeHost = (sessionId?: string) => {
  p2pState.update((state) => ({
    ...state,
    isConnecting: true,
    error: null,
    isHost: true,
    connections: {}, // Reset connections on new host initialization
  }));

  stopHostInterval(); // Stop any previous interval
  if (timerStateUnsubscribe) timerStateUnsubscribe(); // Clean up previous subscription

  if (localPeer) {
    localPeer.destroy();
  }

  // Use provided sessionId or let PeerJS generate one
  console.log(
    `Initializing PeerJS host with ID: ${sessionId ?? "(auto-generated)"}`
  );
  // Pass sessionId only if it's a non-empty string, otherwise let PeerJS handle it (defaults to undefined/auto-generate)
  localPeer = sessionId
    ? new Peer(sessionId, { debug: 2 })
    : new Peer({ debug: 2 });

  localPeer.on("open", (id) => {
    console.info("Host PeerJS ID is:", id);
    p2pState.update((state) => ({
      ...state,
      peer: localPeer,
      myId: id,
      isConnecting: false,
      isConnected: true,
      error: null,
    }));
    // Host specific: Start subscribing to timer changes to broadcast them
    subscribeToTimerChanges();
  });

  localPeer.on("connection", (conn) => {
    console.info("Incoming connection from:", conn.peer);

    conn.on("open", () => {
      console.info("Data connection opened with", conn.peer);
      // Add connection to state
      p2pState.update((state) => ({
        ...state,
        connections: { ...state.connections, [conn.peer]: conn },
      }));
      // Send the current timer state immediately to the new client
      const currentTimerState = get(timerState);
      conn.send({ type: "STATE_UPDATE", payload: currentTimerState });
      conn.send(`Hello from host ${get(p2pState).myId}!`); // Also send hello
    });

    conn.on("data", (data) => {
      console.info("Host received data from", conn.peer, ":", data);
      // Host handles action requests
      const message = data as P2PMessage;
      if (typeof message === "object" && message.type) {
        switch (message.type) {
          case "REQUEST_START":
            console.log(`Host received REQUEST_START from ${conn.peer}`);
            startTimer(); // Update host state
            startHostInterval(); // Start ticking
            // State change will trigger broadcast via subscription
            break;
          case "REQUEST_PAUSE":
            console.log(`Host received REQUEST_PAUSE from ${conn.peer}`);
            pauseTimer(); // Update host state
            stopHostInterval(); // Stop ticking
            // State change will trigger broadcast via subscription
            break;
          case "REQUEST_RESET":
            console.log(`Host received REQUEST_RESET from ${conn.peer}`);
            resetTimer(); // Update host state
            stopHostInterval(); // Stop ticking
            // State change will trigger broadcast via subscription
            break;
        }
      }
    });

    conn.on("close", () => {
      const peerIdToRemove = conn.peer;
      console.warn("Connection closed with", peerIdToRemove);

      // Check for valid string ID before attempting update
      if (typeof peerIdToRemove === "string") {
        p2pState.update((state) => {
          // Check if the key exists in the current state snapshot
          if (peerIdToRemove in state.connections) {
            const newConnections = { ...state.connections };
            delete newConnections[peerIdToRemove];
            return { ...state, connections: newConnections };
          } else {
            // Peer ID was valid string, but not in connections (maybe already removed?)
            console.warn(
              `Peer ID ${peerIdToRemove} not found in connections during close.`
            );
            return state; // No change needed
          }
        });
      } else {
        console.warn("Cannot remove connection on close: Peer ID is missing.");
      }
    });
    conn.on("error", (err) => {
      const peerIdToRemoveOnError = conn.peer;
      console.error("Connection error with", peerIdToRemoveOnError, ":", err);

      // Check for valid string ID before attempting update
      if (typeof peerIdToRemoveOnError === "string") {
        p2pState.update((state) => {
          // Check if the key exists in the current state snapshot
          if (peerIdToRemoveOnError in state.connections) {
            const newConnectionsOnError = { ...state.connections };
            delete newConnectionsOnError[peerIdToRemoveOnError];
            return { ...state, connections: newConnectionsOnError };
          } else {
            // Peer ID was valid string, but not in connections
            console.warn(
              `Peer ID ${peerIdToRemoveOnError} not found in connections during error.`
            );
            return state; // No change needed
          }
        });
      } else {
        console.warn("Cannot remove connection on error: Peer ID is missing.");
      }
    });
  });

  localPeer.on("disconnected", () => {
    console.warn(
      "Host disconnected from PeerJS server. Attempting to reconnect..."
    );
    p2pState.update((state) => ({
      ...state,
      isConnected: false,
      isConnecting: true,
    }));
    stopHostInterval(); // Stop timer if disconnected from server
    localPeer?.reconnect();
  });

  localPeer.on("close", () => {
    console.warn("Host Peer instance closed completely.");
    p2pState.update((state) => ({ ...initialState }));
    localPeer = null;
    stopHostInterval();
    if (timerStateUnsubscribe) timerStateUnsubscribe();
  });

  localPeer.on("error", (err) => {
    console.error("Host PeerJS error:", err);
    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: false,
      error: err.message || "Unknown PeerJS error",
    }));
    if (localPeer && !localPeer.destroyed) {
      localPeer.destroy(); // This should trigger 'close'
    } else {
      localPeer = null;
      stopHostInterval();
      if (timerStateUnsubscribe) timerStateUnsubscribe();
    }
  });
};

// Function to initialize PeerJS as a client and connect to a host
export const connectToHost = (hostId: string) => {
  p2pState.update((state) => ({
    ...state,
    isConnecting: true,
    error: null,
    isHost: false,
    connections: {}, // Clear connections (client only connects to host)
  }));

  stopHostInterval(); // Clients don't host intervals
  if (timerStateUnsubscribe) timerStateUnsubscribe(); // Clients don't broadcast

  if (localPeer) {
    localPeer.destroy();
  }

  // Client always uses auto-generated ID, but connects to specific hostId
  console.log(`Initializing PeerJS client to connect to host ID: ${hostId}`);
  localPeer = new Peer("", { debug: 2 });

  localPeer.on("open", (id) => {
    console.info("Client PeerJS ID:", id, "Connecting to host:", hostId);

    const conn = localPeer!.connect(hostId, { reliable: true });

    // Store the host connection
    p2pState.update((state) => ({ ...state, connections: { [hostId]: conn } }));

    conn.on("open", () => {
      console.info("Data connection opened with host", hostId);
      p2pState.update((state) => ({
        ...state,
        peer: localPeer,
        myId: id,
        isConnecting: false,
        isConnected: true,
        error: null,
      }));
      // Don't need to send hello, host will send state
    });

    conn.on("data", (data) => {
      console.info("Client received data from host", hostId, ":", data);
      // Client receives state updates
      const message = data as P2PMessage;
      if (typeof message === "object" && message.type === "STATE_UPDATE") {
        console.log("Client received STATE_UPDATE");
        setTimerState(message.payload); // Update the local timer store
      }
    });

    conn.on("close", () => {
      console.warn("Connection to host closed", hostId);
      p2pState.update((state) => ({
        ...state,
        isConnected: false,
        isConnecting: false,
        error: "Connection to host closed.",
        connections: {},
      }));
      // Reset timer state if disconnected?
      resetTimer(); // Or maybe keep last known state?
    });

    conn.on("error", (err) => {
      console.error("Connection error with host", hostId, ":", err);
      p2pState.update((state) => ({
        ...state,
        isConnecting: false,
        isConnected: false,
        error: `Connection error: ${err.message}`,
        connections: {},
      }));
      resetTimer(); // Reset timer on connection error
    });
  });

  // Handle errors for the client peer instance itself
  localPeer.on("error", (err) => {
    console.error("Client PeerJS error:", err);
    const errorMessage = err.message || "Unknown PeerJS error";
    const isPeerUnavailableError = errorMessage.includes(
      "Could not connect to peer"
    );

    p2pState.update((state) => ({
      // Preserve existing state if possible, especially the error for peer unavailable
      ...state,
      isConnecting: false,
      isConnected: false,
      // Keep the error if it's the specific one we handle, otherwise use the new one
      error: isPeerUnavailableError
        ? state.error || errorMessage
        : errorMessage,
      // Clear peer/ID only if it's not the peer unavailable error or if they were never set
      peer: isPeerUnavailableError ? state.peer : null,
      myId: isPeerUnavailableError ? state.myId : null,
      connections: isPeerUnavailableError ? state.connections : {},
    }));

    // Destroy the peer only if it's NOT the specific "Could not connect" error
    // We want that peer instance to potentially close gracefully without clearing the error state fully
    if (!isPeerUnavailableError && localPeer && !localPeer.destroyed) {
      console.log("Destroying client peer due to non-peer-unavailable error.");
      localPeer.destroy(); // This should trigger 'close'
    } else if (!isPeerUnavailableError) {
      // Ensure localPeer is nullified if it was already destroyed or never existed
      localPeer = null;
    }
  });

  localPeer.on("disconnected", () => {
    console.warn(
      "Client disconnected from PeerJS server. Attempting to reconnect..."
    );
    // Only update state if not already showing the peer unavailable error
    const currentState = get(p2pState);
    if (!currentState.error?.includes("Could not connect to peer")) {
      p2pState.update((state) => ({
        ...state,
        isConnected: false,
        isConnecting: true,
      }));
      localPeer?.reconnect();
    } else {
      console.log(
        "Skipping reconnect attempt because peer unavailable error is active."
      );
    }
  });

  localPeer.on("close", () => {
    console.warn("Client Peer instance closed completely.");
    // Only reset to initial state if we are NOT currently showing the peer unavailable error
    const currentState = get(p2pState);
    if (!currentState.error?.includes("Could not connect to peer")) {
      console.log(
        "Resetting state to initial due to peer close (non-peer-unavailable)."
      );
      p2pState.update((state) => ({ ...initialState }));
      localPeer = null;
    } else {
      // If peer unavailable error is active, just ensure localPeer ref is cleared
      // but leave the rest of the state (including the error) intact
      console.log(
        "Peer closed, but keeping state due to active peer unavailable error."
      );
      localPeer = null;
      // We might want to set isConnecting false here if the reconnect didn't happen
      p2pState.update((state) => ({
        ...state,
        isConnecting: false,
        peer: null,
      }));
    }
  });
};

// Function to clean up PeerJS connection
export const disconnectPeer = () => {
  stopHostInterval(); // Ensure interval is stopped regardless of host/client
  if (timerStateUnsubscribe) timerStateUnsubscribe();

  if (localPeer) {
    console.info("Disconnecting PeerJS...");
    localPeer.destroy(); // Triggers 'close' event for final cleanup
  }
  // State reset happens in 'close' event
};

// --- Functions to Send Action Requests (called by UI) ---

const sendActionRequest = (request: TimerActionRequest) => {
  const state = get(p2pState);
  if (state.isHost) {
    // Host executes directly and broadcasts via state subscription
    console.log("Host executing action locally:", request.type);
    switch (request.type) {
      case "REQUEST_START":
        startTimer();
        startHostInterval();
        break;
      case "REQUEST_PAUSE":
        pauseTimer();
        stopHostInterval();
        break;
      case "REQUEST_RESET":
        resetTimer();
        stopHostInterval();
        break;
    }
  } else {
    // Client sends request to host
    const hostConnection = Object.values(state.connections)[0]; // Client only has one connection (to host)
    if (hostConnection && hostConnection.open) {
      console.log("Client sending action request to host:", request.type);
      hostConnection.send(request);
    } else {
      console.warn("Cannot send action request: No open connection to host.");
      // Optionally show an error to the user
    }
  }
};

export const requestStartTimer = () =>
  sendActionRequest({ type: "REQUEST_START" });
export const requestPauseTimer = () =>
  sendActionRequest({ type: "REQUEST_PAUSE" });
export const requestResetTimer = () =>
  sendActionRequest({ type: "REQUEST_RESET" });
