# Build: JEVPRINT — A Generative Decision Fingerprint

You are a world-class product designer, creative technologist, frontend engineer, and Cloudflare developer.

Build a complete, polished web experiment called **JEVPRINT**.

The experience should demonstrate what makes TypeSafe's Jev model unusual:

> Traditional generative AI produces words.
> Jev produces decisions, probabilities, and confidence.
>
> JEVPRINT turns those invisible decisions into a living visual object.

The site must feel like an experimental digital-art project from a top creative studio, not a SaaS dashboard, chatbot, AI playground, or generic hackathon project.

The final result should be genuinely fun to show someone.

---

# 1. Core experience

A visitor can provide either:

1. A URL
2. Raw pasted text

Examples:

- a personal website
- a Cloudflare blog post
- a news article
- an essay
- product marketing copy
- a GitHub README
- a manifesto
- documentation
- an email
- random prose

The application extracts/normalizes the content, sends it to Jev together with many independent questions, and receives dozens of probabilistic judgments.

Those judgments drive a generative 3D visualization.

The result is the input's:

# DECISION FINGERPRINT

The visualization MUST be determined by the actual Jev output.

Do not use Jev merely to generate a few labels that decorate an unrelated animation.

Probabilities, uncertainty, confidence, classifications, and scores should directly affect geometry, motion, organization, and behavior.

The user should feel:

> "I'm looking at the model's decision space."

---

# 2. Important fact about the architecture

Jev is available directly through Cloudflare's AI model catalog as:

    typesafe/jev

Use Cloudflare's AI binding.

A Worker / Pages Function can invoke it approximately like:

```ts
const response = await env.AI.run(
  "typesafe/jev",
  {
    state,
    questions,
  },
  {
    gateway: {
      id: "jevprint",
    },
  },
);
```

Use **Cloudflare AI Gateway**.

Do NOT implement an unnecessary custom TypeSafe proxy or expose a TypeSafe API key to the browser.

Cloudflare should manage access to the third-party model through its AI platform / Unified Billing.

Use AI Gateway for:

- observability
- logs
- latency visibility
- cost visibility
- rate limiting
- request metadata
- caching where appropriate

The browser must NEVER invoke the model directly.

---

# 3. Cloudflare architecture

Prefer a Cloudflare-native architecture.

## Frontend

Cloudflare Pages

Use:

- React
- TypeScript
- Vite
- React Three Fiber / Three.js
- custom shaders where useful
- Framer Motion or Motion for DOM transitions
- WebGL for the primary artifact

Avoid unnecessarily heavy dependencies.

## API

Cloudflare Pages Functions.

Suggested endpoints:

    POST /api/analyze
    POST /api/extract
    GET  /api/fingerprint/:id
    GET  /api/recent

If keeping the first version minimal, `/api/analyze` can handle the entire pipeline.

## Jev

Pages Function:

    context.env.AI.run("typesafe/jev", ...)

Route through AI Gateway:

    gateway.id = "jevprint"

## URL extraction

For URLs, use **Cloudflare Browser Run**.

Browser Run should load the actual rendered webpage and retrieve:

- rendered Markdown / main text
- title
- URL
- optionally a screenshot
- useful metadata if readily available

Do not crawl the entire domain. Analyze only the URL the user submits.

Because Browser Run browser bindings are primarily a Workers capability, the clean production architecture can be:

    Pages
      ↓
    Pages Function
      ↓ service binding
    Browser helper Worker
      ↓
    Browser Run

The Browser helper Worker should expose a tiny internal interface such as:

    POST /extract
    { "url": "..." }

and return normalized page data.

Alternatively, if significantly simpler and supported cleanly, call the Browser Run Quick Actions API server-side.

Do not put Cloudflare API credentials in client code.

## Persistence

Use D1 if persistence makes the experience noticeably better.

Store:

- fingerprint ID
- URL, if applicable
- title
- creation timestamp
- normalized Jev result
- visualization parameters
- content hash

Do NOT unnecessarily store the entire source text for arbitrary user inputs.

R2 is optional for:

- screenshots
- generated social cards
- exported fingerprint images

## Abuse protection

Use:

- Cloudflare Turnstile if the public endpoint needs it
- AI Gateway rate limiting
- sensible endpoint rate limits
- input size limits

Validate URL inputs.

Only permit HTTP/HTTPS.

Block obviously unsafe/private/local targets such as:

- localhost
- loopback
- private network addresses
- metadata endpoints
- URLs containing embedded credentials

Respect Browser Run / Cloudflare content controls.

---

# 4. Jev mental model

Jev is NOT a chat model.

Do not ask it:

> "Describe this website."

Do not expect generated prose.

Its strength is evaluating a shared state against many typed questions extremely quickly.

Use all three primitives heavily:

## Choice

Use when exactly one option from a closed taxonomy is appropriate.

Response conceptually contains:

    choice
    probabilities
    confidence

## Score

Use for ordered rubrics.

Response conceptually contains:

    score
    probabilities
    confidence
    legend

## Noul

Use for yes/no propositions.

Response is a probability:

    noul: 0 → 1

A value near 0.5 represents uncertainty.

The experience should visually celebrate this uncertainty instead of hiding it.

---

# 5. Critical Jev principle

Ask many small, atomic questions.

Do NOT ask one vague question attempting to understand everything.

For example, instead of:

    "What is this text like?"

ask separately:

    "How technically dense is this?"
    "How abstract is this?"
    "Is the primary goal persuasion?"
    "Does the reader receive a clear action?"
    "Which communication mode best describes this?"
    "How emotionally intense is the writing?"
    "How time-sensitive is the content?"

The questions should be evaluated against the same source state.

Use one Jev call containing the full question bank where practical.

---

# 6. State sent to Jev

For raw text:

```ts
{
  source_type: "text",
  content: normalizedText
}
```

For webpages:

```ts
{
  source_type: "webpage",
  url,
  title,
  description,
  content: normalizedMarkdown
}
```

Do not send huge amounts of irrelevant markup.

Remove or greatly reduce:

- scripts
- styles
- cookie banners
- repeated navigation
- repeated footer text
- giant link lists
- obvious boilerplate

Preserve:

- headings
- prose
- important labels
- meaningful links if represented compactly
- document structure

Keep comfortably inside Jev's current context limit.

Target substantially less than the maximum; approximately <= 60k characters of normalized source content is a reasonable conservative starting point.

Never silently truncate the beginning and lose the rest.

Prefer a deterministic reduction strategy preserving:

- title
- description
- introduction
- headings
- representative content across the document
- ending/conclusion

---

# 7. Initial Jev question bank

Create the question set in one central TypeScript module so it is trivial to tune.

Use approximately the following.

The exact wording may be improved, but preserve the atomic nature of each judgment.

```ts
export const questions = {
  primary_mode: {
    type: "choice",
    instructions:
      "Which communication mode best describes the primary purpose of this content?",
    criteria: {
      informative: "Primarily communicates facts, explanation, or information",
      persuasive: "Primarily attempts to change beliefs or convince the reader",
      instructional: "Primarily teaches the reader how to do something",
      transactional: "Primarily encourages or enables a concrete transaction or conversion",
      conversational: "Primarily communicates in an interpersonal or conversational way",
      narrative: "Primarily tells a story or recounts events",
      expressive: "Primarily expresses ideas, identity, emotion, or artistic intent",
      reference: "Primarily serves as material to look up or consult",
      other: "Does not fit the other modes well",
    },
  },

  audience: {
    type: "choice",
    instructions:
      "Which audience does the content appear primarily written for?",
    criteria: {
      general: "A broad general audience",
      technical: "Technical practitioners or engineers",
      professional: "People working in a professional or business context",
      academic: "Researchers, academics, or highly specialized readers",
      consumer: "Potential or existing consumers of a product or service",
      enthusiast: "People deeply interested in a particular topic or community",
      personal: "A specific person or small interpersonal audience",
      other: "No listed audience clearly dominates",
    },
  },

  structure: {
    type: "choice",
    instructions:
      "Which information structure best characterizes the content?",
    criteria: {
      argument: "Makes a case and supports a conclusion",
      explanation: "Explains a subject or concept",
      tutorial: "Presents steps or instructions",
      announcement: "Primarily announces something",
      narrative: "Progresses as a story",
      reference: "Structured primarily for lookup",
      catalog: "Primarily presents a collection of items or options",
      conversation: "Structured as interpersonal dialogue or correspondence",
      other: "Does not fit these structures well",
    },
  },

  tone: {
    type: "choice",
    instructions:
      "Which tone most strongly characterizes the writing?",
    criteria: {
      neutral: "Measured and emotionally neutral",
      playful: "Playful, humorous, whimsical, or light",
      serious: "Serious and deliberate",
      urgent: "Urgent or time-sensitive",
      enthusiastic: "Strongly positive, energetic, or excited",
      confrontational: "Combative, critical, or confrontational",
      reflective: "Thoughtful, contemplative, or introspective",
      intimate: "Personal, vulnerable, or intimate",
      other: "No listed tone dominates",
    },
  },

  technical_density: {
    type: "score",
    instructions: "How technically dense is this content?",
    criteria: [
      "No specialist knowledge is required",
      "Occasional domain-specific concepts appear",
      "Moderate specialist knowledge improves understanding",
      "Highly technical and primarily intended for specialists",
      "Extremely dense specialist material",
    ],
  },

  complexity: {
    type: "score",
    instructions:
      "How conceptually complex is the material a reader must keep track of?",
    criteria: [
      "Extremely simple",
      "Mostly straightforward",
      "Moderately complex",
      "Complex with several interacting ideas",
      "Very complex or cognitively demanding",
    ],
  },

  abstraction: {
    type: "score",
    instructions:
      "How abstract rather than concrete is the content?",
    criteria: [
      "Almost entirely concrete",
      "Mostly concrete",
      "Balanced between concrete and abstract",
      "Mostly abstract",
      "Highly abstract or conceptual",
    ],
  },

  specificity: {
    type: "score",
    instructions:
      "How specific and concrete are the claims or details?",
    criteria: [
      "Very broad or vague",
      "Mostly broad",
      "Mixed",
      "Usually specific",
      "Extremely specific and detailed",
    ],
  },

  emotional_intensity: {
    type: "score",
    instructions:
      "How emotionally intense is the writing itself?",
    criteria: [
      "Emotionally flat or neutral",
      "Mild emotion",
      "Noticeable emotion",
      "Strong emotion",
      "Extremely emotionally intense",
    ],
  },

  certainty: {
    type: "score",
    instructions:
      "How certain or definitive does the author present their claims?",
    criteria: [
      "Strongly uncertain or speculative",
      "Frequently hedged",
      "Mixed certainty",
      "Generally confident",
      "Highly definitive or certain",
    ],
  },

  urgency: {
    type: "score",
    instructions:
      "How strongly does the content imply that something matters right now or soon?",
    criteria: [
      "Entirely timeless",
      "Weak time sensitivity",
      "Some time sensitivity",
      "Clearly time-sensitive",
      "Immediate urgency",
    ],
  },

  actionability: {
    type: "score",
    instructions:
      "How readily can the reader take concrete action based on this content?",
    criteria: [
      "No clear action",
      "Mostly informational",
      "Some actionable guidance",
      "Clearly actionable",
      "Explicit and immediately actionable",
    ],
  },

  novelty: {
    type: "score",
    instructions:
      "How strongly does the content present its ideas as unusual, surprising, novel, or counterintuitive?",
    criteria: [
      "Entirely conventional",
      "Mostly conventional",
      "Some novel framing",
      "Distinctly novel or surprising",
      "Highly unusual or counterintuitive",
    ],
  },

  commercial_intent: {
    type: "score",
    instructions:
      "How strongly does the content attempt to drive commercial interest or a transaction?",
    criteria: [
      "No commercial intent",
      "Very weak commercial context",
      "Some commercial intent",
      "Strong commercial intent",
      "Primarily designed to sell or convert",
    ],
  },

  persuasive: {
    type: "noul",
    instructions:
      "Is changing the reader's belief, preference, or behavior an important goal of the content?",
  },

  factual_claims: {
    type: "noul",
    instructions:
      "Does this content make meaningful claims presented as factual?",
  },

  quantitative: {
    type: "noul",
    instructions:
      "Does quantitative information materially contribute to the content?",
  },

  call_to_action: {
    type: "noul",
    instructions:
      "Does the content contain a meaningful call for the reader to do something?",
  },

  specialist_assumptions: {
    type: "noul",
    instructions:
      "Does the content assume meaningful prior specialist or domain knowledge?",
  },

  opinionated: {
    type: "noul",
    instructions:
      "Does the author communicate meaningful subjective judgments or opinions?",
  },

  personal_voice: {
    type: "noul",
    instructions:
      "Is a distinct personal authorial voice an important part of the content?",
  },

  time_sensitive: {
    type: "noul",
    instructions:
      "Would the usefulness or meaning of this content change substantially with time?",
  },

  clear_next_step: {
    type: "noul",
    instructions:
      "Does the reader finish with a clear understanding of what they should do next?",
  },

  relies_on_trust: {
    type: "noul",
    instructions:
      "Does accepting the content substantially depend on trusting the author's claims, judgment, or authority?",
  },

  exploratory: {
    type: "noul",
    instructions:
      "Does the content noticeably explore uncertainty rather than merely presenting a settled conclusion?",
  },
};
```

Do not add dozens of redundant questions merely to create more visual data.

Every dimension should have a clear visual role.

---

# 8. Visualization concept

The final object is NOT a chart.

It is a living data sculpture.

Think:

- generative art
- particle systems
- fluid topology
- strange attractors
- molecular structures
- neural connectivity
- astronomical objects
- topographical forms

But it should remain interpretable.

The user must be able to discover why the object looks the way it does.

---

# 9. Visual grammar

Create a deterministic translation layer:

    Jev response → normalized visual parameters

Keep this mapping in a dedicated module:

    src/lib/fingerprint.ts

The same Jev result MUST always produce the same fingerprint.

Do not use Math.random() for permanent structural decisions.

If procedural randomness is useful, seed it from a stable hash of:

    normalized input + Jev answers

---

# 10. Suggested mapping

## Primary communication mode → topology

Different Choice winners create different overall topology families.

For example:

    informative     → ordered spherical network
    persuasive      → directional cone / attractor
    instructional   → ascending layered structure
    transactional   → focused funnel / converging geometry
    conversational  → paired or orbiting structures
    narrative       → flowing path / ribbon
    expressive      → organic asymmetric form
    reference       → modular lattice
    other           → irregular neutral topology

These should share a coherent visual language.

Do NOT make them look like nine unrelated art styles.

## Choice probability distribution → fragmentation

Do not visualize only the winning Choice.

If:

    informative .93
    instructional .04
    reference .03

the object should feel singular and stable.

If:

    informative .34
    narrative .30
    expressive .26
    other .10

the topology should blend, bifurcate, or become ambiguous.

Compute entropy from Choice probabilities.

High entropy:

- more branching
- competing attractors
- less structural dominance

Low entropy:

- cleaner topology
- obvious organizing center

This is one of the most important visual demonstrations of Jev.

## Confidence → coherence

High confidence:

- sharp
- stable
- coherent
- synchronized

Low confidence:

- diffuse
- soft
- unstable
- locally noisy
- ambiguous

Do NOT equate confidence simply with opacity.

Use spatial organization and motion too.

## Technical density → detail density

Higher technical density:

- more nodes
- finer local structures
- more connections
- greater surface subdivision

## Complexity → structural depth

Higher complexity:

- more layers
- hierarchical structures
- deeper nested forms

## Abstraction → radial spread

Concrete:

- dense central core

Abstract:

- broader spatial distribution / distant orbitals

## Specificity → edge sharpness

High specificity:

- precise boundaries
- clearly defined paths

Low specificity:

- diffuse boundaries
- fog / soft particle transitions

## Emotional intensity → pulse amplitude

Low:

- almost still

High:

- stronger breathing / oscillation / expansion

## Urgency → temporal speed

Low:

- slow drifting movement

High:

- faster directional movement

Do not make high urgency unpleasant or seizure-inducing.

## Certainty → directional agreement

High certainty:

- particles move coherently

Low certainty:

- vectors diverge and fluctuate

## Novelty → symmetry breaking

Conventional:

- relatively symmetric

Novel:

- increasingly unusual asymmetric protrusions / local deviations

## Actionability → directional flow

Low:

- orbiting / self-contained movement

High:

- clear outward vector or destination

## Commercial intent → gravitational convergence

High:

- geometry converges toward one strong attractor / destination

Low:

- less convergent

## Noul probabilities

Represent each Noul as a subtle force field.

A probability near:

    1.0 → strong positive force
    0.5 → weak/ambiguous force
    0.0 → strong inverse force

Do not just render ten gauges around the model.

The forces should alter the sculpture.

---

# 11. Color

The experience should be dark and cinematic.

Avoid:

- generic purple AI gradients
- rainbow-for-the-sake-of-rainbow
- SaaS blue
- excessive glassmorphism

Use a nearly black neutral background.

The fingerprint can use a spectral palette whose distribution is driven by categories/probabilities.

Color should communicate competing dimensions.

A good visual reference is:

> scientific visualization crossed with album art crossed with a museum installation.

Typography and surrounding UI should remain restrained so the fingerprint dominates.

---

# 12. The reveal animation

This is critical.

Do not immediately pop the finished visualization onto screen.

When analysis starts:

### Stage 1 — SOURCE

The submitted text appears briefly as fragments / lines / particles.

For URLs, show:

    reading [domain]

Use the actual title once available.

### Stage 2 — STATE

The content collapses or streams into a central structure.

Subtle label:

    STATE

### Stage 3 — DECISIONS

As the response arrives, individual Jev judgments illuminate around the structure.

Show several actual calculations such as:

    TECHNICAL DENSITY       3.71 / 4
    PERSUASIVE              0.18
    PRIMARY MODE
      INFORMATIVE           0.72
      REFERENCE             0.21
      OTHER                 0.07

Do not pretend Jev streams answers if the API response arrives atomically.

The reveal can animate the returned values after receipt, but it must never falsely imply network streaming.

### Stage 4 — COLLAPSE

All the visible decision values collapse into the geometry.

The object's shape finalizes.

### Stage 5 — FINGERPRINT

Large understated label:

    DECISION FINGERPRINT

Then remove most UI chrome and let the object breathe.

The entire reveal should feel ~2–4 seconds AFTER the response arrives.

Allow returning visitors to skip/reduce animation.

Respect `prefers-reduced-motion`.

---

# 13. Main layout

Desktop:

Full viewport.

The fingerprint occupies roughly 65–80% of the viewport.

Minimal header:

    JEVPRINT                         ABOUT

Input controls sit unobtrusively near the bottom or left edge.

After analysis:

    [ URL/title ]

    24 decisions
    318 ms

                           [COMPARE]

Do not put the fingerprint inside a card.

The canvas IS the interface.

Mobile should remain excellent, but desktop is the hero experience.

---

# 14. Interaction

The object should reward exploration.

## Hover

Hovering a region/node/feature reveals the Jev dimension contributing to it.

For example:

    CERTAINTY
    0.81

    High certainty creates
    coherent directional motion.

## Click

Clicking enters an "X-RAY" mode.

The object separates into layers.

Show the underlying decisions spatially.

For Choice:

    PRIMARY MODE

    informative    72%  ━━━━━━━━━━━
    reference      21%  ━━━
    other           7%  ━

The actual visualization should remain visible behind this.

## Rotate

Pointer drag rotates the object.

## Scroll / pinch

Zoom within sensible constraints.

## Reset

Double click or a small control resets camera.

---

# 15. X-RAY mode

This is the educational payoff.

Button:

    X-RAY

When enabled:

The sculpture partially explodes into components.

Each underlying judgment connects to the portion of the geometry it influences.

Organize decisions into:

    FORM
    MOTION
    SIGNAL
    INTENT

Example:

FORM
    primary_mode
    complexity
    abstraction
    technical_density

MOTION
    urgency
    emotional_intensity
    certainty

SIGNAL
    specificity
    novelty
    factual_claims
    quantitative

INTENT
    persuasive
    commercial_intent
    call_to_action
    clear_next_step

Use elegant connector lines.

The experience should make Jev's typed outputs understandable without becoming a dashboard.

---

# 16. The killer feature: COMPARE

Allow the visitor to click:

    COMPARE

Then enter a second URL or text.

Analyze it with the exact same Jev question bank.

Display both fingerprints.

Then provide a draggable interpolation control:

    A ─────────●───────── B

As the slider moves, morph the first decision fingerprint into the second.

THIS SHOULD BE BEAUTIFUL.

Interpolate the underlying visual parameters, not merely crossfade two canvases.

Also surface the largest semantic deltas:

    BIGGEST SHIFTS

    technical density     +62%
    commercial intent     -48%
    urgency               +33%

Do not characterize one as better.

A great default demo could compare two famous public webpages or bundled sample texts.

Do not depend on those external sites being online for the demo.

Ship local sample content.

---

# 17. "Decision DNA"

Add one compact representation below/alongside the visualization:

A circular ring or thin horizontal barcode generated from every probability.

Call it:

    DECISION DNA

Each analysis produces a repeatable compact signature.

This is useful for:

- gallery thumbnails
- comparison
- social cards
- loading state
- recognizable identity

Keep it elegant.

Do not literally copy biological DNA imagery.

---

# 18. Example mode

The landing page must be interesting before anyone submits anything.

Ship 4–6 bundled demo analyses.

Examples could conceptually represent:

    A technical RFC
    A love letter
    A product landing page
    A breaking-news article
    A philosophical essay
    A recipe

Do not require API calls just to display these demos.

Store fixture Jev responses locally.

Let users click:

    TECHNICAL RFC
    LOVE LETTER
    PRODUCT PAGE
    ESSAY

and instantly morph the sculpture between them.

This simultaneously:

- demonstrates the site
- makes the home page alive
- lowers API cost
- makes the UI testable without network access

---

# 19. Landing-page opening

Opening copy should be extremely minimal.

Something approximately like:

    EVERY PIECE OF TEXT
    CREATES A DIFFERENT
    DECISION SPACE.

Then:

    See how Jev reads it.

Input:

    [ Paste a URL or text...              ]
                                      ANALYZE

Small secondary copy:

    Jev doesn't generate a response.
    It makes dozens of probabilistic decisions at once.

Do not overwhelm the first screen with explanation.

The artifact should teach the concept.

---

# 20. About section

Keep the explanation concise.

Suggested conceptual narrative:

    LLMs generate sequences of tokens.

    Jev does something different.

    Give it a state and a collection of possible judgments.
    It evaluates those judgments and returns typed decisions,
    probabilities, and confidence.

    JEVPRINT asks Jev the same set of questions about anything
    you give it, then turns the resulting decision space into form.

Include a simple diagram:

    TEXT
      ↓
    STATE
      ↓
    24 PARALLEL DECISIONS
      ↓
    PROBABILITIES
      ↓
    FORM

Mention:

    Powered by Jev + Cloudflare

Do not write marketing claims that cannot be substantiated.

---

# 21. API response contract

Normalize the model response on the server.

Return something like:

```ts
interface Analysis {
  id: string;
  source: {
    type: "url" | "text";
    title?: string;
    url?: string;
  };
  model: string;
  elapsedMs: number;
  answers: Record<string, JevAnswer>;
  fingerprint: FingerprintParameters;
}

type JevAnswer =
  | {
      type: "noul";
      noul: number;
    }
  | {
      type: "choice";
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      type: "score";
      score: number;
      confidence: number;
      probabilities: Record<string, number>;
      legend: Record<string, string>;
    };
```

Validate the response.

Do not let malformed data crash WebGL rendering.

Clamp numeric values defensively.

---

# 22. Example Pages Function Jev call

Implement along these lines using current Cloudflare APIs:

```ts
interface Env {
  AI: Ai;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json();

  // Validate and normalize body before this point.

  const started = performance.now();

  const result = await context.env.AI.run(
    "typesafe/jev",
    {
      state: body.state,
      questions,
    },
    {
      gateway: {
        id: "jevprint",
        collectLog: true,
        metadata: {
          app: "jevprint",
          source_type: body.state.source_type,
        },
      },
    },
  );

  const elapsedMs = performance.now() - started;

  return Response.json({
    result,
    elapsedMs,
  });
};
```

Confirm exact generated Cloudflare types and current API signatures while implementing.

Do not work around type errors with broad `any` casts if current bindings provide correct types.

---

# 23. Fingerprint calculation

All rendering should consume a model like:

```ts
interface FingerprintParameters {
  seed: number;

  topology: {
    family: string;
    blend: Record<string, number>;
    entropy: number;
  };

  geometry: {
    density: number;
    depth: number;
    radialSpread: number;
    symmetry: number;
    edgeDefinition: number;
    convergence: number;
  };

  motion: {
    speed: number;
    pulse: number;
    coherence: number;
    outwardFlow: number;
    turbulence: number;
  };

  signal: {
    confidence: number;
    fragmentation: number;
    factuality: number;
    quantitative: number;
  };

  nouls: Record<string, number>;
}
```

The conversion from Jev answers to this object should be:

- pure
- deterministic
- unit tested

Do not put semantic interpretation directly inside shader code.

---

# 24. Choice entropy

Implement normalized Shannon entropy for Choice outputs.

Conceptually:

    entropy = -Σ(p * ln p) / ln(numberOfOptions)

Result:

    0 = one dominant answer
    1 = maximally ambiguous distribution

This is visually important.

Use it heavily.

It exposes a fascinating part of probabilistic decision models that ordinary chatbot interfaces hide.

---

# 25. Score normalization

Scores use rubric indices.

Normalize:

    normalized = score / (numberOfLevels - 1)

Clamp to 0…1.

Preserve raw score for display.

Do not pretend the score itself is a percentage.

---

# 26. Confidence aggregation

Do not invent a fake global "Jev confidence".

If the UI needs a global coherence parameter, explicitly derive it from individual Choice/Score confidence values, e.g.:

    mean confidence

Call the internal visual parameter:

    aggregateCoherence

NOT:

    overall Jev confidence

Noul values are probabilities and should not be treated as separate confidence scores.

---

# 27. URL extraction UX

When URL analysis is requested:

Show real stages:

    OPENING PAGE
    EXTRACTING CONTENT
    MAKING DECISIONS
    BUILDING FINGERPRINT

Do not display a fake percentage.

If Browser Run extraction fails:

Offer:

    We couldn't read this page.
    Paste its text instead.

Do not dump infrastructure error messages on users.

---

# 28. Performance

The page must feel exceptionally smooth.

Target:

- 60fps on modern desktop hardware
- graceful degradation on mobile
- minimal layout shift
- lazy-load Three/WebGL bundle where practical
- avoid allocating large arrays every frame
- use BufferGeometry efficiently
- use shader uniforms for animation rather than React state every frame

Cap device pixel ratio.

Pause/reduce rendering when the tab is hidden.

Respect reduced motion.

Provide a non-WebGL fallback representation if WebGL initialization fails.

---

# 29. Accessibility

Despite being an art experiment:

- all controls keyboard accessible
- meaningful focus states
- sufficient contrast
- textual equivalent of the Jev results
- reduced-motion support
- canvas has accessible description
- X-RAY data can be navigated without hovering
- do not encode meaning solely through color

---

# 30. Sound

Optional stretch goal.

If included:

Sound must be OFF by default.

A tiny button:

    SOUND ○

When enabled, synthesize an ambient tone from the fingerprint.

Do not load a song.

Generate it procedurally with Web Audio.

Possible mapping:

    complexity → harmonic richness
    urgency → tempo
    confidence → consonance
    emotional intensity → amplitude
    entropy → detuning

Keep it subtle.

This could make the experiment extraordinary if done tastefully.

---

# 31. Sharing

Every saved public fingerprint gets a short route:

    /f/:id

Share page should recreate the exact deterministic fingerprint.

Generate a social preview / OG image showing:

- fingerprint
- title/domain
- JEVPRINT
- compact Decision DNA

Never expose submitted private text unless the user explicitly chooses to save/share it.

For raw text, default analyses to ephemeral.

For public URLs, persistence can be opt-in or configurable.

---

# 32. Gallery

Optional but desirable.

Small link:

    EXPLORE

Show a gallery of interesting public fingerprints.

The gallery should primarily be visual.

Grid of Decision DNA / fingerprint thumbnails.

Hover:

    title
    domain
    primary mode

Click → full fingerprint.

Do not turn this into a social network.

---

# 33. Caching

Create a deterministic analysis key from:

    normalized content
    question-bank version
    model identifier/version

Hash it.

If exactly the same content/question-bank/model combination has already been evaluated, reuse the result where appropriate.

Use AI Gateway caching and/or application cache intelligently.

Version the question bank:

    QUESTION_SET_VERSION = "1"

A question wording change must invalidate prior semantic cache entries.

---

# 34. Model/version visibility

Somewhere in X-RAY/About show:

    MODEL
    JEV 1.13.0

or whatever model identifier Cloudflare actually returns.

Do not hardcode the displayed underlying Jev version if the API response provides it.

Also show:

    24 judgments
    287 ms

Use real measured elapsed time.

Do not claim it is pure inference latency; it is application-observed request latency.

---

# 35. Cloudflare observability

Attach useful AI Gateway metadata such as:

    app: jevprint
    question_set: 1
    source_type: url | text

Do NOT log arbitrary user text into custom metadata.

Use AI Gateway analytics to inspect:

- request count
- error rate
- latency
- cost
- token usage

Set sensible public rate limits before launch.

---

# 36. Privacy

Be thoughtful because users may paste private content.

Clearly communicate:

    Text is analyzed to create the fingerprint.

Do not persist raw pasted text by default.

Do not include raw text in URLs.

Do not send arbitrary analytics events containing user content.

If saving an analysis:

store the normalized Jev output + visualization parameters rather than full source text unless the user explicitly asks to preserve the input.

---

# 37. Design anti-patterns

ABSOLUTELY AVOID:

- chatbot bubbles
- "Ask AI" interfaces
- generic analytics dashboards
- a giant sidebar
- dozens of rectangular cards
- shadcn-looking default UI
- glass panels everywhere
- giant gradient blobs
- generic purple AI branding
- fake terminal text
- gratuitous monospace everywhere
- fake streaming output
- fake confidence metrics
- arbitrary random generative art unrelated to model output
- excessive explanatory copy
- charts presented as the main experience

It should feel like art first, explanation second.

---

# 38. Typography

Use one strong modern grotesk/sans family for UI and large type.

Optionally use monospace sparingly for:

- probabilities
- timings
- model identifiers
- raw decision values

Large landing typography should feel editorial rather than startup-marketing-ish.

---

# 39. Microinteractions

Spend real effort here.

Examples:

- input border subtly reacts as text appears
- ANALYZE becomes a small waveform while processing
- choices smoothly fan out in X-RAY mode
- probability labels count into place
- fingerprint rotates almost imperceptibly while idle
- switching examples morphs rather than hard-cuts
- compare mode feels like physically blending two objects
- mouse movement produces extremely subtle parallax

Nothing should bounce cartoonishly.

Motion should have weight.

---

# 40. Build local fixtures first

Before wiring the API, create realistic fixture responses for:

- technical RFC
- love letter
- product landing page
- philosophical essay

Use those to perfect the fingerprint rendering.

The visualization needs to be beautiful even when offline.

Then connect real Jev.

Do not allow backend integration work to result in an ugly visualization.

---

# 41. Testing

Unit test:

- score normalization
- entropy calculation
- response validation
- deterministic seed generation
- fingerprint parameter generation
- URL validation
- truncation/reduction logic

Add end-to-end coverage for:

1. paste text
2. analyze
3. fingerprint appears
4. X-RAY works
5. compare two fixtures
6. malformed API response fails gracefully
7. URL extraction failure offers pasted-text fallback

---

# 42. Repository structure

A reasonable structure:

```text
/
├── functions/
│   └── api/
│       ├── analyze.ts
│       ├── extract.ts
│       └── fingerprint/
│           └── [id].ts
├── src/
│   ├── components/
│   │   ├── FingerprintCanvas/
│   │   ├── FingerprintObject/
│   │   ├── DecisionDNA/
│   │   ├── XRay/
│   │   ├── Compare/
│   │   ├── SourceInput/
│   │   └── Reveal/
│   ├── lib/
│   │   ├── jev.ts
│   │   ├── questions.ts
│   │   ├── fingerprint.ts
│   │   ├── entropy.ts
│   │   ├── seed.ts
│   │   ├── normalize.ts
│   │   └── schemas.ts
│   ├── fixtures/
│   ├── shaders/
│   ├── App.tsx
│   └── main.tsx
├── workers/
│   └── browser/
│       └── src/index.ts
├── public/
├── wrangler.jsonc
└── README.md
```

Adjust if the framework/template makes another structure substantially cleaner.

---

# 43. README

Write an excellent README explaining:

## What it is

JEVPRINT turns Jev's probabilistic decisions into deterministic generative art.

## Architecture

Diagram:

    Browser
       ↓
    Cloudflare Pages
       ↓
    Pages Functions
       ├── Browser Run → webpage state
       │
       └── AI Binding
              ↓
         AI Gateway
              ↓
         typesafe/jev

## Development

Include exact current commands.

## Cloudflare setup

Explain:

- Pages project
- AI binding named `AI`
- AI Gateway named `jevprint`
- Browser Run configuration if URL ingestion is enabled
- service binding if using a dedicated Browser Worker
- D1/R2 bindings if enabled
- local dev

## Design

Explain how Jev dimensions map to the visual form.

---

# 44. Implementation order

Build in this order:

### Phase 1
Beautiful local fingerprint visualizer using fixture Jev data.

### Phase 2
Decision → visual parameter mapping and X-RAY mode.

### Phase 3
Raw text → real `typesafe/jev` call through Cloudflare AI Gateway.

### Phase 4
URL extraction through Browser Run.

### Phase 5
Compare/morph mode.

### Phase 6
Persistence/share/gallery if time permits.

Do not build a database before the core visual experience is excellent.

---

# 45. Definition of "excellent"

Before considering this project finished, ask:

### Is the opening screenshot visually striking?
If not, keep designing.

### Can someone understand that Jev makes probabilistic decisions within 20 seconds?
If not, improve the reveal/X-RAY interaction.

### Does changing Jev probabilities visibly alter the object?
If not, the visualization is decorative rather than meaningful.

### Do two wildly different texts produce unmistakably different fingerprints?
If not, strengthen the mappings.

### Can I inspect WHY they differ?
If not, improve X-RAY.

### Is COMPARE fun enough that I immediately want to try two more URLs?
If not, improve morphing.

### Does it look like a creative technology experiment rather than an AI SaaS product?
If not, redesign it.

---

# 46. Final product principle

The entire project should communicate one idea without needing a long explanation:

    GENERATIVE MODELS SHOW YOU WHAT THEY SAY.

    JEVPRINT SHOWS YOU WHAT A MODEL DECIDES.

The probabilities are the art.

Build the site around that.
