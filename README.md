# Pain in My Deck

Pain in My Deck is a private, mobile-first Cards Against Humanity clone for playing with friends. The 2026 rebuild preserves the original interface while replacing the client-authoritative Firebase application with a Vue 3 client and a server-authoritative Cloudflare Worker.

Rooms are unlisted and ephemeral. One SQLite-backed Durable Object owns each room, including membership, hands, turns, scoring, chat, reconnect state, and expiration. There is no public matchmaking, account system, analytics, or paid infrastructure dependency.

## Local development

Requirements:

- Node.js 24 (`.nvmrc` is included)
- npm
- A modern browser

Set up a fresh checkout:

```bash
nvm install
nvm use
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

Replace `SESSION_SIGNING_KEY` in `.dev.vars` with at least 32 random bytes before testing sessions. For example, generate a value with `openssl rand -hex 32` and paste the result into the file. Never commit `.dev.vars` or production secrets.

Local configuration sets `TURNSTILE_REQUIRED=false`, so a real Turnstile widget is not required for normal development. `npm run dev` starts the Vue application and local Worker runtime together through the Cloudflare Vite plugin.

The browser-facing `VITE_TURNSTILE_SITE_KEY` is documented in `.env.example`. Leave it unset during normal Vite development to use Cloudflare's always-pass test widget. A remote build must provide the public key for that environment; unlike the secret key, the site key is intentionally embedded in the browser bundle.

### UI workbench

Run `npm run storybook` to open the isolated UI workbench at `http://localhost:6006`. Its screen stories hydrate a Storybook-only Pinia instance from deterministic protocol snapshots and use a guard-free memory router, so they never create a room, call the API, or open a socket.

Add full-screen states to `src/stories/AppScreens.stories.ts` and reusable snapshot data to `src/stories/fixtures/gameScenarios.ts`. Use `npm run test:storybook` to run every story and interaction in headless Chromium; install the pinned browser once with `npx playwright install chromium`.

The workbench intentionally loads the same remote fonts as the current app. Use it for interaction and responsive review now, but do not establish durable pixel baselines until the refresh chooses and self-hosts its production fonts.

## Room IDs

Every room ID is exactly five uppercase letters matching:

```text
^[A-HJ-NP-Z]{5}$
```

`I` and `O` are excluded to avoid transcription mistakes. Input is trimmed and converted to uppercase, so `/join/abcde` canonicalizes to `/join/ABCDE`. A room ID is an unlisted convenience code, not a cryptographic secret; do not use room chat for sensitive information.

## Verification commands

```bash
npm run format:check
npm run lint
npm run cf:types:check
npm run typecheck
npm test
npm run test:worker
npm run test:storybook
npm run test:e2e
npm run build
npm run storybook:build
npm run cf:startup
npm run deploy:dry-run
```

`npm run test:e2e` requires Playwright's Chromium binary (`npx playwright install chromium`). CI runs the static, unit, Worker integration, browser, startup, and dry-run deployment checks on Node 24.

Before validating a staging or production release bundle, export that environment's `VITE_TURNSTILE_SITE_KEY`; a production-mode build without a real site key is not deployable even if compilation succeeds.

## Cloudflare environments

The first deployment target is `workers.dev`; a custom domain is intentionally deferred.

| Environment | Worker                 | URL                                                            |
| ----------- | ---------------------- | -------------------------------------------------------------- |
| Local       | `paininmydeck-local`   | Printed by `npm run dev`                                       |
| Staging     | `paininmydeck-staging` | `https://paininmydeck-staging.<account-subdomain>.workers.dev` |
| Production  | `paininmydeck`         | `https://paininmydeck.<account-subdomain>.workers.dev`         |

Before the first remote deployment, authenticate Wrangler and set a unique signing key and the matching Turnstile secret in each environment:

```bash
npx wrangler login
npx wrangler secret put SESSION_SIGNING_KEY --env staging
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging
npx wrangler secret put SESSION_SIGNING_KEY --env production
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

Export the matching public site key immediately before each environment's build. Do not build staging with the production widget or production with the staging widget:

```bash
export VITE_TURNSTILE_SITE_KEY="<staging-public-site-key>"
npm run deploy:staging
unset VITE_TURNSTILE_SITE_KEY

# Complete a multiplayer staging rehearsal, then:
export VITE_TURNSTILE_SITE_KEY="<production-public-site-key>"
npm run deploy:production
unset VITE_TURNSTILE_SITE_KEY
```

Deploy only after the full verification suite passes.

Staging and production have different Worker names, Durable Object namespaces, rate-limit namespaces, variables, and secrets. Do not reuse a session-signing key between them.

## Card catalog and license

The server-owned catalog contains only the original legacy `CAH_BASE` set: 458 answer cards and 76 single-answer question cards. Family mode leaves 305 answers and 71 questions after applying the original `obscene`, `offensive`, and `sex` flags.

The card content is available under `CC-BY-NC-SA-2.0` and is separate from the application source. See [cards/README.md](cards/README.md) for provenance and [LICENSE-CARDS.md](LICENSE-CARDS.md) for attribution. Pain in My Deck is not affiliated with or endorsed by Cards Against Humanity LLC.

## More documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow, APIs, sessions, room lifecycle, persistence, and deployments
- [docs/CUTOVER.md](docs/CUTOVER.md) — staging, production, Firebase archive/disable, rollback, and 30-day deletion runbook
