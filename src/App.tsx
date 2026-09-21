import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { examples, sources } from './fixtures/examples';
import { analysisSchema, type Analysis } from '../shared/schema';
import { difference, fingerprint } from '../shared/fingerprint';
import { registry } from '../shared/questions';
import { DecisionDNA } from './components/DecisionDNA';
import { XRay } from './components/XRay';
import { StaticFingerprint } from './components/StaticFingerprint';

const Sculpture = lazy(() => import('./components/Sculpture'));
class CanvasBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return reduced;
}

export default function App() {
  const [a, setA] = useState<Analysis>(examples[0]);
  const [previous, setPrevious] = useState<Analysis>(examples[0]);
  const [b, setB] = useState<Analysis>(examples[1]);
  const [compare, setCompare] = useState(false);
  const [mix, setMix] = useState(0.5);
  const [transition, setTransition] = useState(1);
  const [xray, setXray] = useState(false);
  const [inspect, setInspect] = useState<'a' | 'b'>('a');
  const [about, setAbout] = useState(false);
  const [editor, setEditor] = useState(false);
  const [target, setTarget] = useState<'a' | 'b'>('a');
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reset, setReset] = useState(0);
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    let active = true;
    void fetch('/api/config')
      .then((r) => r.json())
      .then((config) => {
        if (active && typeof config === 'object' && config !== null && 'textEnabled' in config)
          setLive(config.textEnabled === true);
      })
      .catch(() => {});
    return () => {
      active = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (editor || about) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editor, about]);
  useEffect(() => {
    if (transition === 1) return;
    if (reduced) {
      setTransition(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / 1400);
      setTransition(t * t * (3 - 2 * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Each new target starts a reveal; frame updates must not restart its clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, reduced]);
  const current = inspect === 'b' && compare ? b : a;
  const from = useMemo(
    () => fingerprint(compare ? a.result : previous.result),
    [compare, a, previous],
  );
  const to = useMemo(() => fingerprint(compare ? b.result : a.result), [compare, a, b]);
  const primary = a.result.answers.primary_mode;
  const source = sources.find((s) => s.id === a.id);
  function choose(next: Analysis, destination = target) {
    if (compare && destination === 'b') setB(next);
    else {
      setPrevious(a);
      setA(next);
      setTransition(0);
    }
    setError('');
  }
  function closeDialog() {
    request.current?.abort();
    setLoading(false);
    setEditor(false);
    setAbout(false);
    setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          inputMode === 'text' ? { sourceType: 'text', text } : { sourceType: 'url', url: text },
        ),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof body.error === 'object' &&
          body.error !== null &&
          'message' in body.error &&
          typeof body.error.message === 'string'
            ? body.error.message
            : 'The reading could not be completed.';
        throw new Error(message);
      }
      const result = analysisSchema.safeParse(body);
      if (!result.success) throw new Error('The reading was incomplete. Please try again.');
      if (!controller.signal.aborted) {
        choose(result.data);
        setText('');
        setEditor(false);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }
  return (
    <div className={`app ${xray ? 'is-xray' : ''}`}>
      <a href="#controls" className="skip-link">
        Skip to controls
      </a>
      <header className="header">
        <a className="wordmark" href="/" aria-label="Jevprint home">
          <span className="brand-symbol">✳</span> JEVPRINT<span className="wordmark-dot">01</span>
        </a>
        <span className="header-note">A STUDY IN MACHINE PERCEPTION</span>
        <button className="text-button" onClick={() => setAbout(true)}>
          The idea <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main>
        <section className="experience" aria-label="Decision fingerprint explorer">
          <div className="intro">
            <p className="eyebrow">
              <span className="status-dot" /> WORDS IN. WORLDS OUT.
            </p>
            <h1>
              What shape
              <br />
              does a thought
              <br />
              <em>leave behind?</em>
            </h1>
            <p className="intro-copy">
              Every piece of text holds a pattern.
              <br />
              See its decisions become something
              <br className="desktop-break" /> you can explore.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setTarget('a');
                setEditor(true);
              }}
            >
              Make a fingerprint <span aria-hidden="true">↗</span>
            </button>
            <span className="input-hint">A paragraph. An idea. A different perspective.</span>
          </div>
          <div
            className="sculpture-area"
            role="img"
            aria-label={`Generative sculpture for ${compare ? `${a.title} and ${b.title}` : a.title}. Explore exact values with X-RAY.`}
          >
            <div className="orbit-label top">
              <span>
                FIG. {String(examples.findIndex((e) => e.id === a.id) + 1 || 5).padStart(2, '0')}
              </span>
              <span>{compare ? 'TWO PERSPECTIVES / ONE CONTINUUM' : 'DECISION FINGERPRINT'}</span>
            </div>
            <div className="canvas-wrap">
              <CanvasBoundary
                fallback={
                  <StaticFingerprint
                    a={from}
                    b={to}
                    blend={compare ? mix : transition}
                    message="Static view · Every decision is available in X-RAY."
                  />
                }
              >
                <Suspense
                  fallback={
                    <StaticFingerprint a={from} b={to} blend={compare ? mix : transition} />
                  }
                >
                  <Sculpture
                    a={from}
                    b={to}
                    blend={compare ? mix : transition}
                    xray={xray}
                    reduced={reduced || paused}
                    reset={reset}
                  />
                </Suspense>
              </CanvasBoundary>
            </div>
            <div className="object-caption">
              <span className="crosshair">+</span>
              <div>
                <span className="eyebrow">
                  {compare
                    ? 'An interpolation of two readings'
                    : (source?.label ?? 'Your fingerprint')}
                </span>
                <h2>{compare ? 'Somewhere between.' : a.title}</h2>
                <p>
                  {compare
                    ? 'Move the slider. Watch the decisions change the form.'
                    : (source?.subtitle ?? 'Your words, translated into a decision space.')}
                </p>
              </div>
            </div>
            <span className="drag-hint">
              DRAG TO ROTATE <span>·</span> SCROLL TO EXPLORE
            </span>
          </div>
          {xray && <XRay analysis={current} onClose={() => setXray(false)} />}
        </section>
        <section className="control-deck" id="controls" aria-label="Fingerprint controls">
          <div className="deck-top">
            <div className="reading-meta">
              <span className="status-dot" />
              {a.provenance === 'synthetic'
                ? 'DESIGN STUDY'
                : a.provenance === 'captured'
                  ? 'CAPTURED JEV READING'
                  : 'LIVE JEV READING'}
              <span className="divider">/</span>
              {registry.length} DECISIONS<span className="divider">/</span>
              {primary.type === 'choice' ? primary.choice.toUpperCase() : ''}
            </div>
            <div className="view-controls">
              <button
                aria-pressed={paused || reduced}
                onClick={() => setPaused(!paused)}
                disabled={reduced}
              >
                {paused || reduced ? 'Motion off' : 'Pause motion'}
              </button>
              <button onClick={() => setReset(reset + 1)}>Reset view</button>
              <button
                className={xray ? 'active' : ''}
                aria-pressed={xray}
                onClick={() => setXray(!xray)}
              >
                ⌖ X-RAY
              </button>
              <button
                className={compare ? 'active' : ''}
                aria-pressed={compare}
                onClick={() => {
                  setCompare(!compare);
                  setInspect('a');
                  setTarget('a');
                }}
              >
                ⇄ Compare
              </button>
            </div>
          </div>
          {compare ? (
            <div className="compare-deck">
              <div className="compare-endpoints">
                {(['a', 'b'] as const).map((key) => (
                  <div className={`endpoint ${inspect === key ? 'selected' : ''}`} key={key}>
                    <button
                      onClick={() => {
                        setInspect(key);
                        setTarget(key);
                        setMix(key === 'a' ? 0 : 1);
                      }}
                    >
                      <span className="eyebrow">
                        {key.toUpperCase()} · {key === 'a' ? a.title : b.title}
                      </span>
                      <DecisionDNA analysis={key === 'a' ? a : b} />
                    </button>
                    <select
                      aria-label={`Source ${key.toUpperCase()}`}
                      value={(key === 'a' ? a : b).id}
                      onChange={(e) => {
                        const found = examples.find((x) => x.id === e.target.value);
                        if (found) choose(found, key);
                      }}
                    >
                      {![...examples.map((e) => e.id)].includes((key === 'a' ? a : b).id) && (
                        <option value={(key === 'a' ? a : b).id}>Your text</option>
                      )}
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="text-button"
                      onClick={() => {
                        setTarget(key);
                        setEditor(true);
                      }}
                    >
                      Use your text ↗
                    </button>
                  </div>
                ))}
              </div>
              <div className="blend-control">
                <label htmlFor="blend">
                  A <span>{Math.round(mix * 100)}% toward B</span> B
                </label>
                <input
                  id="blend"
                  aria-label="Blend between A and B"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mix}
                  onChange={(e) => setMix(Number(e.target.value))}
                />
                <p>Artistic interpolation · endpoint readings stay unchanged</p>
              </div>
              <div className="shifts">
                <span className="eyebrow">Biggest shifts · A → B</span>
                {difference(a, b).map((d) => (
                  <div key={d.id}>
                    <span>{d.label}</span>
                    <strong>{d.display}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="examples-deck">
              <div className="examples-label">
                <span className="eyebrow">Start with a different thought</span>
                <span>Four ways of seeing.</span>
              </div>
              <div className="example-buttons">
                {examples.map((example, i) => (
                  <button
                    key={example.id}
                    className={`example ${a.id === example.id ? 'selected' : ''}`}
                    aria-pressed={a.id === example.id}
                    onClick={() => choose(example, 'a')}
                  >
                    <span className="example-number">0{i + 1}</span>
                    <span>{sources[i].label}</span>
                    <span className="example-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
              <div className="dna-wrap">
                <span className="eyebrow">Decision DNA</span>
                <DecisionDNA analysis={a} />
              </div>
            </div>
          )}
        </section>
        <p className="provenance-note" role="status">
          {loading
            ? 'Making decisions…'
            : a.provenance === 'synthetic'
              ? 'These studies use illustrative probabilities while we connect Jev. They are not model evaluations.'
              : `${a.result.model} · ${a.elapsedMs} ms application-observed model request · ${a.provenance === 'captured' ? 'Bundled reading; no new API call.' : 'Analyzed in this session.'}`}
        </p>
        {a.source && (
          <details className="source-preview">
            <summary>
              {a.source.reduced ? 'A sampled excerpt was analyzed' : 'View the analyzed page text'}
              {' · '}
              {a.source.extractionMs} ms extraction
            </summary>
            <p className="small muted">{a.source.url}</p>
            <pre>{a.source.excerpt}</pre>
          </details>
        )}
      </main>
      <footer>
        <span>THE PROBABILITIES ARE THE ART.</span>
        <span>
          JEV + CLOUDFLARE <span className="footer-mark">↗</span>
        </span>
      </footer>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-inner">
          <div className="panel-heading">
            <span className="eyebrow">JEVPRINT / {about ? 'THE IDEA' : 'A NEW READING'}</span>
            <button aria-label="Close dialog" onClick={closeDialog}>
              ×
            </button>
          </div>
          {about ? (
            <>
              <h2 id="dialog-title">
                The probabilities
                <br />
                <em>are the art.</em>
              </h2>
              <p>
                Give Jev a piece of text and a set of questions. It returns typed judgments:
                choices, scores, and probabilities. JEVPRINT translates those answers into a living
                sculpture.
              </p>
              <div className="about-flow">
                TEXT <span>→</span> DECISIONS <span>→</span> FORM
              </div>
              <p>
                Each filament follows the same visual rules. X-RAY shows how they work. Compare lets
                you move between two readings and discover where they differ.
              </p>
              <p className="muted small">
                This is an artistic interpretation of model outputs, not a view inside a model or a
                measure of truth. No submitted text is saved by this app. Live analysis sends
                content to Cloudflare and TypeSafe for processing.
              </p>
              <a
                className="text-button"
                href="https://developers.cloudflare.com/ai/models/typesafe/jev/"
                target="_blank"
                rel="noreferrer"
              >
                Learn about Jev ↗
              </a>
            </>
          ) : (
            <>
              <h2 id="dialog-title">
                Give a thought
                <br />
                <em>some form.</em>
              </h2>
              <div className="input-tabs">
                <button
                  aria-pressed={inputMode === 'text'}
                  onClick={() => {
                    setInputMode('text');
                    setError('');
                  }}
                >
                  Paste text
                </button>
                <button
                  aria-pressed={inputMode === 'url'}
                  onClick={() => {
                    setInputMode('url');
                    setError('');
                  }}
                >
                  Webpage URL
                </button>
              </div>
              <form onSubmit={submit}>
                <label className="sr-only" htmlFor="source-input">
                  {inputMode === 'text' ? 'Text to analyze' : 'Webpage URL'}
                </label>
                {inputMode === 'text' ? (
                  <textarea
                    id="source-input"
                    required
                    minLength={40}
                    maxLength={12000}
                    placeholder="An idea, a letter, a small manifesto…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                ) : (
                  <input
                    id="source-input"
                    type="url"
                    required
                    placeholder="https://example.com/an-idea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                )}
                <p className="small muted">
                  {inputMode === 'text'
                    ? 'A few sentences work best. Up to 12 KB. Text stays out of application storage.'
                    : 'URL pilot: developers.cloudflare.com and blog.cloudflare.com. Paste text from other sites.'}
                </p>
                {!live && (
                  <p className="availability">
                    Live readings are being connected. The four studies are ready to explore.
                  </p>
                )}
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? 'Making decisions…' : 'Find its fingerprint'}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
