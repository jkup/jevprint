# Completed work and verification

## Local alpha — 2026-09-21

- Scaffolded React, TypeScript, Vite, Cloudflare Worker, and React Three Fiber; pinned dependencies and lockfile. Added formatting and test commands.
- Created AGENTS.md with workflow rules and integration learnings. Split remaining work in PLAN.md from the design baseline in docs/design.md.
- Implemented the 16-question registry, strict model validation, Cloudflare result-envelope adapter, and deterministic visual mapping.
- Built a shared filament/particle system with nine weighted shape bases, stable morph correspondence, bounded motion, score-spread effects, camera interaction, pause/reset, and reduced-motion support.
- Built responsive landing, four examples, accessible X-RAY, stable Decision DNA, comparison controls/deltas, input dialog, error handling, and a semantic SVG fallback when WebGL is unavailable.
- Captured real Jev 1.13.0 responses for four original demo texts. Runtime uses these captures; synthetic studies remain available for tests.
- Added separate offline and localhost-only live modes. Text calls use the AI binding and jevprint Gateway with logs/cache disabled. Captures verify account/model access; dashboard privacy/billing verification remains open.
- Implemented bounded URL pilot, deterministic disclosed sampling, source preview, and pasted-text recovery. Live URL extraction → sampling → Jev validation succeeded on the Jev model documentation page (1,743 ms extraction). Redirect/subrequest adversarial verification remains open.
- Bundled fonts locally; no third-party font dependency at runtime.
- Added response-schema, preprocessing, and mapping versions plus separate extraction/model/total timing fields.
- Fixed OrbitControls lifecycle and added actual drag-image regression coverage.

Final local-alpha verification: 35 logic tests and 18 Chromium desktop/mobile browser tests passed, including automated accessibility, reduced-motion, WebGL fallback, camera interaction, and error-recovery checks. Type checking, formatting, production build, and Worker packaging dry run passed. The dry run confirmed live analysis is disabled in the default production package; nothing was deployed. Updated desktop/mobile screenshots with real captured readings were visually inspected. This is not evidence of Safari/physical-phone performance, user comprehension, or public-launch readiness.

## Known limits

- No public deployment or public abuse protection yet; live analysis is localhost-only.
- URL pilot has a narrow allowlist; arbitrary-site security is not established.
- X-RAY explains dimensions and separates the sculpture; specific geometry highlights and richer reveal remain open.
- Real samples validate distinct outputs; broader question calibration and comprehension need feedback.
- Three.js emits a Clock deprecation warning from the current React Three Fiber integration. It does not fail rendering or tests.
- The lazy-loaded Three.js sculpture bundle is approximately 242 kB gzipped; Vite flags its uncompressed chunk size. Real-device loading and rendering measurements remain open.
