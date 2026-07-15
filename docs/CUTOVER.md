# Cloudflare cutover and Firebase retirement runbook

This runbook separates the application release from destructive external operations. **No Firebase export, rule change, function deletion, billing change, domain detachment, or project deletion is performed by repository code or by running the normal test/deploy scripts.** Those are deliberate operator actions after the Cloudflare release has passed its gates.

## Roles and records

Assign one release operator with access to Cloudflare, Firebase/Google Cloud, the repository, and the legacy domain. Record:

- release commit and Git tag;
- staging and production Worker version IDs;
- staging and production `workers.dev` URLs;
- Turnstile widget names and allowed hostnames, never their secrets;
- staging and production public Turnstile site keys/build identifiers;
- Firebase export location and integrity/checksum record;
- cutover timestamp (`DAY_0`);
- scheduled Firebase deletion timestamp (`DAY_0 + 30 days`); and
- every external action, operator, timestamp, and outcome.

Do not put credentials, session-signing keys, Turnstile secrets, archive passwords, or raw session data in the release record.

## 1. Release candidate gates

From a clean checkout of the release commit on Node 24:

```bash
npm ci
npm run format:check
npm run lint
npm run cf:types:check
npm run typecheck
npm test
npm run test:worker
npm run test:e2e
```

Stop if any command fails. The production build, startup, and dry-run gates run in section 2 after the environment-specific Turnstile keys exist.

Confirm the release tree has no Firebase browser/admin dependency, runtime import, callable-function implementation, deploy script, or active Firebase configuration. Firebase should remain available only through Git history/the archival tag and the external project being retired by this runbook.

Verify the existing immutable archival tag for the last Firebase implementation without switching the release tree back to it:

```bash
git show --no-patch firebase-final-20260715
git ls-remote --tags origin firebase-final-20260715
```

Do not recreate, move, or force-update `firebase-final-20260715`. The Git tag is a historical reference, not an operational rollback target.

## 2. Prepare Cloudflare environments

1. Confirm the Cloudflare account has a `workers.dev` subdomain.
2. Create separate managed Turnstile widgets for staging and production. Allow only each environment’s exact hostname.
3. Generate independent random session-signing keys of at least 32 bytes. Never reuse the local or staging key in production.
4. Authenticate and add secrets interactively:

```bash
npx wrangler login
npx wrangler whoami
npx wrangler secret put SESSION_SIGNING_KEY --env staging
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging
npx wrangler secret put SESSION_SIGNING_KEY --env production
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

5. Verify `wrangler.jsonc` still maps staging and production to different Worker names, rate-limit namespace IDs, variables, secrets, and Durable Object namespaces.
6. Confirm `TURNSTILE_REQUIRED=true` in both remote environments and `false` only for local development.
7. Record each widget's public site key. It is not secret, but it is environment-specific and must be supplied to the matching Vite build as `VITE_TURNSTILE_SITE_KEY`.

Run the remaining release gates with the production public site key embedded:

```bash
export VITE_TURNSTILE_SITE_KEY="<production-public-site-key>"
npm run build
npm run cf:startup
npm run deploy:dry-run
unset VITE_TURNSTILE_SITE_KEY
```

Stop if any command fails. Confirm the dry-run Worker bundle remains within the configured Cloudflare plan, and review every pending Durable Object migration. A `deleted_classes` migration is not allowed for this release. Never accept a production-mode build that omitted the real public site key merely because it compiled.

## 3. Deploy and rehearse staging

```bash
export VITE_TURNSTILE_SITE_KEY="<staging-public-site-key>"
npm run deploy:staging
unset VITE_TURNSTILE_SITE_KEY
npx wrangler tail --env staging
```

Use fresh browser profiles and complete these checks against `https://paininmydeck-staging.<account-subdomain>.workers.dev`:

- `GET /api/healthz` reports the expected release build and protocol version `1`.
- Home and every preserved legacy layout match the approved visual baselines.
- Room creation returns a valid five-letter code; lowercase join links canonicalize to uppercase.
- Invalid, missing, expired, full, and already-started rooms use the existing error surface.
- Turnstile protects creation and newcomer entry without exposing its secret or leaving tokens in URLs/logs.
- Three players complete a normal game through final results.
- Eight players complete a game with chat, settings, blanks, family mode, redraws, history, kick, and leaderboard flows.
- Reload and disconnect/reconnect work for host, Czar, and player in every phase.
- A 90-second disconnect expiry, explicit leave, and fewer-than-three cancellation behave deterministically.
- No browser receives another hand, deck order, or submission author before reveal.
- Current iPhone Safari, Android Chrome, desktop Chrome, and desktop Safari pass.
- Logs contain no cookies, Turnstile tokens, hands, card text, chat text, or complete command payloads.

Stop and redeploy staging if any gate fails. Do not compensate by changing Firebase yet.

## 4. Deploy production

Choose a window when no legacy game is in progress. Deploy the already-tested release commit:

```bash
export VITE_TURNSTILE_SITE_KEY="<production-public-site-key>"
npm run deploy:production
unset VITE_TURNSTILE_SITE_KEY
npx wrangler tail --env production
```

Against `https://paininmydeck.<account-subdomain>.workers.dev`:

1. Confirm `GET /api/healthz` reports the expected release build and protocol version `1`.
2. Load `/` in a signed-out browser.
3. Create one room and confirm its code matches `^[A-HJ-NP-Z]{5}$`.
4. Join with two additional fresh browser profiles.
5. Complete a short game, including one reconnect and final results.
6. Confirm create and join rate limits fail safely.
7. Confirm Turnstile hostname and secret pairing is the production pair.
8. Capture the production Worker version ID and successful smoke-test time.

Share the production `workers.dev` URL only after all checks pass. The initial release has no custom-domain/DNS migration.

## 5. Archive and disable Firebase — external operator actions

Begin only after production has passed the smoke test. These steps happen in the Firebase and Google Cloud consoles/CLIs, not in this repository.

### Export

1. Create a dated, access-restricted archive location with encryption at rest and a 30-day retention/delete date.
2. Use Firestore’s managed export for project `paininmydeck`, or another reviewed Google-supported export procedure, to capture the legacy database. If the managed export requires billing, review and approve its quoted cost before starting; game hosting does not depend on buying a Cloudflare plan.
3. Wait for the export operation to report success. Do not infer success from files merely appearing in a bucket.
4. Record the operation ID, object location, object count/size, encryption mode, checksum or integrity manifest, operator, and completion timestamp.
5. Restrict archive access to the release operator and record `DELETE_AFTER = DAY_0 + 30 days`.
6. Verify the export can at least be enumerated/read before disabling Firestore.

The immutable `cards/base.json` catalog and its digest remain in Git; the temporary Firebase export is not a runtime card source.

### Deny access and retire services

Perform in this order, recording each result:

1. In the Firestore Rules console, publish a reviewed deny-all ruleset:

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

2. Verify anonymous reads and writes now fail. Do not use the production Cloudflare application for this check; it no longer depends on Firebase.
3. Delete/disable the legacy callable functions after confirming their deployed names and regions. The expected legacy names are `createRoom`, `startGame`, and `startNewTurn`; verify the console rather than assuming.
4. Disable legacy Anonymous Authentication after functions and rules are closed.
5. Remove the legacy custom domain from Firebase Hosting. Do not point it at Cloudflare during this release; users receive the production `workers.dev` URL.
6. Remove obsolete Firebase service accounts/keys only after confirming none are needed to inspect the 30-day archive.
7. Detach optional billing only after the export has completed and all billed resources are understood. Confirm no unexpected Google Cloud resources remain.

Keep the Firebase project disabled but undeleted for 30 days. It is an archive, not a live fallback.

## 6. Rollback during the 30-day window

Firebase is not the rollback path. Its browser-authoritative model and callable functions remain disabled.

For a Worker application regression:

```bash
npx wrangler versions list --env production
npx wrangler rollback <known-good-version-id> --env production
```

Then repeat the three-player smoke test and inspect production logs. Worker rollback does not reverse Durable Object class or SQLite schema migrations. Roll back only to a version compatible with the current additive schema; otherwise deploy a forward fix. Never use `deleted_classes` as an emergency response.

If Cloudflare is unavailable or free-plan capacity is exhausted, show the existing recoverable error state and postpone the game. Do not silently route users back to Firebase.

## 7. Delete Firebase on day 30 — external operator action

At or after `DELETE_AFTER`, require a fresh confirmation that:

- the production Worker has been stable for 30 days;
- no incident, legal hold, or debugging task requires the archive;
- the release commit, `firebase-final-20260715` tag, card catalog, and card-license records are safely retained;
- Firebase has received no expected application traffic; and
- the exact Google Cloud project selected is `paininmydeck`.

With a second human confirmation where possible:

1. Delete the Firebase/Google Cloud project through the official console flow and type the project ID when prompted.
2. Delete the temporary Firestore export, any downloaded plaintext or encrypted copies, and its temporary bucket if dedicated to this archive.
3. Revoke any remaining archive-only credentials.
4. Confirm the project and archive are no longer accessible.
5. Record the deletion timestamp, operator, reviewer, and evidence in the release record.

Keep the Git history and archival tag. Do not keep transient database exports or credentials beyond the agreed 30-day window.
