# Changelog

## [1.0.0] - 2026-07-15

### Added

- Cloudflare Worker API with one SQLite-backed `GameRoom` Durable Object per room, hibernating WebSockets, durable deadlines, and reconnect recovery.
- Five-letter private room IDs, Turnstile protection, gateway and room-local rate limits, signed guest sessions, and idempotent commands.
- Pinned original base-card catalog, family-mode classifications, card-content attribution, Node/Worker/browser tests, CI, architecture documentation, and the cutover runbook.

### Changed

- Migrated the client to Vue 3, TypeScript, Vite, Pinia, Vue Router, and Node 24 while preserving the existing interface and interactions.
- Made the server authoritative for membership, hands, submissions, turns, scoring, chat, history, settings, and room expiration.
- Split local, staging, and production Cloudflare environments with independent bindings and secrets; initial hosting uses `workers.dev`.

### Removed

- Firebase, Cloud Functions, Vue 2, Vuex, Firebase Analytics, public matchmaking, random-room joining, and four-digit room codes.
- Legacy hidden chat administration commands and insecure client-authored game mutations.

### Security

- Added HMAC-signed HttpOnly sessions, Origin checks, bounded input validation, private per-player snapshots, server-side Turnstile verification, and atomic command receipts.

## [0.4.0-beta]

### Changed

- Moved room creation logic to the server.
- Reduced client data exposure through a redesigned database schema.

### Removed

- Lobby ready-up behavior.

## [0.3.0-beta]

### Added

- Changelog and navigation/title bar.

### Changed

- Overhauled the chat and leaderboard interfaces.
- Replaced status-bar button text with icons.
