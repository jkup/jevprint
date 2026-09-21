# JEVPRINT implementation plan

Status: proposed implementation baseline, pending product feedback. Prepared 2026-09-21.

PREPLAN.md remains the creative brief. This document defines the recommended first release, corrections to the brief, dependencies, and completion criteria. The repository currently contains no application code. No live model request, account configuration, or deployment was performed during this review.

## Assessment

The concept is strong: typed model judgments become an inspectable sculpture, and comparison makes the relationship tangible. Keep the art-first presentation, full probability distributions, pure mapping layer, local examples, accessibility, and restrained interface.

The brief is not yet an executable plan. It specifies many effects without choosing a rendering system, mixes optional features with core requirements, and defers the two biggest feasibility questions: real-data visual variation and cross-topology morphing. Prove those early.

Corrections to PREPLAN.md:

| Location               | Issue                                                                                           | Resolution                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sections 2–3           | Pages plus a helper Worker adds deployment boundaries                                           | Use one Worker with static assets, AI, and Browser Run bindings                                |
| Sections 7, 13, 20, 34 | The question bank has 25 questions, while copy says 24                                          | Derive counts from the active bank; proposed v1 bank has 16                                    |
| Sections 9, 16         | Hashing all answers into structural randomness makes small semantic changes scramble the object | Use fixed, versioned particle correspondence; answers drive continuous parameters              |
| Sections 10, 26        | Confidence and entropy can appear to be independent evidence                                    | Explain both as summaries of probability concentration; avoid multiplying their influence      |
| Sections 10, 23        | `factual_claims` becomes `factuality`                                                           | Use `factualClaimPresence`; the model is not checking truth                                    |
| Section 10             | Novelty wording measures how novel the author presents something as being                       | Label it “novel framing,” never objective originality                                          |
| Sections 14, 26        | Author certainty can be confused with model confidence                                          | Label these separately in UI and mapping                                                       |
| Section 16             | Score deltas shown as +62% imply a percentage measurement                                       | Show rubric-point changes, e.g. +2.5 on a 0–4 scale; probability changes use percentage points |
| Sections 21–22         | Blind numeric clamping can conceal invalid model data                                           | Reject invalid semantic results; clamp only bounded renderer inputs after validation           |
| Sections 22, 36        | Request logging can retain source text despite no application database                          | Disable payload retention/caching by default and verify effective gateway behavior             |
| Section 27             | One opaque backend request cannot expose accurate internal progress                             | Use honest coarse stages; do not invent timed extraction/inference milestones                  |
| Section 33             | A model alias is not an immutable version                                                       | Record returned model identity; defer shared semantic caching                                  |
| Sections 40, 44        | Synthetic fixtures first can hide weak real-model results                                       | Do a small integration/data spike before polishing the renderer                                |

“Decision space” is a metaphor for our visualization of returned answers. It does not expose model internals, establish truth, or create a unique identity for a document. Questions are evaluated separately but are not necessarily statistically independent.

## Product baseline

Build a public creative-technology demonstration for curious developers and designers. Within roughly 20 seconds of exploring an example, a visitor should understand that changing judgments changes the sculpture and that X-RAY explains the mapping.

Recommended first release:

- Four original, bundled examples with captured real Jev responses: technical explanation, love letter, product pitch, philosophical essay.
- Pasted text and a single public webpage URL as inputs, with explicit input modes.
- One coherent sculpture system, reveal, rotate/reset controls, Decision DNA, and accessible X-RAY.
- Comparison of any two examples/live analyses, with endpoint inspection, an actual geometry morph, and the largest judgment differences.
- English-first copy and evaluation examples. Do not promise validated interpretation across all languages.
- Ephemeral analyses: source and result remain in client memory for the session; no accounts or automatic browser storage.
- Concise About/privacy explanation, mobile adaptation, reduced motion, and a useful non-WebGL view.

Defer saved routes, D1, R2, public gallery, social previews, image export, sound, accounts, PDF/file ingestion, crawling, and authenticated webpages. These are separate milestones, not “if time permits” work inside v1.

Proposed art direction: near-black background, warm white typography, fine luminous filaments and particles, restrained category colors. Use one visual material across all forms. Shape and movement must still distinguish examples with color removed. Start with a still composition and motion study before filling out UI.

Product decisions still open:

| Decision                                | Recommended default                                                          | Needed by        |
| --------------------------------------- | ---------------------------------------------------------------------------- | ---------------- |
| Public demo versus persistent product   | Public ephemeral demo                                                        | Scope lock       |
| Visual references / desired mood        | Fine luminous sculpture and editorial type                                   | Visual milestone |
| Launch budget and expected traffic      | Measure first; owner supplies monthly budget and traffic expectation         | Public launch    |
| Cloudflare account / Jev billing access | Verify with a bounded smoke test                                             | Live integration |
| Launch domain and attribution           | JEVPRINT, “Powered by Jev + Cloudflare”; avoid implying official affiliation | Launch           |
| Private-content expectations            | No application persistence; disclose external processing accurately          | Live integration |

No further framework or database choice is needed to start under these defaults. Missing live access does not prevent fixture-based development, but remains a blocker for validating the real product.

## Architecture and technology choices

Proposed dependencies: React, TypeScript, Vite with Cloudflare's Vite plugin, Three.js with React Three Fiber, Zod for runtime boundaries, Vitest for logic/Worker checks, and Playwright for browser flows. Use CSS for simple DOM transitions; add Motion only if choreography warrants it. Use npm and a committed lockfile. Pin compatible versions during scaffolding.

One Cloudflare Worker serves static assets and `/api/*`, with `AI` and `BROWSER` bindings. Its server-owned Jev adapter calls `typesafe/jev` through the `jevprint` AI Gateway. No TypeSafe secret in the browser. Browser Run Markdown Quick Action is the initial extraction adapter. A controlled browser session is an implementation fallback only if extraction quality or network controls require it.

Start with `POST /api/analyze` accepting a discriminated union of `{ sourceType: "text", text }` or `{ sourceType: "url", url }`, plus challenge/request metadata as needed. Do not accept caller-defined models, questions, or gateway settings. No public standalone extraction endpoint.

Return a validated analysis envelope containing:

- Request ID (not a saved/shareable ID), source type, safe display title, and submitted/final URL when available.
- Question-set, preprocessing, response-schema, and renderer/mapping versions.
- Requested model and returned model identifier, analysis timestamp, fixture/live provenance.
- Normalized answers, derived fingerprint parameters, actual judgment count, available usage counts.
- Separate application-observed extraction, model-request, and total durations; reduction warnings and analyzed length.

Use typed error codes for invalid input, insufficient content, unreadable page, rate limit, upstream timeout/unavailability, and invalid model response. Never return source-bearing infrastructure errors. API responses use `Cache-Control: no-store`.

Client states: examples → editing → submitting → revealing → result; comparison retains A while B loads. URL submission displays “Reading page and analyzing”; text displays “Analyzing text.” Only display finer progress if the backend actually reports it. Track reveal separately from request duration. Disable duplicate submits, ignore stale responses, support abandoning a request, and preserve the previous successful result on failure. Browser cancellation must not be presented as guaranteed cancellation of provider billing.

Suggested layout:

```text
src/                 React interface, rendering, fixtures
shared/              question definitions, schemas, normalization, visual mapping
worker/              routes, Jev adapter, extraction, validation, abuse controls
tests/               contract, mapping, Worker, and browser tests
docs/                integration findings, visual acceptance captures, launch notes
wrangler.jsonc       assets and bindings
```

## Questions and visual grammar

Start with these 16 questions drawn from the original bank. Rewrite vague rubrics into observable descriptions, retain explicit low/high anchors, and version every semantic change. Expand only when a new question adds an understandable visual distinction.

| Question            | Type   | Primary visible effect                                             |
| ------------------- | ------ | ------------------------------------------------------------------ |
| primary_mode        | Choice | Weighted blend of nine related shape bases; category labels/colors |
| technical_density   | Score  | Active detail density within a fixed particle pool                 |
| complexity          | Score  | Layer separation and nesting                                       |
| abstraction         | Score  | Radial spread                                                      |
| specificity         | Score  | Edge/filament definition                                           |
| emotional_intensity | Score  | Slow pulse amplitude                                               |
| certainty           | Score  | Directional agreement, labeled author certainty                    |
| urgency             | Score  | Bounded motion speed                                               |
| actionability       | Score  | Outward directional flow                                           |
| novelty             | Score  | Asymmetry, labeled novel framing                                   |
| commercial_intent   | Score  | Convergence toward a focal point                                   |
| persuasive          | Noul   | Directional bias                                                   |
| factual_claims      | Noul   | Presence of stable anchor marks, not factual accuracy              |
| quantitative        | Noul   | Regular spacing of detail marks                                    |
| personal_voice      | Noul   | Paired versus uniform local grouping                               |
| exploratory         | Noul   | Branch divergence                                                  |

Maintain a registry with question ID, label, rubric, normalization, parameter range, visual effect, and X-RAY explanation. This is the single source for counts, ordering, Decision DNA, tooltips, and comparison. Omitted questions include audience, structure, tone, and several overlapping intent questions; they can return if an actual use emerges.

Renderer design:

1. Use a fixed canonical particle index/coordinate set and bounded filament connectivity. Each shape basis maps the same particle IDs into space. Avoid unrelated meshes or per-answer hashed random layouts.
2. Blend basis coordinates using the complete primary-mode probability vector, then apply bounded score/Noul deformations. Keep all nine labels in the taxonomy; the bases are variations of one material, not nine independent renderers.
3. Compute normalized entropy safely, including zero probabilities. Use it for spatial dispersion. Confidence controls a separate, modest temporal coherence effect, with clear attribution to the same distribution information. Keep per-answer values visible; any aggregate is labeled a derived visual control.
4. Preserve every Score probability distribution, not just its weighted mean. Use local spread/detail bands to distinguish a central peak from two competing extremes with the same mean. Decision DNA and X-RAY show the full distributions in a stable order.
5. Noul values are probability of a proposition. Map them into an explicitly chosen design effect; zero does not automatically imply a meaningful inverse force. Missing values are errors, not neutral 0.5 values.
6. Keep procedural samples fixed by renderer version. A separate canonical answer hash may identify an analysis; it must not scramble geometry. Same answers + mapping version + camera + animation phase produce equivalent structure, subject to normal GPU rasterization differences.
7. Compare uses the same particle correspondence for A and B. Interpolate continuous visual parameters and basis weights, never string labels or arbitrary seed integers. At t=0 and t=1 reproduce the original endpoints. The midpoint is an artistic interpolation, not a new Jev evaluation; show actual endpoint answers and deltas separately.

X-RAY uses named layers/selected dimensions and a readable DOM panel. Highlight the relevant effect while retaining context. Do not promise every overlapping force maps to a unique clickable particle. All inspection works with keyboard and touch; dragging rotates, a dedicated button toggles X-RAY, and reset has a visible control.

## Data quality, privacy, and operations

- Validate answer IDs, expected types, taxonomy keys, finite numbers, score bounds, legends, and probability mass. Allow only documented small rounding tolerance; reject missing/invalid distributions without inventing answers. Bound renderer parameters independently.
- Treat submitted content as data. Questions explicitly evaluate the source rather than follow embedded instructions. Include adversarial text in evaluation; do not claim perfect prompt-injection resistance.
- Bound request bytes before parsing, normalized source length, extraction output, provider time, and concurrent expensive work. Define launch values from measured token usage and costs. A 60k-character cap is not a token guarantee.
- Budget the complete state plus question bank against the verified model limit. Test code-heavy and non-English input. If reliable tokenization is unavailable, use a deliberately conservative limit validated against returned usage; reject oversized pasted text with guidance instead of silently dropping text.
- For long webpages, deterministic paragraph/heading sampling preserves opening, structure, representative middle, and ending. Disclose that only an excerpt was analyzed and provide an expandable preview in client memory. Empty pages, access blocks, cookie walls, and error pages must not become successful fingerprints.
- URL parsing must reject credentials, non-HTTP(S), local/private/link-local/reserved targets and unsupported ports. Explicitly assess redirects, IPv6, DNS rebinding, and browser subrequests. A hostname string blocklist alone is insufficient. Verify provider network protections and application controls with controlled cases before arbitrary-URL launch; fall back to an allowlisted URL pilot if they cannot be established.
- Do not provide user cookies, credentials, or arbitrary browser instructions to extraction. Do not bypass access controls or anti-bot challenges. Limit work to one submitted page and required rendering resources.
- Disable gateway request/response payload logging and shared inference caching for user submissions. Verify the real configuration, not just code options. Operational logs retain only safe IDs, version tags, counts, timings, and error codes; avoid titles, full URLs/query strings, source snippets, and content hashes in logs.
- Verify Cloudflare/TypeSafe processing and retention disclosures before publishing privacy copy. No application database does not imply zero provider retention. Bundled demo source/answers are deliberately public.
- Before public launch, enforce server-verified Turnstile or equivalent challenge, endpoint limits before both Browser Run and Jev, gateway limits, bounded timeouts, and an operator kill switch. Gateway limits alone cannot protect extraction costs. Never blindly retry paid calls after ambiguous timeouts.
- Confirm whether configured spend controls are enforced caps or alerts, and what services they cover. Budget both browser extraction and inference. Do not present local/per-location rate limiting as a strict global spending cap.
- No shared semantic cache in v1. A later cache must include preprocessing/question versions, provider/model identity, TTL, and privacy policy. Store the returned result for reproducibility; repeated inference on identical text is not promised to be identical.

## Documentation checked during the initial review

- [Cloudflare Jev model](https://developers.cloudflare.com/ai/models/typesafe/jev/): documents `typesafe/jev`, structured state/questions, returned answers/model/usage, a 32,000-token context, and dashboard pricing. Account access, billing, and the full Jev-plus-Gateway path still need a live test.
- [Workers static assets](https://developers.cloudflare.com/workers/static-assets/): supports frontend assets and Worker APIs in one project with Vite. This supports the proposed simpler deployment.
- [Browser Run Markdown](https://developers.cloudflare.com/browser-run/quick-actions/markdown-endpoint/): documents `env.BROWSER.quickAction("markdown", { url })`; binding calls do not need a separate REST API token.
- [AI Gateway Workers AI integration](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/): documents gateway routing through the AI binding. Do not assume all request/logging options from the brief are supported by installed types.
- [AI Gateway logging](https://developers.cloudflare.com/ai-gateway/observability/logging/): request/response payloads can be retained; payload logging can be disabled while keeping operational metadata. Verify the supported configuration for the actual binding path.
- [TypeSafe confidence](https://docs.typesafe.ai/confidence): confidence is derived from the returned distribution, not an independent correctness score.
- [TypeSafe Score](https://docs.typesafe.ai/primitives/score): scores are probability-weighted level indices; equal scores can represent different distributions. Keep the distribution visible and meaningful.
