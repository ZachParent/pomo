import { get, writable } from "svelte/store";
import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { TimerDurations, TimerState } from "./timerEngine";
import {
  getTimerSnapshot,
  pauseTimer,
  resetTimer,
  resetTimerStore,
  setCycleInfo,
  setDurations,
  setTimeLeft,
  setTimerStateFromRemote,
  startTimer,
  synchronizeTimer,
  timerStateEquals,
} from "./timerStore";

export type TransportMode = "peerjs" | "broadcast";

interface ConnectOptions {
  mode?: TransportMode;
  timeoutMs?: number;
}

interface P2PState {
  mode: TransportMode;
  roomId: string | null;
  myId: string | null;
  hostId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isHost: boolean;
  canBecomeHost: boolean;
  error: string | null;
  connections: Record<string, DataConnection>;
}

const initialState: P2PState = {
  mode: "peerjs",
  roomId: null,
  myId: null,
  hostId: null,
  isConnecting: false,
  isConnected: false,
  isHost: false,
  canBecomeHost: false,
  error: null,
  connections: {},
};

export const p2pState = writable<P2PState>(initialState);

type TimerActionMessage =
  | { type: "REQUEST_START"; senderId: string }
  | { type: "REQUEST_PAUSE"; senderId: string }
  | { type: "REQUEST_RESET"; senderId: string }
  | {
      type: "REQUEST_SET_CYCLE_INFO";
      senderId: string;
      payload: { cycleCount: number; longBreakInterval: number };
    }
  | {
      type: "REQUEST_SET_TIME_LEFT";
      senderId: string;
      payload: { remainingSeconds: number };
    }
  | {
      type: "REQUEST_SET_DURATIONS";
      senderId: string;
      payload: Partial<TimerDurations>;
    };

type TimerStateMessage = {
  type: "STATE_UPDATE";
  senderId: string;
  payload: TimerState;
};

type SessionDiscoveryMessage =
  | { type: "REQUEST_STATE"; senderId: string }
  | { type: "HOST_PONG"; senderId: string; hostId: string };

type SessionMessage = TimerActionMessage | TimerStateMessage | SessionDiscoveryMessage;

const HOST_HEARTBEAT_MS = 250;
const DEFAULT_CONNECT_TIMEOUT_MS = 8_000;

let runtimeToken = 0;
let localPeer: Peer | null = null;
let clientConnection: DataConnection | null = null;
let hostConnections: Record<string, DataConnection> = {};
let localChannel: BroadcastChannel | null = null;
let hostHeartbeatId: number | null = null;
let connectTimeoutId: number | null = null;
let lastHostBroadcastMs = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseSessionMessage = (value: unknown): SessionMessage | null => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  return value as SessionMessage;
};

const makeClientId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `client-${crypto.randomUUID()}`;
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown connection error";
};

const clearConnectTimeout = (): void => {
  if (connectTimeoutId !== null) {
    clearTimeout(connectTimeoutId);
    connectTimeoutId = null;
  }
};

const clearHostHeartbeat = (): void => {
  if (hostHeartbeatId !== null) {
    clearInterval(hostHeartbeatId);
    hostHeartbeatId = null;
  }
};

const disconnectResources = (): void => {
  clearConnectTimeout();
  clearHostHeartbeat();

  if (clientConnection) {
    try {
      clientConnection.close();
    } catch {
      // Ignore close errors during teardown.
    }
    clientConnection = null;
  }

  Object.values(hostConnections).forEach((connection) => {
    try {
      connection.close();
    } catch {
      // Ignore close errors during teardown.
    }
  });
  hostConnections = {};

  if (localPeer && !localPeer.destroyed) {
    try {
      localPeer.destroy();
    } catch {
      // Ignore destroy errors during teardown.
    }
  }
  localPeer = null;

  if (localChannel) {
    try {
      localChannel.close();
    } catch {
      // Ignore close errors during teardown.
    }
  }
  localChannel = null;
};

const beginRuntime = (): number => {
  runtimeToken += 1;
  disconnectResources();
  lastHostBroadcastMs = 0;
  return runtimeToken;
};

const setConnectionTimeout = (
  token: number,
  timeoutMs: number,
  message: string
): void => {
  clearConnectTimeout();
  connectTimeoutId = window.setTimeout(() => {
    if (token !== runtimeToken) {
      return;
    }

    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: false,
      error: message,
      canBecomeHost: true,
    }));
  }, timeoutMs);
};

const channelNameForRoom = (roomId: string): string => `pomo-room-${roomId}`;

const sendStateToPeerConnection = (connection: DataConnection): void => {
  if (!connection.open) {
    return;
  }

  const state = get(p2pState);
  if (!state.myId) {
    return;
  }

  connection.send({
    type: "STATE_UPDATE",
    senderId: state.myId,
    payload: getTimerSnapshot(),
  } satisfies TimerStateMessage);
};

const broadcastTimerState = (
  state: TimerState,
  token: number = runtimeToken
): void => {
  if (token !== runtimeToken) {
    return;
  }

  const session = get(p2pState);
  if (!session.isHost || !session.isConnected || !session.myId) {
    return;
  }

  const message: TimerStateMessage = {
    type: "STATE_UPDATE",
    senderId: session.myId,
    payload: state,
  };

  if (session.mode === "peerjs") {
    Object.values(hostConnections).forEach((connection) => {
      if (connection.open) {
        connection.send(message);
      }
    });
    return;
  }

  localChannel?.postMessage(message);
};

const sendHostPong = (hostId: string): void => {
  const state = get(p2pState);
  if (!state.myId) {
    return;
  }

  localChannel?.postMessage({
    type: "HOST_PONG",
    senderId: state.myId,
    hostId,
  } satisfies SessionDiscoveryMessage);
};

const applyHostAction = (action: TimerActionMessage, token: number): void => {
  if (token !== runtimeToken) {
    return;
  }

  const now = Date.now();

  let nextSnapshot: TimerState;
  switch (action.type) {
    case "REQUEST_START":
      nextSnapshot = startTimer(now);
      break;
    case "REQUEST_PAUSE":
      nextSnapshot = pauseTimer(now);
      break;
    case "REQUEST_RESET":
      nextSnapshot = resetTimer(now);
      break;
    case "REQUEST_SET_CYCLE_INFO":
      nextSnapshot = setCycleInfo(
        action.payload.cycleCount,
        action.payload.longBreakInterval,
        now
      );
      break;
    case "REQUEST_SET_TIME_LEFT":
      nextSnapshot = setTimeLeft(action.payload.remainingSeconds, now);
      break;
    case "REQUEST_SET_DURATIONS":
      nextSnapshot = setDurations(action.payload, now);
      break;
  }

  broadcastTimerState(nextSnapshot, token);
};

const handleClientSessionMessage = (message: SessionMessage, token: number): void => {
  if (token !== runtimeToken) {
    return;
  }

  const session = get(p2pState);
  if (!session.myId) {
    return;
  }

  if (message.senderId === session.myId && message.type !== "STATE_UPDATE") {
    return;
  }

  if (message.type === "STATE_UPDATE") {
    setTimerStateFromRemote(message.payload);
    clearConnectTimeout();
    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: true,
      hostId: message.senderId,
      error: null,
      canBecomeHost: false,
    }));
    return;
  }

  if (message.type === "HOST_PONG") {
    clearConnectTimeout();
    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: true,
      hostId: message.hostId,
      error: null,
      canBecomeHost: false,
    }));
  }
};

const handleHostSessionMessage = (
  message: SessionMessage,
  token: number,
  roomId: string
): void => {
  if (token !== runtimeToken) {
    return;
  }

  if (message.type === "REQUEST_STATE") {
    sendHostPong(roomId);
    broadcastTimerState(getTimerSnapshot(), token);
    return;
  }

  if (
    message.type === "REQUEST_START" ||
    message.type === "REQUEST_PAUSE" ||
    message.type === "REQUEST_RESET" ||
    message.type === "REQUEST_SET_CYCLE_INFO" ||
    message.type === "REQUEST_SET_TIME_LEFT" ||
    message.type === "REQUEST_SET_DURATIONS"
  ) {
    applyHostAction(message, token);
  }
};

const removeHostConnection = (peerId: string): void => {
  delete hostConnections[peerId];
  p2pState.update((state) => ({
    ...state,
    connections: { ...hostConnections },
  }));
};

const registerHostConnection = (connection: DataConnection): void => {
  hostConnections[connection.peer] = connection;
  p2pState.update((state) => ({
    ...state,
    connections: { ...hostConnections },
  }));
};

const startHostHeartbeat = (token: number): void => {
  clearHostHeartbeat();
  hostHeartbeatId = window.setInterval(() => {
    if (token !== runtimeToken) {
      return;
    }

    const before = getTimerSnapshot();
    const after = synchronizeTimer(Date.now());
    const changed = !timerStateEquals(before, after);
    const now = Date.now();

    if (changed || (after.isRunning && now - lastHostBroadcastMs >= 1_000)) {
      broadcastTimerState(after, token);
      lastHostBroadcastMs = now;
    }
  }, HOST_HEARTBEAT_MS);
};

const markClientDisconnected = (message: string): void => {
  p2pState.update((state) => ({
    ...state,
    isConnected: false,
    isConnecting: false,
    error: message,
    canBecomeHost: true,
  }));
};

const attachClientPeerConnection = (
  connection: DataConnection,
  token: number,
  roomId: string
): void => {
  connection.on("open", () => {
    if (token !== runtimeToken) {
      return;
    }

    clearConnectTimeout();
    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: true,
      hostId: roomId,
      error: null,
      canBecomeHost: false,
    }));

    connection.send({
      type: "REQUEST_STATE",
      senderId: get(p2pState).myId ?? "unknown",
    } satisfies SessionDiscoveryMessage);
  });

  connection.on("data", (data) => {
    const message = parseSessionMessage(data);
    if (!message) {
      return;
    }
    handleClientSessionMessage(message, token);
  });

  connection.on("close", () => {
    if (token !== runtimeToken) {
      return;
    }
    markClientDisconnected("Disconnected from host.");
  });

  connection.on("error", (error) => {
    if (token !== runtimeToken) {
      return;
    }
    markClientDisconnected(normalizeError(error));
  });
};

const attachHostPeerConnection = (
  connection: DataConnection,
  token: number,
  roomId: string
): void => {
  connection.on("open", () => {
    if (token !== runtimeToken) {
      return;
    }

    registerHostConnection(connection);
    sendStateToPeerConnection(connection);
  });

  connection.on("data", (data) => {
    const message = parseSessionMessage(data);
    if (!message) {
      return;
    }
    handleHostSessionMessage(message, token, roomId);
  });

  connection.on("close", () => {
    if (token !== runtimeToken) {
      return;
    }
    removeHostConnection(connection.peer);
  });

  connection.on("error", () => {
    if (token !== runtimeToken) {
      return;
    }
    removeHostConnection(connection.peer);
  });
};

const connectToBroadcastHost = (
  token: number,
  roomId: string,
  timeoutMs: number
): void => {
  const channel = new BroadcastChannel(channelNameForRoom(roomId));
  localChannel = channel;

  channel.onmessage = (event: MessageEvent<unknown>) => {
    const message = parseSessionMessage(event.data);
    if (!message) {
      return;
    }
    handleClientSessionMessage(message, token);
  };

  setConnectionTimeout(
    token,
    timeoutMs,
    `Timed out connecting to room "${roomId}".`
  );

  channel.postMessage({
    type: "REQUEST_STATE",
    senderId: get(p2pState).myId ?? "unknown",
  } satisfies SessionDiscoveryMessage);
};

const connectToPeerHost = (
  token: number,
  roomId: string,
  timeoutMs: number
): void => {
  const peer = new Peer({
    debug: 0,
  });
  localPeer = peer;

  setConnectionTimeout(
    token,
    timeoutMs,
    `Timed out connecting to room "${roomId}".`
  );

  peer.on("open", (id) => {
    if (token !== runtimeToken) {
      return;
    }

    p2pState.update((state) => ({
      ...state,
      myId: id,
    }));

    clientConnection = peer.connect(roomId, { reliable: true });
    attachClientPeerConnection(clientConnection, token, roomId);
  });

  peer.on("error", (error) => {
    if (token !== runtimeToken) {
      return;
    }

    clearConnectTimeout();
    const message = normalizeError(error);
    const canHost = /could not connect to peer|peer-unavailable/i.test(message);

    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: false,
      error: message,
      canBecomeHost: canHost || state.canBecomeHost,
    }));
  });

  peer.on("close", () => {
    if (token !== runtimeToken) {
      return;
    }
    markClientDisconnected("Peer connection closed.");
  });
};

const startBroadcastHost = (token: number, roomId: string): void => {
  const channel = new BroadcastChannel(channelNameForRoom(roomId));
  localChannel = channel;

  p2pState.update((state) => ({
    ...state,
    isConnecting: false,
    isConnected: true,
    isHost: true,
    canBecomeHost: false,
    error: null,
    myId: roomId,
    hostId: roomId,
  }));

  channel.onmessage = (event: MessageEvent<unknown>) => {
    const message = parseSessionMessage(event.data);
    if (!message) {
      return;
    }

    if (message.senderId === roomId) {
      return;
    }

    handleHostSessionMessage(message, token, roomId);
  };

  startHostHeartbeat(token);
  broadcastTimerState(getTimerSnapshot(), token);
};

const startPeerHost = (token: number, roomId: string): void => {
  const peer = new Peer(roomId, { debug: 0 });
  localPeer = peer;

  peer.on("open", (id) => {
    if (token !== runtimeToken) {
      return;
    }

    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: true,
      isHost: true,
      canBecomeHost: false,
      error: null,
      myId: id,
      hostId: id,
    }));

    startHostHeartbeat(token);
    broadcastTimerState(getTimerSnapshot(), token);
  });

  peer.on("connection", (connection) => {
    if (token !== runtimeToken) {
      return;
    }
    attachHostPeerConnection(connection, token, roomId);
  });

  peer.on("error", (error) => {
    if (token !== runtimeToken) {
      return;
    }

    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: false,
      isHost: false,
      error: normalizeError(error),
      canBecomeHost: true,
    }));
  });

  peer.on("close", () => {
    if (token !== runtimeToken) {
      return;
    }
    p2pState.update((state) => ({
      ...state,
      isConnecting: false,
      isConnected: false,
      isHost: false,
      error: "Host connection closed.",
      canBecomeHost: true,
    }));
  });
};

export const connectToHost = (
  roomId: string,
  options: ConnectOptions = {}
): void => {
  const mode = options.mode ?? "peerjs";
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const token = beginRuntime();
  const clientId = makeClientId();
  resetTimerStore(Date.now());

  p2pState.set({
    ...initialState,
    mode,
    roomId,
    myId: clientId,
    hostId: roomId,
    isConnecting: true,
    canBecomeHost: true,
  });

  if (mode === "broadcast") {
    connectToBroadcastHost(token, roomId, timeoutMs);
    return;
  }

  connectToPeerHost(token, roomId, timeoutMs);
};

export const initializeHost = (
  roomId: string,
  options: ConnectOptions = {}
): void => {
  const mode = options.mode ?? "peerjs";
  const token = beginRuntime();
  resetTimerStore(Date.now());

  p2pState.set({
    ...initialState,
    mode,
    roomId,
    myId: mode === "broadcast" ? roomId : null,
    hostId: roomId,
    isHost: true,
    isConnecting: true,
    canBecomeHost: false,
  });

  if (mode === "broadcast") {
    startBroadcastHost(token, roomId);
    return;
  }

  startPeerHost(token, roomId);
};

export const disconnectPeer = (): void => {
  beginRuntime();
  p2pState.set(initialState);
  resetTimerStore(Date.now());
};

const sendActionRequest = (
  buildMessage: (senderId: string) => TimerActionMessage
): void => {
  const state = get(p2pState);
  if (!state.roomId) {
    return;
  }

  const senderId = state.myId ?? makeClientId();
  if (!state.myId) {
    p2pState.update((current) => ({ ...current, myId: senderId }));
  }

  const message = buildMessage(senderId);

  if (state.isHost) {
    applyHostAction(message, runtimeToken);
    return;
  }

  if (state.mode === "peerjs") {
    if (clientConnection?.open) {
      clientConnection.send(message);
    }
    return;
  }

  localChannel?.postMessage(message);
};

export const requestStartTimer = (): void =>
  sendActionRequest((senderId) => ({ type: "REQUEST_START", senderId }));

export const requestPauseTimer = (): void =>
  sendActionRequest((senderId) => ({ type: "REQUEST_PAUSE", senderId }));

export const requestResetTimer = (): void =>
  sendActionRequest((senderId) => ({ type: "REQUEST_RESET", senderId }));

export const requestSetCycleInfo = (
  cycleCount: number,
  longBreakInterval: number
): void =>
  sendActionRequest((senderId) => ({
    type: "REQUEST_SET_CYCLE_INFO",
    senderId,
    payload: { cycleCount, longBreakInterval },
  }));

export const requestSetTimeLeft = (remainingSeconds: number): void =>
  sendActionRequest((senderId) => ({
    type: "REQUEST_SET_TIME_LEFT",
    senderId,
    payload: { remainingSeconds },
  }));

export const requestSetDurations = (
  durations: Partial<TimerDurations>
): void =>
  sendActionRequest((senderId) => ({
    type: "REQUEST_SET_DURATIONS",
    senderId,
    payload: durations,
  }));
