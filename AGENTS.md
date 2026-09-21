# Working on JEVPRINT

JEVPRINT translates typed Jev judgments into inspectable generative art. Read PLAN.md for remaining work and docs/progress.md for completed work and evidence. PREPLAN.md is inspiration; PLAN.md resolves its contradictions.

## Workflow

- Own implementation through verification. Ask for product feedback on runnable milestones, and ask early for credentials when needed. Never request secrets in chat.
- Move completed tasks out of PLAN.md into docs/progress.md. Keep partial milestones open and describe what is still unverified.
- Use npm with the committed lockfile. Run `npm run check`, `npm test`, `npm run build`, and relevant browser tests before handing off code changes.
- Keep synthetic examples explicitly labeled. Never substitute fabricated answers for a failed live request.
- Never commit .dev.vars, .env files, credentials, source-bearing logs, or browser authentication state.
- No database, sharing/gallery, audio, or new framework without a concrete product need.

## Architecture invariants

- Shared question registry owns labels, ordering, rubrics, and X-RAY explanations.
- Validate model data at the server and browser boundaries. Do not turn missing probabilities into 0.5 or clamp malformed results into apparent success.
- Geometry is a pure, versioned translation of decisions, with stable particle correspondence. No content-derived random seed that scrambles nearby decisions.
- Confidence describes distribution concentration, not correctness. Author certainty is a separate question. Factual claims are not factual accuracy.
- UI must remain useful without WebGL, hovering, animation, or live credentials.
- Only server code calls paid services. Live analysis defaults off until gateway privacy and access are verified. Do not log source text or full URLs.
- Fetch current Cloudflare documentation and generate binding types when changing platform integration. Local development must not silently make paid model calls.

## Learnings

- The original bank contained 25 questions despite “24” in its UI examples. Derive counts from the registry.
- Jev works through the AI binding's typed third-party fallback. Observed responses wrap provider data under `result`; validate after unwrapping. See docs/integration.md.
- Browser Run request patterns must use `RegExp.source`, not `RegExp.toString()` with slash delimiters. The latter produced HTTP 422 / code 5009 during live testing.
- Construct and dispose OrbitControls inside an effect. Disposing a memoized instance on motion-setting changes leaves it disconnected.
- Browser Run Markdown Quick Actions support Workers bindings, so a Pages/helper-Worker split is unnecessary.
- Fixture visual success does not validate real-model variation. Preserve the real-data milestone until measured.
