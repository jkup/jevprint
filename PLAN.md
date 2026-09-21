# JEVPRINT — remaining work

Updated 2026-09-21. The first local alpha is implemented. Completed work and evidence live in [docs/progress.md](docs/progress.md); the product/architecture baseline lives in [docs/design.md](docs/design.md). PREPLAN.md remains the original creative brief.

## Next product checkpoint

- Get feedback on the real-data sculpture, X-RAY, and comparison from the running preview. Verify that a new visitor understands the relationship between judgments and form in roughly 20 seconds.
- Review the four real readings for meaningful visual distinction, particularly the love letter and philosophical essay, both classified as expressive. Tune mappings from observed outputs, not synthetic extremes.
- Finish the reveal choreography and dimension-specific X-RAY highlighting. The semantic SVG fallback is implemented.
- Decide whether the limited URL pilot is enough for the first public release, or arbitrary public URLs are essential.

## Integration and semantic validation

- Confirm actual gateway spend and effective payload retention in the dashboard. Owner configured unified billing and a $20/day gateway limit; Browser Run cost needs separate consideration.
- Complete controlled URL failure/redirect/subrequest cases. The live extraction → Jev smoke test passed for the Jev documentation page. Pilot restricts exact hosts to developers.cloudflare.com and blog.cloudflare.com; unrestricted URL ingestion remains off.
- Broaden the small evaluation corpus with ambiguous text, short text, embedded instructions, code-heavy text, and non-English stress cases. Record question quality and token-budget results.
- Confirm provider processing/retention terms before final public privacy copy. Application non-persistence is not a claim of zero provider retention.

## Public launch gate

- Add server-verified Turnstile and endpoint rate limits before both extraction and inference. Keep the current localhost-only live gate until these are proven.
- Establish arbitrary-URL network protections (redirects, resolved private targets, browser subrequests, DNS rebinding) or explicitly launch the narrow pilot. A hostname string blocklist does not satisfy this requirement.
- Choose domain and production/staging configuration. Verify operator kill switch and effective cost limits, including browser usage. No production deployment has occurred.
- Test on a real mobile device and Safari; record frame-rate measurements, adapt detail budgets if needed, and verify 200% zoom, context loss, hidden-tab behavior, and touch camera controls.
- Run final type/unit/browser/build/accessibility checks and a production packaging dry run after the above changes. Capture final desktop/mobile visuals and a short motion study.

## Deferred features

Saved fingerprints, public gallery, D1/R2, social cards, image export, sound, accounts, crawling, PDF/file ingestion, and authenticated webpages stay out of v1.
