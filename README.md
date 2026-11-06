# PlayOra

Watch together, in sync.

PlayOra is a social watch-party platform for friends and communities. Watch media together in real time, with synchronised playback, live chat, voice chat, reactions, and host controls.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Platforms](#supported-platforms)
- [System Architecture](#system-architecture)
- [Real-Time Protocol](#real-time-protocol)
- [Diagnostics](#diagnostics)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

PlayOra 2.0 is a watch-party and real-time synchronisation platform for friends, communities, and audiences who want to stream media together.

It combines shared playback control, live chat, WebRTC voice chat, floating reactions, social discovery, friend presence, and host controls in a single room-based experience.

## Features

### Synchronised playback

- **Sync engine:** Playback commands carry sequential numbers, so they are processed in monotonic order and out-of-order race conditions are reduced.
- **Drift compensation:** Three tiers keep viewers aligned:
  - Under 300 ms: small playback-rate adjustments, from 0.95x to 1.05x.
  - 300 ms to 2 seconds: gentle seeking.
  - Over 2 seconds: hard snap-sync to the authoritative timeline.
- **Reconnection recovery:** After a transient disconnection or network change, the client automatically catches up to the current timeline.

### Rooms and access control

- **Room codes:** Standardised `PO-XXXXXX` codes, for example `PO-8K2M9X`. Codes are case-normalised and prefix-tolerant, so entering `8K2M9X` resolves to `PO-8K2M9X`. Rooms are available at `/party/:code` and `/room/:code`.
- **Access policies:**
  - Open: join directly via link, code, or discovery.
  - Password protected: entry is verified with a salted SHA-256 hash challenge.
  - Host approval: guests wait in a pending lobby until the host accepts or declines, via WebSocket events.

### Discovery, friends, and reactions

- **World Discovery Hub (`/world`):** Public party listings by category — movies, music, anime, gaming, tech, and general — with active viewer counts, host information, and current media previews.
- **Friends (`/friends`) and profiles (`/profile`):** Send, accept, decline, and remove friend connections. See live presence — Online, Watching Party, or Offline — and join a friend's active party directly.
- **Ghost mode:** Watch incognito without broadcasting presence to friends.
- **Reactions:** More than 24 animated floating reactions across six categories: hype and love, laughter and joy, drama and shock, energy and celebration, mystery and speculation, and emotion and comfort.

### Design

- A dark black and graphite design system with emerald and lime accents.
- Responsive layouts for mobile, tablet, laptop, and ultra-wide desktop. On mobile, the bottom navigation auto-hides inside watch parties.

## Supported Platforms

PlayOra detects a pasted URL and selects the matching playback adapter:

| Platform | Sync mode | Adapter |
| --- | --- | --- |
| YouTube | Native API | YouTubeAdapter |
| Twitch | Native SDK | TwitchAdapter |
| Vimeo | Native SDK | VimeoAdapter |
| Direct video | Native HTML5 | GenericHTML5Adapter |
| Kick | Assisted sync | KickAdapter |
| OTT services | Companion sync | AssistedSyncAdapter |

For OTT services, PlayOra uses a DRM-compliant synchronised clock with an "I'm Ready" check, rather than direct playback of protected content.

## System Architecture

- **Client:** React 19, TypeScript, Vite, Tailwind, Radix UI, Wouter
- **API server:** tRPC 11, covering auth, rooms, friends, and world discovery
- **Real-time engine:** WebSocket server for signalling, mesh voice chat, and synchronisation
- **Persistence:** MySQL with Drizzle ORM, with a zero-config in-memory fallback when no database URL is provided

## Real-Time Protocol

WebSocket endpoint: `/api/ws`

| Event | Direction | Description |
| --- | --- | --- |
| `join_room` | Client to server | Join a room with session, role, and media information |
| `room_state` | Server to client | Authoritative room state snapshot |
| `playback_sync` | Bidirectional | Play, pause, seek, and rate adjustments with monotonic sequence numbers |
| `chat_message` | Bidirectional | Instant messaging, including system join and leave events |
| `reaction` | Bidirectional | Floating reaction broadcasts |
| `voice_signal` | Bidirectional | WebRTC audio signalling (SDP offers, answers, and ICE candidates) |
| `countdown_tick` | Bidirectional | Synchronised 3-2-1 countdown overlay |
| `join_request` | Client to server | Host approval request |
| `join_approved` | Server to client | Host approval notification |
| `party_ended` | Server to client | Host-ended party broadcast, transitioning clients to a recap view |

## Diagnostics

PlayOra includes a built-in diagnostics page at `/diagnostics`. It checks the database engine, session cryptography, WebSocket signalling, streaming URL parsers, time sync and drift, and authentication.

Check diagnostic results in the running application.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS, Radix UI, Lucide Icons, Wouter, TanStack React Query |
| Backend | Node.js 20 or higher, Express, tRPC 11, WebSocket server (`ws`) |
| Database | Drizzle ORM, MySQL, with in-memory fallback |
| Authentication | WebCrypto / `jose` for JWT authentication |
| Real-time audio | WebRTC audio mesh |

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher

### Installation

```bash
git clone https://github.com/Kshaurya-07/playora.git
cd playora
npm install --legacy-peer-deps
```

### Configuration

Create a `.env` file from the provided example:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | Production | Secret key used to sign session cookies; auto-generated in development |
| `PORT` | Optional | HTTP and WebSocket server port, default `3000` |
| `NODE_ENV` | Optional | `development` or `production` |
| `DATABASE_URL` | Optional | MySQL connection URI; omitted means the in-memory store is used |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |

When `DATABASE_URL` is omitted, PlayOra runs with its built-in in-memory store.

### Run the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Testing

The repository includes a Vitest suite of 41 tests across 6 files:

- `server/social-watch-party.test.ts` — canonical room IDs, access control, reactions, world discovery, and friends
- `server/watch-party.test.ts` — room CRUD, URL validation, playlist progression, and timeline state
- `server/account-lifecycle.test.ts` — guest accounts, profiles, ghost mode, and session persistence
- `server/realtime-presence.test.ts` — WebSocket connections, room heartbeat, member join and leave, and cleanup
- `server/crypto-session.test.ts` — HS256 JWT signing, verification, and secret rotation
- `server/auth.logout.test.ts` — session termination and cookie invalidation

```bash
npm test
npm run check
npm run build
```

## Deployment

### Render

The repository includes a `render.yaml` Blueprint. Deploying through Render configures the Node runtime, build command, and start command from that file, and generates a secure `JWT_SECRET`.

- Build command: `npm install --legacy-peer-deps && npm run build`
- Start command: `npm start`

### Standalone deployment

```bash
npm run build
NODE_ENV=production PORT=3000 JWT_SECRET=your_32_byte_secret npm start
```

Replace the placeholder secret with your own value.

## Contributing

Issues and pull requests are welcome. Please keep real-time, security, and playback changes well tested, and do not commit real secrets or tokens.

## License

This project is licensed under the MIT License. See the LICENSE file in the repository for details.

## Author

Kumar Shaurya — https://github.com/Kshaurya-07
