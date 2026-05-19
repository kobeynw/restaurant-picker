# LunchSpin — Technical Specification

## Overview

LunchSpin is a local-network web app that helps a small team decide where to go for lunch. One person hosts the server; everyone else joins in their browser. Users browse and filter a local restaurant list, submit suggestions to a shared pool, then resolve the decision via an animated spin wheel or a group vote. No database, no accounts, no internet required at runtime.

---

## Goals & Constraints

- Runs on a local network (LAN/Wi-Fi) — no cloud, no external APIs at runtime
- No user accounts — participants enter a display name when joining
- All session state is in-memory on the server; nothing is persisted between restarts
- Restaurant data lives in `data/restaurants.json` — edited manually by the host
- One designated host machine runs the server; everyone else connects via browser
- Works on phones, tablets, and laptops (responsive UI)
- Single `npm install` + `npm start` to run — no other software to install

---

## Tech Stack

### Backend
- **Runtime:** Node.js (v20 LTS)
- **Framework:** Express.js — serves the API and the built React client as static files
- **Real-time:** Socket.io — all live session sync (participants, suggestions, votes, results)
- **Data:** `restaurants.json` read once into memory at startup; session state stored in a plain JS `Map` in memory

### Frontend
- **Framework:** React (via Vite)
- **Styling:** Tailwind CSS
- **Spin wheel:** Custom HTML5 Canvas component
- **Socket client:** `socket.io-client`
- **State:** React Context + `useReducer` for session state; no external state library

### No Database
All session state is ephemeral in-memory. When the server restarts, sessions are cleared. Restaurant data is read from `restaurants.json` at startup — to add or remove restaurants, the host edits the file and restarts the server.

---

## Data Shape

### Restaurant (`data/restaurants.json`)
```json
{
  "id": 1,
  "name": "Tsunami Restaurant & Sushi Bar",
  "cuisine": ["Japanese", "Sushi"],
  "type": "sit-down",
  "price": "$$"
}
```

- `cuisine`: array of strings — used for multi-select filtering
- `type`: `"fast-food"` | `"fast-casual"` | `"sit-down"`
- `price`: `"$"` | `"$$"` | `"$$$"`

### In-Memory Session Object
```js
{
  id: "abc123",                  // nanoid
  status: "lobby",               // lobby | submitting | deciding | result
  decisionMode: null,            // "spin" | "vote"
  participants: [
    { id: "socket-id", name: "Alex", isHost: true }
  ],
  suggestions: [
    { restaurantId: 4, suggestedBy: "socket-id" }
  ],
  votes: {
    "socket-id": 4               // participantId -> restaurantId
  },
  winnerId: null
}
```

---

## API Routes

### Restaurants
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/restaurants` | Returns full restaurant list from memory |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Creates a new in-memory session; returns `{ sessionId }` |
| GET | `/api/sessions/:id` | Returns current session state snapshot |

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_session` | `{ sessionId, name }` | Join session lobby; first joiner becomes host |
| `submit_suggestion` | `{ sessionId, restaurantId }` | Add restaurant to round pool |
| `remove_suggestion` | `{ sessionId, restaurantId }` | Remove own suggestion |
| `set_decision_mode` | `{ sessionId, mode }` | Host sets `"spin"` or `"vote"` |
| `start_deciding` | `{ sessionId }` | Host advances from submitting → deciding |
| `cast_vote` | `{ sessionId, restaurantId }` | Participant casts vote (vote mode) |
| `spin_complete` | `{ sessionId, winnerId }` | Client reports spin result (spin mode) |
| `new_round` | `{ sessionId }` | Host resets session for another round |

### Server → Client (broadcast to session room)
| Event | Payload | Description |
|-------|---------|-------------|
| `session_update` | Full session object | Sent after every state change |
| `error` | `{ message }` | Validation error for the requesting socket only |

> Using a single `session_update` event with the full session object keeps the client simple — it always replaces its local state with the latest snapshot rather than applying incremental patches.

---

## Application Flow

```
1. HOST visits http://localhost:3000
   → Clicks "Start New Round"
   → POST /api/sessions → receives sessionId
   → Sees shareable URL + QR code: http://<host-ip>:3000/join/<sessionId>

2. PARTICIPANTS open the link on their device
   → Enter a display name → socket emits join_session
   → All devices show a live lobby with participant list

3. HOST clicks "Start Suggesting"
   → Status advances to "submitting"
   → Each participant sees the restaurant list with filter controls
   → Filters (all client-side, instant): cuisine (multi-select), type, price
   → Each participant taps a restaurant to suggest it
   → Suggestions appear live on everyone's screen
   → A restaurant already suggested is marked and cannot be suggested again

4. HOST selects decision mode (Spin or Vote) and clicks "Let's Decide"
   → Status advances to "deciding"

   [SPIN MODE]
   → All participants see an animated canvas wheel with suggested restaurants
   → Any participant taps "SPIN"
   → Wheel animation plays; on completion, client emits spin_complete with winnerId
   → Server validates winnerId is a valid suggestion, records winner, broadcasts result

   [VOTE MODE]
   → Each participant sees the suggestion list and taps their choice
   → Server shows "X of Y voted" progress (no results revealed until all votes in)
   → When all participants have voted (or host force-closes voting), server tallies
   → Ties broken by random selection among tied restaurants
   → Server broadcasts winner

5. All devices show the WINNER SCREEN
   → Restaurant name, cuisine, price, and type displayed
   → Host sees "New Round" button to reset and go again
```

---

## Project Structure

```
lunchspin/
├── server/
│   ├── index.js              # Express setup, static serving, Socket.io init
│   ├── routes/
│   │   ├── restaurants.js    # GET /api/restaurants
│   │   └── sessions.js       # POST /api/sessions, GET /api/sessions/:id
│   └── socket/
│       └── handlers.js       # All socket event handlers + in-memory session store
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── socket.js         # Socket.io client singleton
│       ├── context/
│       │   └── SessionContext.jsx  # Global session state via useReducer
│       ├── pages/
│       │   ├── Home.jsx      # Create session entry point
│       │   ├── Lobby.jsx     # Waiting room + shareable link/QR
│       │   ├── Suggestions.jsx     # Browse, filter, submit suggestions
│       │   ├── Deciding.jsx  # Spin wheel or vote UI
│       │   └── Result.jsx    # Winner reveal + new round
│       └── components/
│           ├── RestaurantCard.jsx
│           ├── FilterBar.jsx
│           ├── SpinWheel.jsx  # Canvas-based animated wheel
│           ├── VotePanel.jsx
│           └── ParticipantList.jsx
└── data/
    └── restaurants.json      # Editable restaurant seed list (40 Lehi, UT spots)
```

---

## Key Implementation Details

**Session store** is a plain `Map` in `socket/handlers.js`:
```js
const sessions = new Map(); // sessionId -> session object
```
No imports, no config, no migrations.

**Host authority:** The first participant to `join_session` on a fresh session is assigned `isHost: true`. This is stored in the session object server-side. The server rejects `start_deciding`, `set_decision_mode`, and `new_round` events from non-host sockets.

**Host disconnection:** If the host socket disconnects, `isHost` is reassigned to the next participant in the array. The session continues uninterrupted.

**Filtering is fully client-side:** The full restaurant list is fetched once from `/api/restaurants` on app load and cached in React context. All filter operations are array filters in the browser — no server round-trips.

**Spin result integrity:** The spin animation runs in the browser (canvas). When it completes, the client emits `spin_complete` with the winning `restaurantId`. The server checks that this ID exists in the session's suggestions array before accepting it. This prevents a tampered or stale client from setting an arbitrary winner.

**Duplicate suggestions:** Enforced in the server's `submit_suggestion` handler — if `restaurantId` is already in `session.suggestions`, the server emits an `error` event back to that socket only. No duplicate constraint needed at the data layer.

**Vote reveal:** Individual votes are not broadcast to the room until all participants have voted (or the host closes voting). The server only emits vote counts as `"X of Y voted"` progress, not who voted for what, until the reveal.

**QR code:** Generated client-side using the `qrcode` npm package. No server involvement — the join URL is simply `window.location.origin + '/join/' + sessionId`.

---

## npm Dependencies

### Server
```
express
socket.io
nanoid
cors
```

### Client
```
react
react-dom
react-router-dom
socket.io-client
qrcode
tailwindcss
vite
@vitejs/plugin-react
```

No database drivers. No ORMs. No auth libraries.

---

## Setup & Running

```bash
# One-time setup
npm install

# Development (server + client with hot reload)
npm run dev

# Production build + serve
npm run build   # Vite builds client → server/public/
npm start       # Express serves everything on PORT 3000
```

The host shares their local IP with the team. It is displayed prominently on the home screen. Team members on the same Wi-Fi open `http://<host-ip>:3000/join/<sessionId>` — nothing to install, no accounts.

---

## Implementation Phases

### Phase 1 — Project Scaffold
- [ ] Init repo with `server/` and `client/` directories
- [ ] Configure Vite + React + Tailwind in `client/`
- [ ] Set up Express in `server/index.js` to serve the Vite build as static files in production and proxy to Vite dev server in development
- [ ] Verify `npm run dev` starts both server and client

### Phase 2 — Restaurant Data & Browse
- [ ] Load `data/restaurants.json` into memory on server startup
- [ ] Implement `GET /api/restaurants`
- [ ] Build `FilterBar` (cuisine multi-select, type toggle, price toggle) and `RestaurantCard` components
- [ ] Build `Suggestions` page browse/filter view — confirm client-side filtering works across all fields

### Phase 3 — Session & Lobby
- [ ] Implement `POST /api/sessions` (creates session in `Map`, returns `sessionId`)
- [ ] Implement Socket.io server with `join_session` handler, room management, host assignment
- [ ] Build `Home` page (create session button)
- [ ] Build `Lobby` page — live participant list, shareable URL, QR code, host "Start Suggesting" button

### Phase 4 — Suggestions Phase
- [ ] Implement `submit_suggestion` and `remove_suggestion` socket handlers
- [ ] Wire suggestion pool into `Suggestions` page — live updates via `session_update`
- [ ] Host sees "Let's Decide" button + mode selector (Spin / Vote) once ≥2 suggestions exist
- [ ] Implement `set_decision_mode` and `start_deciding` handlers

### Phase 5 — Deciding & Result
- [ ] Build `SpinWheel` canvas component — accepts array of restaurant names, animates, emits result
- [ ] Build `VotePanel` — blind voting, progress counter, reveal on completion
- [ ] Implement `cast_vote`, `spin_complete` handlers with server-side validation and tie-breaking
- [ ] Build `Result` page — winner display, host "New Round" button
- [ ] Implement `new_round` handler (resets session state in-memory, broadcasts update)

### Phase 6 — Polish
- [ ] Responsive layout pass (test on mobile viewport)
- [ ] Loading and empty states throughout
- [ ] Graceful handling of host disconnect (host reassignment)
- [ ] Brief end-to-end test: full round with spin, full round with vote
