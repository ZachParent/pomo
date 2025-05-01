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
  setCycleInfo,
  setTimeLeft,
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
  | { type: "REQUEST_RESET" }
  | {
      type: "REQUEST_SET_CYCLE_INFO";
      payload: { cycleCount: number; longBreakInterval: number };
    }
  | { type: "REQUEST_SET_TIME_LEFT"; payload: { timeLeft: number } };

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
  console.log("[p2pStore] initializeHost called with sessionId:", sessionId);

  // --- Start Revised Initialization ---
  // 1. Destroy any existing peer FIRST to trigger its cleanup handlers cleanly.
  if (localPeer) {
    console.log(
      "[p2pStore] Destroying previous localPeer before initializing host."
    );
    localPeer.destroy();
    localPeer = null;
  }

  // 2. Stop any intervals/subscriptions related to the previous peer.
  stopHostInterval();
  if (timerStateUnsubscribe) timerStateUnsubscribe();

  // 3. NOW update the state to definitively reflect the intention to host,
  //    starting from a clean slate but setting the necessary flags.
  p2pState.update((state) => ({
    ...initialState, // Base on initial state
    isConnecting: true,
    isHost: true,
    error: null, // Explicitly clear any previous error
  }));
  // --- End Revised Initialization ---

  try {
    console.log(
      `[p2pStore] Attempting to create new Peer host with ID: ${
        sessionId ?? "(auto-generated)"
      }`
    );
    localPeer = sessionId
      ? new Peer(sessionId, { debug: 2 })
      : new Peer({ debug: 2 });

    localPeer.on("open", (id) => {
      console.log("[p2pStore] Host Peer 'open' event fired. ID:", id);
      p2pState.update((state) => ({
        ...state,
        peer: localPeer,
        myId: id,
        isConnecting: false,
        isConnected: true,
        error: null,
      }));
      subscribeToTimerChanges();
    });

    localPeer.on("connection", (conn) => {
      console.log(
        "[p2pStore] Host received 'connection' event from peer:",
        conn.peer
      );
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
            case "REQUEST_SET_CYCLE_INFO":
              console.log(
                `Host received REQUEST_SET_CYCLE_INFO from ${conn.peer}`
              );
              if (message.payload) {
                setCycleInfo(
                  message.payload.cycleCount,
                  message.payload.longBreakInterval
                );
                // State change will trigger broadcast via subscription
              } else {
                console.warn(
                  "Received REQUEST_SET_CYCLE_INFO without payload from",
                  conn.peer
                );
              }
              break;
            case "REQUEST_SET_TIME_LEFT":
              console.log(
                `Host received REQUEST_SET_TIME_LEFT from ${conn.peer}`
              );
              if (
                message.payload &&
                typeof message.payload.timeLeft === "number"
              ) {
                setTimeLeft(message.payload.timeLeft);
                // State change will trigger broadcast via subscription
              } else {
                console.warn(
                  "Received REQUEST_SET_TIME_LEFT without valid payload from",
                  conn.peer
                );
              }
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
          console.warn(
            "Cannot remove connection on close: Peer ID is missing."
          );
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
          console.warn(
            "Cannot remove connection on error: Peer ID is missing."
          );
        }
      });
    });

    localPeer.on("disconnected", () => {
      console.warn("[p2pStore] Host Peer 'disconnected' event fired.");
      const currentState = get(p2pState);
      // Only reconnect if we were actually connected/hosting successfully before the disconnect
      // and not if this is triggered after an error.
      if (currentState.isHost && !currentState.error) {
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
      } else {
        console.warn(
          "Host Peer disconnected, but not attempting reconnect (likely due to prior error or state)."
        );
        // Ensure we are not stuck in connecting state if disconnect happens after error
        if (currentState.isConnecting) {
          p2pState.update((s) => ({ ...s, isConnecting: false }));
        }
      }
    });

    localPeer.on("close", () => {
      console.warn("[p2pStore] Host Peer 'close' event fired.");
      const currentState = get(p2pState);
      // Reset only if the close wasn't preceded by an error that already reset isHost
      if (currentState.isHost) {
        console.warn(
          "Host Peer instance closed completely (while believed to be host). Resetting state."
        );
        p2pState.update((state) => ({ ...initialState }));
        localPeer = null;
        stopHostInterval();
        if (timerStateUnsubscribe) timerStateUnsubscribe();
      } else {
        console.warn(
          "Host Peer instance closed completely (state indicates not host, likely after error). Ensuring localPeer is null."
        );
        localPeer = null; // Ensure reference is cleared
      }
    });

    localPeer.on("error", (err) => {
      console.error("[p2pStore] Host Peer 'error' event fired:", err);
      const errorMessage = err.message || "Unknown Host PeerJS error";
      p2pState.update((state) => ({
        ...state,
        isConnecting: false,
        isConnected: false,
        isHost: false, // Crucially, set isHost back to false on error
        error: errorMessage,
      }));
      // Stop timer first
      stopHostInterval();
      if (timerStateUnsubscribe) timerStateUnsubscribe();
      // Then destroy the peer
      if (localPeer && !localPeer.destroyed) {
        console.log("[p2pStore] Destroying host peer due to error.");
        localPeer.destroy(); // Should trigger close
      } else {
        localPeer = null;
      }
      // Don't reset timer state here, leave it as it was
    });
  } catch (error) {
    console.error(
      "[p2pStore] CRITICAL: Error during Peer host creation:",
      error
    );
    p2pState.update((state) => ({
      ...initialState, // Reset completely on critical failure
      error: "Failed to create Peer instance for hosting.",
    }));
    localPeer = null; // Ensure localPeer is null
    stopHostInterval();
    if (timerStateUnsubscribe) timerStateUnsubscribe();
  }
};

// Function to initialize PeerJS as a client and connect to a host
export const connectToHost = (hostId: string) => {
  p2pState.update((state) => ({
    ...state,
    isConnecting: true,
    error: null,
    isHost: false,
    connections: {},
  }));

  stopHostInterval();
  if (timerStateUnsubscribe) timerStateUnsubscribe();

  if (localPeer) {
    localPeer.destroy();
    localPeer = null; // Ensure clear before creating new
  }

  console.log(`Initializing PeerJS client to connect to host ID: ${hostId}`);
  // Create the peer instance for *this* connection attempt
  const clientPeerInstance = new Peer("", { debug: 2 });
  localPeer = clientPeerInstance; // Assign to the shared variable

  clientPeerInstance.on("open", (id) => {
    console.info("Client PeerJS ID:", id, "Connecting to host:", hostId);

    const conn = clientPeerInstance!.connect(hostId, { reliable: true });

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
  clientPeerInstance.on("error", (err) => {
    console.error("Client PeerJS error:", err);
    const errorMessage = err.message || "Unknown PeerJS error";
    const isPeerUnavailableError = errorMessage.includes(
      "Could not connect to peer"
    );

    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: false,
      error: isPeerUnavailableError
        ? state.error || errorMessage
        : errorMessage,
      peer: isPeerUnavailableError ? state.peer : null,
      myId: isPeerUnavailableError ? state.myId : null,
      connections: isPeerUnavailableError ? state.connections : {},
    }));

    if (
      !isPeerUnavailableError &&
      clientPeerInstance &&
      !clientPeerInstance.destroyed
    ) {
      console.log("Destroying client peer due to non-peer-unavailable error.");
      clientPeerInstance.destroy();
    } else if (!isPeerUnavailableError) {
      // If it's not the specific error and peer is already destroyed/null,
      // ensure the global ref is also null if it somehow still points here.
      if (localPeer === clientPeerInstance) {
        localPeer = null;
      }
    }
  });

  clientPeerInstance.on("disconnected", () => {
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

  // --- Revised Client Close Handler ---
  clientPeerInstance.on("close", () => {
    console.warn(
      "Client Peer instance closed completely (Instance ID: ",
      clientPeerInstance.id,
      ")"
    );
    const currentState = get(p2pState);

    // Only modify state if this closing peer is still the *active* one in the store
    // AND if we haven't successfully transitioned to being the host.
    if (currentState.peer === clientPeerInstance && !currentState.isHost) {
      console.log(
        "[Client Close] This peer instance is the active one and we are not host. Processing close..."
      );
      if (!currentState.error?.includes("Could not connect to peer")) {
        console.log(
          "[Client Close] Resetting state to initial due to peer close (non-peer-unavailable)."
        );
        p2pState.update((state) => ({ ...initialState }));
        localPeer = null;
      } else {
        console.log(
          "[Client Close] Peer closed, but keeping state due to active peer unavailable error."
        );
        localPeer = null;
        p2pState.update((state) => ({
          ...state,
          isConnecting: false,
          peer: null,
        }));
      }
    } else {
      console.log(
        "[Client Close] Ignoring close event from potentially stale Peer instance or because we are now host."
      );
      // If the global localPeer somehow still points to this instance, clear it.
      if (localPeer === clientPeerInstance) {
        localPeer = null;
      }
    }
  });
  // --- End Revised Client Close Handler ---
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
      case "REQUEST_SET_CYCLE_INFO":
        if (request.payload) {
          setCycleInfo(
            request.payload.cycleCount,
            request.payload.longBreakInterval
          );
        } else {
          console.warn("Host attempted to set cycle info without payload.");
        }
        break;
      case "REQUEST_SET_TIME_LEFT":
        if (request.payload && typeof request.payload.timeLeft === "number") {
          setTimeLeft(request.payload.timeLeft);
        } else {
          console.warn(
            "Host attempted to set time left without valid payload."
          );
        }
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
export const requestSetCycleInfo = (
  cycleCount: number,
  longBreakInterval: number
) => {
  sendActionRequest({
    type: "REQUEST_SET_CYCLE_INFO",
    payload: { cycleCount, longBreakInterval },
  });
};

export const requestSetTimeLeft = (timeLeft: number) => {
  sendActionRequest({ type: "REQUEST_SET_TIME_LEFT", payload: { timeLeft } });
};
