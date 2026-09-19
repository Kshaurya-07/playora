# PlayOra 🎬
### *Watch Together. Feel Every Moment.*

[![CI Build & Test](https://github.com/Kshaurya-07/playora/actions/workflows/ci.yml/badge.svg)](https://github.com/Kshaurya-07/playora/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

**PlayOra** is a next-generation, high-performance **Universal Watch Party Platform**. It allows friends, communities, and creators around the world to stream and watch videos in perfect synchronization with real-time WebRTC voice chat, live text messaging, animated emoji reactions, and full host room controls.

---

## ✨ Features

- ⚡ **Universal Streaming Engine**: Supports YouTube, Twitch, Vimeo, direct MP4/WebM streams, Kick, and OTT platforms.
- 🎯 **Sub-Second Synchronization**: Real-time WebSocket timeline broadcast with millisecond-accurate NTP clock offset and dynamic drift compensation.
- 🎙️ **WebRTC Voice Mesh**: Crystal-clear, low-latency peer-to-peer audio calls directly in your browser. No extra software needed.
- 💬 **Live Chat & Floating Reactions**: Instant messaging with sound effects and floating animated emoji reactions across all participant screens.
- 🎛️ **Host Control Center**:
  - Master Play/Pause and Seek controls.
  - "Force Sync Everyone" button.
  - Live stream switching without closing or recreating the room.
  - Granular room policies: host-only controls, lock seeking, allow voice mesh, chat permissions.
- 📋 **Party Playlist Queue**: Add multiple videos to a collaborative queue with automatic progression to the next video when playback ends.
- 🛡️ **Hardened Cryptographic Security**: Secure HS256 session token management with zero-length key validation and self-healing development secrets.
- 🩺 **System Diagnostics Panel**: Live status checks for database, WebSocket signaling, crypto engine, and platform adapters accessible via `/diagnostics`.
- 📱 **Fully Responsive UI**: Cyberpunk-inspired dark theme crafted with Tailwind CSS, optimized for desktops, tablets, and smartphones.

---

## 📺 Supported Platforms & Capabilities

PlayOra automatically detects and adapts to whatever link you paste:

| Platform | Mode | Adapter | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **YouTube** | 🟢 Automatic Sync | `YouTubeAdapter` | Official IFrame API, Play/Pause/Seek sync, Shorts, Live streams, Speed controls |
| **Twitch** | 🟢 Automatic Sync | `TwitchAdapter` | Official Twitch Embed SDK, Live channels, VODs, Clips, Re-render isolation |
| **Vimeo** | 🟢 Automatic Sync | `VimeoAdapter` | Official Vimeo SDK, High-definition playback, Programmatic Seek & Timecodes |
| **Direct Video** | 🟢 Automatic Sync | `GenericHTML5Adapter` | Native HTML5 `<video>`, MP4, WebM, Direct CDN links, Drift correction |
| **Kick** | 🟡 Assisted Sync | `KickAdapter` | Official Kick Embed player, Shared room clock, 3-2-1 Sync countdown |
| **OTT Services** (Netflix, Prime, Disney+, etc.) | 🟡 Assisted Sync | `AssistedSyncAdapter` | Companion room mode, DRM-compliant synchronized clock, "I'm Ready" check |

---

## 🛠️ Tech Stack

- **Frontend**:
  - React 19 + TypeScript
  - Vite 7
  - Tailwind CSS + Radix UI Primitives
  - Lucide Icons & Wouter Router
  - tRPC React Query (`@trpc/client`, `@tanstack/react-query`)
  - WebRTC PeerConnection Mesh
- **Backend**:
  - Node.js 20+ & Express
  - tRPC 11 (End-to-end type safety)
  - WebSocket Server (`ws`) for real-time signaling & timeline broadcasts
  - Drizzle ORM (MySQL / MariaDB support + robust In-Memory fallback store)
  - `jose` (WebCrypto JWT signing & verification)
- **Tooling & Quality**:
  - Vitest (Automated unit & integration test suite)
  - TypeScript compiler (`tsc --noEmit`)
  - GitHub Actions CI

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: Version 20 or higher
- **npm**: Version 9 or higher

### 2. Clone the Repository
```bash
git clone https://github.com/Kshaurya-07/playora.git
cd playora
```

### 3. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 4. Configure Environment Variables
Copy the example configuration file:
```bash
cp .env.example .env
```
*(In development mode, PlayOra automatically generates and saves a secure `.dev_secret` if `JWT_SECRET` is left empty).*

### 5. Launch Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Testing & Verification

Run the comprehensive test suite and type check:

```bash
# Run Vitest test suite
npm test

# Run TypeScript typecheck
npm run check

# Build production client and server bundles
npm run build
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `JWT_SECRET` | **Production** | Auto-generated in dev | 32-byte secret key used to sign session cookies. |
| `PORT` | Optional | `3000` | Port on which the HTTP & WebSocket server will listen. |
| `NODE_ENV` | Optional | `development` | Set to `production` for optimized production builds. |
| `DATABASE_URL` | Optional | *In-Memory* | MySQL connection string (e.g. `mysql://user:pass@host:3306/playora`). If omitted, PlayOra operates with a high-performance in-memory store. |

To generate a secure 64-character hex key for `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🌐 Deployment

### Deploy to Render (Recommended)
This repository includes a [`render.yaml`](./render.yaml) blueprint:
1. Fork or push this repository to your GitHub account.
2. In the [Render Dashboard](https://dashboard.render.com/), select **New** $\rightarrow$ **Blueprint**.
3. Connect your repository.
4. Render will automatically configure the build command, start command, and generate a secure `JWT_SECRET`.

### Manual Node.js Deployment
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Build client & server
npm run build

# 3. Start server
NODE_ENV=production JWT_SECRET=your_secret_key npm start
```

---

## 🩺 System Diagnostics

PlayOra includes a real-time diagnostics dashboard at `/diagnostics` and inside watch rooms (via the **Activity** button in the header) which tests:
- HTTP API & Database connectivity
- Cryptographic session engine
- WebSocket signaling server
- Universal streaming URL parser & YouTube adapter
- NTP time offset & playback drift

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
