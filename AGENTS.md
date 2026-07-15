# Repository Guidelines

## Project Structure & Module Organization

`src/` holds the Vue 3 client: views, components, Pinia stores, API adapters, and shared protocol types. `worker/` contains the Cloudflare gateway, `GameRoom` Durable Object, SQLite schema, sessions, and validation. The immutable catalog is `cards/base.json`; static files are under `public/`. Tests are grouped by concern under `tests/` (`client`, `worker`, `protocol`, `cards`, `e2e`, and `visual`). See `ARCHITECTURE.md` for system details and `docs/CUTOVER.md` for deployment operations.

## Build, Test, and Development Commands

- `npm ci` installs locked Node 24 dependencies.
- `npm run dev` starts the Vite client development server.
- `npm run build` creates the production SPA and Worker bundle.
- `npm run format:check`, `npm run lint`, and `npm run typecheck` run static checks.
- `npm test` runs the main Vitest suite; `npm run test:worker` runs Durable Object integration tests.
- `npm run test:e2e` runs browser multiplayer and visual flows.
- `npm run deploy:dry-run` validates the Wrangler bundle without publishing it.

## Coding Style & Naming Conventions

Use TypeScript, Prettier, ESLint, and two-space indentation. Name Vue components in PascalCase, values in camelCase, and constants in UPPER_SNAKE_CASE. Use `*.test.ts` for Vitest and `*.spec.ts` for end-to-end tests. Keep protocol validation and authoritative rules on the server. The interface is intentionally frozen: preserve markup, class names, copy, assets, and CSS unless visual work is explicit. Avoid compatibility layers; remove obsolete code when replacing behavior.

## Testing Guidelines

Every behavior change needs a focused regression test. At the Worker layer, test authorization, phase transitions, privacy, idempotency, reconnects, and rollback. Client changes should cover snapshot adaptation and errors. Intentional UI changes require desktop and mobile visual evidence. Before opening a pull request, run static checks, both Vitest suites, the production build, and relevant browser flows.

## Commit & Pull Request Guidelines

Use brief Conventional Commits, such as `fix(worker): reject stale sessions`. Keep each commit to one logical change. Pull requests should explain user-visible behavior, list verification, link issues, and include screenshots only for intentional visual changes. Call out Durable Object migrations, environment changes, or deployment considerations.

## Security & Configuration

Copy `.dev.vars.example` to `.dev.vars` for local secrets; never commit credentials or generated session material. Keep SQLite migrations additive. Treat `cards/base.json` and its license metadata as immutable source data, and do not reintroduce Firebase runtime dependencies.
