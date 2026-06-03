# Content

## Contents

- **I. Core Principle** - packaging = key-frame image, not prompt text
- **II. What Belongs Here** - which elements are Layer 1 key frames
- **III. Layer Split** - Layer 1 (AI generation) vs Layer 2 (post overlay)
- **IV. Quick Test** - decision test for classifying an element
- **V. Readable Text Rule** - exact glyphs must live in a reference image
- **VI. UI / PiP Rule** - product UI, dashboards, app screens as environment refs
- **VII. Forbidden Patterns** - prompt patterns that silently break text rendering
- **VIII. Correct Workflow** - step-by-step key frame composition
- **IX. In-Frame Packaging** - spatially integrated text in the scene
- **X. Reuse Rule** - same key frame across multiple sequences
- **XI. Prompt Pattern** - how to reference key frames in prompts
- **XII. Person + UI Same Shot** - handling people and UI in the same frame
- **XIII. Occlusion Problem** - text partially covered by subjects
- **XIV. Preferred Fix Order** - fallback strategy for occlusion
- **XV. Dual-Reference Workflow** - environment plate + composed layout
- **XVI. Accuracy Expectations** - what AI text rendering can and cannot do


## I. Core Principle

Anything that should appear as part of the generated shot itself, and whose text, layout, or screen content must be controlled, should be prepared as a key frame or screenshot reference first. Do not rely on the video model to typeset it from prompt text.

## II. What Belongs Here

This guide covers all **Layer 1 / in-frame** packaging-style elements, including:
- decorative typography
- logo compositions
- end cards inside the shot
- poster-style headlines
- card-style selling-point text
- tracked typography attached to the subject
- text emerging from behind the product or character
- posters, signs, certificates, labels, title boards
- LED walls, dashboards, app screens, product UI, device screens
- picture-in-picture-style screens that exist **inside the scene**

## III. Layer Split

### In-Frame / Environment Layer

Text or UI belongs to the generated shot itself and has a carrier, spatial position, or motion relationship inside the scene.

Examples:
- poster
- certificate
- sign
- LED wall
- product screen
- end card inside the shot
- poster-style or card-style packaging text integrated into the shot
- tracked or spatially attached packaging typography
- text emerging from behind the product or character
- floating packaging words in scene space

Use a reference image in `image_list`. The prompt describes the carrier, reveal, timing, or motion behavior.

### Post Layer

Text is added on top of the finished video as a graphic layer:
- lower thirds
- selling point bars
- data callouts
- corner bugs
- true post-production PiP compositing

This is not supported by the current editor.

## IV. Quick Test

- If you can answer "what object or spatial carrier in the scene is this text/UI on?" it is usually in-frame or environment-layer.
- If the answer is "we add it later on the timeline," it is post-layer.

## V. Readable Text Rule

If viewers must read exact words, numbers, company names, KPI values, UI labels, signs, labels, certificates, or title text in the frame, those glyphs must come from a reference image.

Do not ask the video model to draw them from prompt text.

## VI. UI / PiP Rule

### Two Different Things

- **In-scene screen**: the product UI appears as part of the generated world, such as a wall monitor, tablet, laptop, holographic panel, or inset screen inside the scene. This is supported.
- **Post-production PiP**: the final rendered video gets an extra UI box composited on top afterward. This is not supported by the current editor.

### Core UI Rule

When the UI must be visible, pass the exact screenshot or exported UI image in `image_list`. The prompt should describe only the **container** and appearance timing, not the UI's literal text and controls.

Good containers:
- `large LED wall`
- `monitor on the desk`
- `tablet in hand`
- `floating holographic panel`
- `small inset screen in the corner`

## VII. Forbidden Patterns

- Writing prompt text like `the screen shows "90%"`, `the words "XXX" appear`, or `success rate climbing to 92.8%` and expecting the model to typeset it.
- Writing UI prompts like `the screen shows XX data, YY buttons, and ZZ labels`.
- Providing only product photos or character refs while expecting the model to invent readable labels, dashboards, posters, or end cards.
- Re-describing the same text in multiple prompts instead of reusing the same text-bearing key frame.

## VIII. Correct Workflow

1. In the creative script, list every visible text element, number, brand mark, or UI copy that should appear in frame.
2. Mark each item as either:
   - `Layer 1`: in-frame / environment-layer key frame reference, or
   - `NOT SUPPORTED`: true post text overlay requirement.
3. For every supported element, prepare a key frame image or screenshot that already contains the final text/UI.
4. Put that asset in the sequence `image_list`.
5. In the video prompt, describe only how the reference appears: reveal, slide-in, hold, resolve, monitor display, poster in background, tracked label, end-card freeze, and so on.

## IX. In-Frame Packaging

Some packaging text looks like a "design layer," but operationally it still belongs inside the generated frame rather than in post.

Examples:
- poster-style headline typography
- card-like selling-point text inside the shot
- text emerging from behind the product
- text tracked to the subject
- text integrated with scene depth, perspective, or occlusion

If the text behaves like part of the shot rather than a simple flat post overlay, prepare it as a key frame reference first.

## X. Reuse Rule

If the same text-bearing object, packaging card, poster, label, or UI screen appears in multiple sequences, reuse the same key frame image across those sequences. Do not ask the model to redraw the same words from scratch each time.

## XI. Prompt Pattern

- Good: `image 4 is the final end card; the sequence settles into that composition.`
- Good: `image 2 appears on the monitor behind her as a static UI panel.`
- Good: `image 3 is a designed poster card in the background and remains readable throughout the shot.`
- Good: `image 5 emerges from behind the bottle as an in-scene packaging card.`
- Bad: `a bold "90%" appears on screen`
- Bad: `the dashboard shows 92.8% success rate`
- Bad: `the screen shows XX data, YY buttons, and ZZ labels`

## XII. Person + UI Same Shot

Use `image_list` to carry both:
- person / character reference
- product UI screenshot
- optional composed layout key frame if you need to lock the framing

## XIII. Occlusion Problem

When a person or prop blocks part of in-frame text or UI, the hidden region may not have enough visible guidance. When it becomes visible again, the model may invent or alter letters.

## XIV. Preferred Fix Order

1. Keep the text area unobstructed.
2. Use a pure environment/text plate with no person in it.
3. If a reveal is required, split the reveal into a new sequence where the text becomes fully visible.
4. Add prompt guardrails like `keep image 1 fully visible and unobstructed`, but treat this as a helper, not the primary solution.

## XV. Dual-Reference Workflow

Use two complementary images when the same shot needs both good composition and reliable text restoration:

1. **Pure environment plate**: background plus the full text/UI, with no person or foreground blocker.
2. **Composed layout frame**: optional frame with person placement and desired staging.

Prompt pattern:

`Image 1 is the full background layer including all text. The character may move in front of it briefly, but any visible or newly revealed area must match image 1 exactly.`

The pure plate is the source of truth for revealed areas. Without it, the model tends to hallucinate the covered text.

## XVI. Accuracy Expectations

- Decorative typography, logo compositions, stylized end cards, in-frame packaging, posters, labels, and UI screens can work as Layer 1 best-effort references.
- Precision-critical selling points, prices, website links, phone numbers, and exact data overlays remain unsupported until the editor supports true text compositing.
