# PlayOra

A social watch-party platform that lets friends and communities watch media together in sync, with live chat, voice chat, reactions, and host controls.

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

PlayOra 2.0 is a watch-party and real-time synchronisation platform. It is designed for friends, communities, and audiences who want to stream media together, with shared playback control, live chat, WebRTC voice chat, floating reactions, social discovery, friend presence, and host controls.

## Features

### Synchronised playback

- **Sync engine:** Sequential action numbering is intended to keep playback commands in order and reduce out-of-order race conditions.
- **Drift compensation:** The original README describes three tiers — small playback-rate adjustments for drift under 300 ms, gentle seeking for drift between 300 ms and 2 seconds, and a hard snap-sync for drift over 2 seconds.
- **Reconnection recovery:** Automatic timeline catch-up after transient disconnection or network changes, as described in the original README.

### Rooms and access control

- **Room codes:** Standardised `PO-XXXXXX` codes, with case normalisation and prefix tolerance, so entering `8K2M9X` resolves to `PO-8K2M9X`, as described in the original README.
- **Access policies:**
  - Open: direct join via link, code, or discovery
  - Password protected: room challenge with salted SHA-256 hash verification, as described in the original README
  - Host approval: guests wait in a pending lobby until the host accepts or declines, via WebSocket events

### Discovery, friends, and reactions

- **World Discovery Hub (`/world`):** Public party listings by category, including movies, music, anime, gaming, tech, and general, with active viewer counts and host information, as described in the original README.
- **Friends (`/friends`) and profiles (`/profile`):** Send, accept, decline, and remove friend connections; see live presence; join a friend's active party directly.
- **Ghost mode:** An incognito watching option that does not broadcast presence to friends, as described in the original README.
- **Reactions:** More than 24 animated floating reactions across categories including hype, laughter, drama, energy, mystery, and emotion, as described in the original README.

### Design

- A dark black and graphite design system with emerald and lime accents, as described in the original README.
- Responsive layouts for mobile, tablet, laptop, and ultra-wide desktop, with a bottom navigation on mobile that auto-hides inside watch parties, as described in the original README.

## Supported Platforms

PlayOra detects pasted URLs and selects a playback adapter:

| Platform | Sync mode, as described in the original README | Adapter |
| --- | --- | --- |
| YouTube | Native API | YouTubeAdapter |
| Twitch | Native SDK | TwitchAdapter |
| Vimeo | Native SDK | VimeoAdapter |
| Direct video | Native HTML5 | GenericHTML5Adapter |
| Kick | Assisted sync | KickAdapter |
| OTT services | Companion sync | AssistedSyncAdapter |

For OTT services, the original README describes a DRM-compliant synchronised clock with an "I'm Ready" check, rather than direct playback of protected content.

## System Architecture

- **Client:** React 19, TypeScript, Vite, Tailwind, Radix UI, Wouter
- **API server:** tRPC 11, covering auth, rooms, friends, and world discovery
- **Real-time engine:** WebSocket server for signalling, mesh voice chat, and synchronisation
- **Persistence:** MySQL with Drizzle ORM, with a zero-config in-memory fallback when no database URL is provided, as described in the original README

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

PlayOra includes a built-in diagnostics page at `/diagnostics`, as described in the original README. It is intended to check the database engine, session cryptography, WebSocket signalling, streaming URL parsers, time sync and drift, and authentication.

Diagnostic results should be read from the running application itself, rather than assumed from the original README's claims.

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
| `JWT_SECRET` | Production | Secret key used to sign session cookies; auto-generated in development, as described in the original README |
| `PORT` | Optional | HTTP and WebSocket server port, default `3000` |
| `NODE_ENV` | Optional | `development` or `production` |
| `DATABASE_URL` | Optional | MySQL connection URI; omitted means the in-memory store is used |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |

### Run the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser, as described in the original README.

## Testing

The original README describes a Vitest test suite of 41 tests across 6 files, covering room IDs and access control, room CRUD and playlists, account lifecycle and ghost mode, real-time presence, cryptographic sessions, and logout. Those counts are as described in the original README and were not independently re-run for this rewrite.

```bash
npm test
npm run check
npm run build
```

## Deployment

### Render

The repository includes a `render.yaml` Blueprint. Deploying through Render configures the Node runtime, build command, and start command from that file, and generates a secure `JWT_SECRET`, as described in the original README. The original README lists the build command as `npm install --legacy-peer-deps && npm run build` and the start command as `npm start`.

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
