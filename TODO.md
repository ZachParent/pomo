# Collaborative Pomodoro App - TODO

## Phase 1: Core Setup & Local Pomodoro

-   [ ] **Choose Frontend Framework:**
    -   [ ] Evaluate Svelte vs. React based on preference and learning curve.
    -   [ ] Decision: _________
-   [ ] **Choose Material UI Library:**
    -   [ ] Research options compatible with the chosen framework (e.g., Material UI for React, SMUI for Svelte, or a framework-agnostic CSS lib).
    -   [ ] Decision: _________
-   [ ] **Project Initialization:**
    -   [ ] Set up the basic project structure using the chosen framework's CLI (e.g., `create-react-app`, `npx degit sveltejs/template`).
    -   [ ] Integrate the chosen UI library.
-   [ ] **Local Pomodoro Timer:**
    -   [ ] Implement the core timer logic (work, short break, long break cycles).
    -   [ ] Create UI components for displaying time, cycle status.
    -   [ ] Add controls (start, pause, reset).
    -   [ ] Implement basic settings (e.g., timer durations - potentially hardcoded initially).

## Phase 2: P2P Communication & Synchronization

-   [ ] **Choose P2P Approach:**
    -   [ ] Research P2P libraries (e.g., PeerJS, simple-peer). Consider ease of use and signaling server requirements. WebRTC directly is an option but more complex.
    -   [ ] Decision: _________
-   [ ] **Signaling Server (if required):**
    -   [ ] Set up or use a public signaling server (e.g., PeerJS offers one, or deploy a simple one on Vercel/Glitch).
-   [ ] **Session Management:**
    -   [ ] Implement session creation (generating a unique session ID).
    -   [ ] Implement joining a session via URL parameters (e.g., `?session=unique_id`).
    -   [ ] Establish P2P connections between users in the same session.
-   [ ] **Timer Synchronization:**
    -   [ ] Define data structure for timer state (current time left, current phase, running/paused).
    -   [ ] Implement logic to broadcast timer state changes (start, pause, reset, phase change) to all peers.
    -   [ ] Implement logic for new peers to receive the current state upon joining.
    -   [ ] Handle potential synchronization conflicts (e.g., designate one peer as the "leader" or use a simple "last action wins" strategy).

## Phase 3: Collaboration Feature

-   [ ] **Choose Collaboration Method:**
    -   [ ] Option A: Simple Message Board.
    -   [ ] Option B: Embeddable Whiteboard (research suitable libraries like Excalidraw, tldraw, etc.).
    -   [ ] Decision: _________
-   [ ] **Implement Collaboration Feature:**
    -   [ ] (If Message Board) Create UI for inputting and displaying messages. Broadcast/receive messages via P2P.
    -   [ ] (If Whiteboard) Integrate the chosen library. Handle state synchronization if needed (some libraries might handle this internally or require P2P relay).

## Phase 4: Persistence & Polish

-   [ ] **Refresh Resistance:**
    -   [ ] Use `localStorage` or `sessionStorage` to store the current session ID.
    -   [ ] On page load, check for a stored session ID and attempt to rejoin the P2P session.
    -   [ ] Consider storing minimal state locally to restore UI slightly faster before full sync.
-   [ ] **UI Refinement:**
    -   [ ] Apply Material styling consistently.
    -   [ ] Improve layout and user experience.
    -   [ ] Add visual cues for connection status, sync status.
-   [ ] **Testing:**
    -   [ ] Test with multiple browsers/tabs simulating different peers.
    -   [ ] Test connection drops and rejoins.
    -   [ ] Test refresh scenarios.

## Phase 5: Deployment

-   [ ] **Choose Deployment Platform:**
    -   [ ] GitHub Pages (may be challenging if a custom signaling server is needed *and* needs to run constantly).
    -   [ ] Vercel/Netlify (generally easier for apps with potential small backend needs like signaling).
    -   [ ] Decision: _________
-   [ ] **Build Configuration:**
    -   [ ] Set up build scripts for production.
-   [ ] **Deploy:**
    -   [ ] Configure platform settings.
    -   [ ] Deploy the application.
    -   [ ] Test the live deployment.

## Future Considerations (Optional)

-   [ ] More robust sync conflict resolution.
-   [ ] Customizable timer settings.
-   [ ] Sound notifications.
-   [ ] Task list integration.
