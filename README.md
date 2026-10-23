# PlayOra 🎬 2.0
### *Watch Together. Feel Every Moment.*

[![CI Build & Test](https://github.com/Kshaurya-07/playora/actions/workflows/ci.yml/badge.svg)](https://github.com/Kshaurya-07/playora/actions/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/Tests-41%2F41%20Passed-emerald.svg)](https://github.com/Kshaurya-07/playora)
[![Diagnostics Health](https://img.shields.io/badge/Diagnostics-100%25%20Green-emerald.svg)](http://localhost:3000/diagnostics)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

**PlayOra 2.0** is an enterprise-grade, high-performance **Universal Social Watch Party & Real-Time Sync Platform**. It enables friends, communities, and global audiences to stream media together in frame-accurate synchronization with WebRTC peer-to-peer voice chat, live chat, 24+ animated floating reactions, social discovery, friend presence, and authoritative host controls.

---

## 🌟 What's New in PlayOra 2.0

### 🎯 Force Sync Engine 2.0
- **Authoritative Sequence Timeline**: Sequential action numbering (`seq` counter) ensures synchronization commands are processed strictly in monotonic order, eliminating out-of-order race conditions.
- **3-Tier Adaptive Drift Compensation**:
  - **Tier 1 (< 300ms drift)**: Micro playback rate adjustments (`0.95x` - `1.05x`) without audio distortion or stuttering.
  - **Tier 2 (300ms – 2s drift)**: Smooth, gentle programmatic seeking.
  - **Tier 3 (> 2s drift)**: Instant hard authoritative snap-sync.
- **Network Reconnection Recovery**: Automatic timeline catch-up upon transient disconnection or network handoffs.

### 🔑 Canonical Room Identifiers & Access Control
- **Canonical Room Format**: Standardized `PO-XXXXXX` (e.g., `PO-8K2M9X`) codes with automatic case-normalization, prefix tolerance (entering `8K2M9X` resolves to `PO-8K2M9X`), and `/party/:code` or `/room/:code` routing.
- **Multi-Tier Access Policies**:
  - 🔓 **Open**: Direct join via room link, room code, or World Discovery.
  - 🔒 **Password Protected**: Real-time room challenge with salted SHA-256 hash verification.
  - ✋ **Host Approval Queue**: Knocking mechanism where guests enter a pending lobby and hosts accept or deny entry in real time via WebSocket events (`join_requested`, `join_approved`, `join_rejected`).

### 🌍 World Discovery Hub (`/world`)
- Live public party showcase categorized by **Movies, Music, Anime, Gaming, Tech, and General**.
- Real-time active viewer counters, current playing media previews, host badges, and 1-click room entry.

### 👥 Real Friend System & Ghost Mode (`/friends` & `/profile`)
- **Friend Management**: Send, accept, decline, and remove friend connections.
- **Live Presence & Activity**: See real-time statuses (`Online`, `Watching Party`, `Offline`).
- **Direct Party Join**: Jump straight into a friend's active watch party from your friend list.
- **Ghost Mode**: Toggle incognito watching in your profile to stream privately without broadcasting your presence to friends.

### 🎭 24+ Animated Floating Reactions
- Synchronized floating reaction bursts overlaid on the video canvas across 6 expressive categories:
  - 🔥 **Hype & Love**: ❤️, 🔥, 👏, 🎉
  - 😂 **Laughter & Joy**: 😂, 💀, 🤣, 🥳
  - 😲 **Drama & Shock**: 😱, 🤯, 🍿, 🫣
  - ⚡ **Energy & Celebration**: 🚀, 💯, ✨, 👑
  - 🧐 **Mystery & Speculation**: 🤔, 🧐, 🕵️, 🧠
  - 🥺 **Emotion & Comfort**: 🥺, 😭, 💔, 🫂

### 🎨 Deep Black & Graphite Design System
- Sleek, modern aesthetic (`#0a0a0c` dark background, `#141419` cards, emerald/lime accents).
- Device-specific responsive layouts tailored for **Mobile phones, Tablets, Laptops, and Ultra-wide Desktops**.
- Single authoritative bottom navigation on mobile devices with smart auto-hide inside watch parties.

---

## 📺 Supported Platforms & Streaming Modes

PlayOra auto-detects pasted URLs and selects the optimal playback adapter:

| Platform | Sync Mode | Engine Adapter | Key Capabilities |
| :--- | :---: | :--- | :--- |
| **YouTube** | 🟢 Native API | `YouTubeAdapter` | Official IFrame API, Play/Pause/Seek sync, Shorts, Live streams, Speed sync |
| **Twitch** | 🟢 Native SDK | `TwitchAdapter` | Official Twitch Embed SDK, Live streams, VODs, Clips, isolated lifecycle |
| **Vimeo** | 🟢 Native SDK | `VimeoAdapter` | Official Vimeo Player SDK, HD playback, programmatic timecodes & seek |
| **Direct Video** | 🟢 Native HTML5 | `GenericHTML5Adapter` | Native `<video>`, MP4, WebM, Direct CDN links, buffer monitoring |
| **Kick** | 🟡 Assisted Sync | `KickAdapter` | Embed player, shared synchronized timeline, 3-2-1 countdown timer |
| **OTT Services** | 🟡 Companion Sync | `AssistedSyncAdapter` | DRM-compliant synchronized clock, "I'm Ready" check (Netflix, Prime, Disney+) |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       PLAYORA CLIENT                        │
│  React 19 · TypeScript · Vite · Tailwind · Radix · Wouter   │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTP / tRPC                   │ WebSocket (/api/ws)
               ▼                               ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│      tRPC 11 API SERVER      │   │  REAL-TIME SOCKET ENGINE │
│  Auth · Room · Friend · World│   │  Signaling · Mesh · Sync │
└──────────────┬───────────────┘   └───────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 DUAL-MODE PERSISTENCE LAYER                 │
│  MySQL (Drizzle ORM) ⇄ Zero-Config MemoryStore Fallback     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 Real-Time WebSocket Protocol (`/api/ws`)

| Event Type | Direction | Payload Description |
| :--- | :---: | :--- |
| `join_room` | Client $\rightarrow$ Server | Joins the specified room with user session, role, and media info. |
| `room_state` | Server $\rightarrow$ Client | Authoritative room state snapshot (playback position, sequence, members, queue). |
| `playback_sync` | Bidirectional | Synchronized play, pause, seek, and rate adjustments with monotonic `seq`. |
| `chat_message` | Bidirectional | Instant messaging with system events (join, leave, content changes). |
| `reaction` | Bidirectional | Broadcasts 24+ floating reaction bursts across all connected screens. |
| `voice_signal` | Bidirectional | Peer-to-peer WebRTC audio signaling (SDP offers, answers, and ICE candidates). |
| `countdown_tick` | Bidirectional | Synchronized 3-2-1 countdown overlay for precision assisted sync. |
| `join_request` | Client $\rightarrow$ Server | Submits entry request to host in Host Approval mode. |
| `join_approved` | Server $\rightarrow$ Client | Notifies guest that host approved admission. |
| `party_ended` | Server $\rightarrow$ Client | Authoritative broadcast when host ends the party, transitioning clients to the recap view. |

---

## 🩺 100% Green System Diagnostics

PlayOra features built-in self-testing accessible at `/diagnostics`:

- ✅ **Database Engine**: Dual-mode verified (MySQL / MariaDB with automatic zero-config In-Memory fallback).
- ✅ **Cryptographic Sessions**: HS256 JWT key validation and self-healing development secret management.
- ✅ **WebSocket Signaling**: Real-time room subscription, timeline broadcasts, and presence heartbeats.
- ✅ **Streaming URL Parsers**: Comprehensive platform regex and URL normalizers.
- ✅ **Time Sync & Drift**: NTP clock offset calculation and sub-millisecond client-server drift metering.
- ✅ **Authentication**: Full guest account lifecycle + seamless optional Google OAuth integration.

---

## 🛠️ Technology Stack

```
Frontend                           Backend
├── React 19 + TypeScript          ├── Node.js 20+ & Express
├── Vite 7                         ├── tRPC 11 (Type-Safe RPC)
├── Tailwind CSS + Radix UI        ├── WebSocket Server (`ws`)
├── Lucide Icons & Wouter Router   ├── Drizzle ORM (MySQL + MemoryStore)
├── TanStack React Query           └── WebCrypto / jose (JWT Authentication)
└── WebRTC Audio Mesh
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v9.0.0` or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Kshaurya-07/playora.git
cd playora

# Install dependencies
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Create your `.env` file from the provided example:
```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `JWT_SECRET` | Production | Auto-generated in dev | 32-byte secret key used to sign session cookies. |
| `PORT` | Optional | `3000` | Port for the HTTP & WebSocket server. |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` or `production`). |
| `DATABASE_URL` | Optional | *In-Memory Store* | MySQL connection URI (e.g. `mysql://user:pass@host:3306/playora`). |
| `VITE_GOOGLE_CLIENT_ID` | Optional | *None* | Google OAuth Client ID for optional social login. |
| `GOOGLE_CLIENT_SECRET` | Optional | *None* | Google OAuth Client Secret. |

> [!NOTE]
> When `DATABASE_URL` is omitted, PlayOra operates with a built-in in-memory database store supporting all authentication, parties, playlists, and friendships.

### 4. Running the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

---

## 🧪 Verification & Automated Testing

PlayOra maintains a 100% green test suite:

```bash
# 1. Run Vitest Unit & Integration Suites (41 tests across 6 files)
npm test

# 2. Verify TypeScript strict type-checking
npm run check

# 3. Generate production build with zero warnings
npm run build
```

### Test Coverage Highlights
- `server/social-watch-party.test.ts`: Canonical room IDs, prefix tolerance (`PO-`), multi-tier access (open, password, host approval), 24 reactions taxonomy, World discovery filtering, and friend system.
- `server/watch-party.test.ts`: Room CRUD, URL validation, playlist queue progression, and timeline state.
- `server/account-lifecycle.test.ts`: Guest accounts, user profiles, ghost mode, and session persistence.
- `server/realtime-presence.test.ts`: WebSocket connections, room heartbeat, member join/leave, and cleanup.
- `server/crypto-session.test.ts`: HS256 JWT cookie signing, verification, and secret rotation.
- `server/auth.logout.test.ts`: Session termination and cookie invalidation.

---

## 🌐 Production Deployment

### Deploy to Render
1. Fork or push this repository to GitHub.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New Blueprint Instance**.
3. Select your repository. The included [`render.yaml`](./render.yaml) will automatically configure:
   - Node.js runtime environment
   - Build command: `npm install --legacy-peer-deps && npm run build`
   - Start command: `npm start`
   - Automatic generation of secure `JWT_SECRET`

### Standalone Node.js Deployment
```bash
# Build the application
npm run build

# Start the production server
NODE_ENV=production PORT=3000 JWT_SECRET=your_32_byte_secret npm start
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
