# Collaborative Pomodoro App - TODO

## Phase 1: Core Setup & Local Pomodoro

- [x] **Choose Frontend Framework:**
  - [x] Evaluate Svelte vs. React based on preference and learning curve.
  - [x] Decision: **Svelte**
- [x] **Choose Material UI Library:**
  - [x] Research options compatible with the chosen framework (e.g., Material UI for React, SMUI for Svelte, or a framework-agnostic CSS lib).
  - [x] Decision: **SMUI**
- [x] **Project Initialization:**
  - [x] Set up the basic project structure using the chosen framework's CLI (e.g., `pnpm create vite . --template svelte-ts`).
  - [x] Integrate the chosen UI library. (Installed SMUI, SASS config resolved, theme file created).
- [x] **Local Pomodoro Timer:**
  - [x] Implement the core timer logic (work, short break, long break cycles).
  - [x] Create UI components for displaying time, cycle status (using Card, LinearProgress).
  - [x] Add controls (start, pause, reset - using Button).
  - [x] Implement basic settings (e.g., timer durations - hardcoded).

## Phase 2: P2P Communication & Synchronization

- [x] **Choose P2P Approach:**
  - [x] Research P2P libraries (e.g., PeerJS, simple-peer). Consider ease of use and signaling server requirements. WebRTC directly is an option but more complex.
  - [x] Decision: **PeerJS (Chosen)**
- [x] **Signaling Server (if required):**
  - [x] Set up or use a public signaling server (e.g., PeerJS offers one, or deploy a simple one on Vercel/Glitch). (Used public PeerJS server)
- [x] **Session Management:**
  - [x] Implement session creation (generating a unique session ID).
  - [x] Implement joining a session via URL parameters (e.g., `?session=unique_id`).
  - [x] Establish P2P connections between users in the same session.
- [x] **Timer Synchronization:**
  - [x] Define data structure for timer state (current time left, current phase, running/paused). (`timerStore.ts`)
  - [x] Implement logic to broadcast timer state changes (start, pause, reset, phase change) to all peers. (`p2pStore.ts` host broadcast)
  - [x] Implement logic for new peers to receive the current state upon joining. (`p2pStore.ts` host `on('connection')`)
  - [x] Handle potential synchronization conflicts (e.g., designate one peer as the "leader" or use a simple "last action wins" strategy). (Used host-led model where only host runs timer interval and applies state changes)

## Phase 3: Collaboration Feature

- [ ] **Choose Collaboration Method:**
  - [ ] Option A: Simple Message Board.
  - [ ] Option B: Embeddable Whiteboard (research suitable libraries like Excalidraw, tldraw, etc.).
  - [ ] Decision: \***\*\_\*\***
- [ ] **Implement Collaboration Feature:**
  - [ ] (If Message Board) Create UI for inputting and displaying messages. Broadcast/receive messages via P2P.
  - [ ] (If Whiteboard) Integrate the chosen library. Handle state synchronization if needed (some libraries might handle this internally or require P2P relay).

## Phase 4: Persistence & Polish

- [ ] **Refresh Resistance:**
  - [ ] Use `localStorage` or `sessionStorage` to store the current session ID.
  - [ ] On page load, check for a stored session ID and attempt to rejoin the P2P session.
  - [ ] Consider storing minimal state locally to restore UI slightly faster before full sync.
- [ ] **UI Refinement:**
  - [ ] Apply Material styling consistently.
  - [ ] Improve layout and user experience.
  - [ ] Add visual cues for connection status, sync status.
- [ ] **Testing:**
  - [ ] Test with multiple browsers/tabs simulating different peers.
  - [ ] Test connection drops and rejoins.
  - [ ] Test refresh scenarios.

## Phase 5: Deployment

- [ ] **Choose Deployment Platform:**
  - [ ] GitHub Pages (may be challenging if a custom signaling server is needed _and_ needs to run constantly).
  - [ ] Vercel/Netlify (generally easier for apps with potential small backend needs like signaling).
  - [ ] Decision: \***\*\_\*\***
- [ ] **Build Configuration:**
  - [ ] Set up build scripts for production.
- [ ] **Deploy:**
  - [ ] Configure platform settings.
  - [ ] Deploy the application.
  - [ ] Test the live deployment.

## Future Considerations (Optional)

- [ ] More robust sync conflict resolution.
- [ ] Customizable timer settings.
- [ ] Sound notifications.
- [ ] Task list integration.
