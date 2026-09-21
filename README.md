# JEVPRINT

A study in machine perception. Jev's choices, scores, and probabilities become a deterministic, inspectable sculpture.

The local alpha includes four **real captured Jev readings**, interactive filament sculptures, X-RAY, Decision DNA, comparison/morphing, live pasted-text analysis, and a restricted URL integration pilot. Public paid endpoints remain disabled until the launch controls in [PLAN.md](PLAN.md) are complete.

## Develop

Requires Node 22.12+ and npm:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. This mode uses bundled readings and needs no credentials or paid calls. Every sample includes original source text; synthetic test data is explicitly separated from captured responses.

For live local analysis, authenticate with `npx wrangler login`, create an AI Gateway named `jevprint`, and enable unified billing:

```sh
npm run dev:live
```

Open **http://127.0.0.1:5174**. This mode uses remote AI and Browser Run bindings and incurs usage charges. Live endpoints additionally require a localhost request URL; this is a development pilot, not a production access-control strategy. The URL pilot accepts only HTTPS URLs on `developers.cloudflare.com` and `blog.cloudflare.com` and restricts browser requests to those hosts. Other sites can be analyzed by pasting their text.

Both servers can run simultaneously. If a remote binding session expires or a config hot reload fails, stop and restart the affected server. Never place credentials in frontend code or commit `.dev.vars`/`.env` files.

## Check changes

```sh
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Browser tests use the offline server and stub responses where needed; they do not make paid calls. `npm run types` regenerates Cloudflare environment types after binding changes. `npm run format` formats the repository. `node scripts/screenshots.mjs` records desktop/mobile screenshots from the offline server.

`node scripts/live-smoke.mjs` is an explicit paid integration check against port 5174: one text request and one allowed URL request. It is never part of routine tests or CI.

## Refresh demo readings

The dedicated capture Worker sends only original public demo texts and caps a run at four requests:

```sh
npx wrangler dev --config wrangler.live.jsonc --port 8788 --ip 127.0.0.1
# In another terminal:
npm run capture
```

`src/fixtures/captured.json` records validated responses and provenance. Capture preserves successes and skips already captured IDs. To deliberately refresh an example after changing questions, remove only that example's record, rerun capture, inspect its output, and update the question-set version. Do not silently reuse old-bank captures. Initial measurements are in [docs/integration.md](docs/integration.md).

## How it works

```text
Browser: React + Three.js / React Three Fiber
    │
    └─ Worker /api/analyze
         ├─ Browser Run → bounded webpage excerpt (URL pilot)
         └─ AI binding → jevprint AI Gateway → typesafe/jev
                       ↓
                validated typed answers
                       ↓
              pure versioned visual mapping
```

`shared/questions.ts` owns 16 typed questions, rubrics, labels, and explanations. `shared/schema.ts` validates exact question IDs, types, probability bounds/mass, score consistency, and legends. `shared/fingerprint.ts` maps decisions to stable particle coordinates. Geometry has fixed correspondence across inputs: small semantic changes do not reshuffle a random seed. Compare blends geometries and continuous material/motion parameters; intermediate shapes are artwork, not additional model evaluations.

Primary-mode probabilities blend nine shape bases. Scores control density, layering, spread, edge definition, motion, asymmetry, and convergence. Noul probabilities modify named local effects. Full score distributions also contribute spread, so equal mean scores need not have identical shapes. X-RAY displays probabilities and rubric definitions. DNA orders probabilities by the registry, never arbitrary response key order.

## Privacy and operating boundaries

- No application database, automatic browser storage, or submitted text in URLs. URL excerpts remain in client memory for inspection.
- AI calls explicitly set `collectLog: false` and `skipCache: true`; no automatic inference retries. Dashboard retention and provider policies still require launch verification.
- The app never displays raw upstream exceptions. Logs include only validation issue identifiers.
- Text is bounded to 12 KB UTF-8, requests to 32 KB, and extraction responses to 250 KB. Oversized text is rejected; large webpages use disclosed deterministic sampling.
- Owner configured a $20/day gateway limit. This must not be assumed to cover Browser Run or all platform charges.
- Production live analysis remains blocked. Complete the launch gate before changing that behavior. Stopping live mode stops local paid access; offline examples remain available.

See [AGENTS.md](AGENTS.md) for conventions, [PLAN.md](PLAN.md) for remaining work, and [docs/progress.md](docs/progress.md) for verified progress.
