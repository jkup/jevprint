# Integration findings

Verified 2026-09-21 using the owner's existing Wrangler OAuth login and `jevprint` AI Gateway with unified billing. Owner reports a $20/day gateway limit.

## Jev binding

Wrangler 4.135.0 has a typed third-party model fallback, so `AI.run('typesafe/jev', { state, questions }, options)` requires no `any` casts. The observed response is wrapped as `{ state, result: { model, answers, usage }, gatewayMetadata }`. Cloudflare's model-page example shows the inner provider response. `unwrapModel` accepts both and validates the inner result.

| Captured sample     | Returned model | Model request duration | Input tokens | Output tokens |
| ------------------- | -------------- | ---------------------- | ------------ | ------------- |
| Technical RFC       | jev-1.13.0     | 385 ms                 | 1,680        | 342           |
| Love letter         | jev-1.13.0     | 371 ms                 | 1,681        | 342           |
| Product pitch       | jev-1.13.0     | 308 ms                 | 1,668        | 342           |
| Philosophical essay | jev-1.13.0     | 296 ms                 | 1,684        | 342           |

These are application-observed times for individual captures, not benchmark percentiles or pure inference latency. Additional small diagnostic calls preceded them. Do not derive total spend from only these rows. Actual aggregate spend needs dashboard confirmation.

Calls use `collectLog: false`, `skipCache: true`, and bounded timeouts. No retry loop is implemented. Returned probabilities show two-decimal rounding; validation permits only half a rounding unit per category in probability-mass error and normalizes accepted choice mass for geometry. Missing keys, negative/nonfinite values, wrong taxonomy, and inconsistent scores still fail.

## Local development

- AI bindings cannot be marked `remote: false`. Offline mode omits AI/browser bindings; `live` enables remote bindings.
- Wrangler generates optional AI/browser bindings for the union environment and a concrete `Cloudflare.LiveEnv` type.
- Initial London date was September 21 while UTC remained September 20. The runtime rejected the future date; compatibility is pinned to 2026-09-20.
- Some Vite configuration hot reloads failed with remote sessions active. Restart the affected server rather than treating that as a model failure.
- Captures skip successful IDs to avoid repeated paid work.

## URL ingestion

Browser Run supports `quickAction('markdown', options)`. The pilot restricts exact Cloudflare-owned docs/blog hostnames, with an allow-request pattern for redirects/subresources, no cookies/credentials, no extraction cache, bounded action/navigation time, and a bounded response reader. Redirect and subrequest restrictions need controlled live tests before launch. This is not a claim of arbitrary-URL SSRF protection.

The local live browser text flow passed (3,000 ms model request). The URL pipeline passed for `https://developers.cloudflare.com/ai/models/typesafe/jev/`: Browser Run extraction took 1,743 ms, the long page was explicitly sampled, and Jev returned a valid 1.13.0 reading. Browser Run requires undelimited regex source strings for request patterns. Slash-delimited `RegExp.toString()` produced HTTP 422 / code 5009; `RegExp.source` succeeded with the same hostname restriction.

## Still to verify

Effective gateway payload retention; actual spending; provider retention terms; controlled Browser Run redirect/subrequest network restriction tests; worst-case token budget; broader semantic evaluation; public rate-limit/Turnstile behavior.
