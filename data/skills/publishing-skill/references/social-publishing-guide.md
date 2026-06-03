# Social Publishing Guide

## Contents

- **1. Common Output Shape** - standard deliverable structure
- **2. Platform Defaults** - per-platform format and spec defaults
- **3. Cover Heuristics** - cover image selection logic
- **4. Platform-Specific Cover Design Axis** - cover optimization by platform
- **5. Copy Heuristics** - title, caption, CTA, and tags generation
- **6. Guardrails** - content safety and brand compliance rules


## 1. Common Output Shape

For most short-video surfaces, package the result into:
- `cover_direction`
- `cover_text`
- `title_or_opening_line`
- `caption_short`
- `caption_standard`
- `cta`
- `hashtags`

Keep the package modular so it can be trimmed by the caller.

## 2. Platform Defaults

### Douyin
- Hook first, payoff fast
- Stronger directness is acceptable
- Cover text should be compact and instantly legible
- Good for transformation, practical advice, strong claims, emotional punch
- Cover design:
  - Prioritize high-conflict or high-payoff frames
  - Larger text, fewer words, stronger contrast
  - Cover should feel scroll-stopping before it feels polished

### TikTok
- Similar to Douyin, but often slightly more conversational
- Optimize for "would I stop scrolling?" rather than polished brand prose
- CTA should feel light unless it is a clear ad unit
- Cover design:
  - Keep the image readable on a fast-moving feed
  - Use a single focal point and a simple text hook
  - Slightly less salesy than Douyin by default unless performance content is proven

### Xiaohongshu
- More note-like and takeaway-driven
- Strong formats: lessons learned, checklist, honest review, method summary
- Cover can be more information-dense than Douyin/TikTok, but still needs one dominant idea
- Cover design:
  - Can support denser information and clearer "note" structure
  - Often benefits from cleaner composition, softer tone, and practical framing
  - Strong choices: checklist feel, before-after summary, method/result card

### Instagram Reels
- Cleaner, more lifestyle-oriented packaging
- Less aggressive clickbait unless the account already uses it
- Copy can be shorter and more aesthetic, but still needs a concrete point
- Cover design:
  - Prioritize aesthetic coherence and brand feel
  - Less text, more image quality and mood
  - Cover should look intentional on the profile grid, not only in feed

### YouTube Shorts
- Opening line can be more explicit and searchable
- Clear nouns and topic phrases help more than vague mood language
- Good for demonstrations, explainers, comparisons, and "how it works"
- Cover design:
  - More tolerant of explicit topic-led framing
  - Cover can be slightly more explanatory if the topic benefits from clarity
  - Strong choices: clear subject, demonstrable result, obvious comparison

## 3. Cover Heuristics

Select or describe a cover that maximizes one of these:
- strongest emotional face
- strongest product read
- moment of action peak
- striking contrast
- strongest "what is happening?" frame

Then make the cover text answer one of these:
- What result do I get?
- What mistake is being revealed?
- What surprising truth is inside?
- Why should I care now?

## 4. Platform-Specific Cover Design Axis

When adapting a cover, decide these axes per platform instead of reusing one generic recommendation:
- `visual_priority`: face / product / action / information
- `crop_strategy`: tight / medium / spacious
- `text_density`: none / low / medium / high
- `tone`: urgent / conversational / editorial / lifestyle / tutorial
- `layout_feel`: bold-hook / clean-brand / note-card / proof-led

Default tendencies:
- Douyin: `action or payoff`, `tight`, `low`, `urgent`, `bold-hook`
- TikTok: `action or personality`, `tight-medium`, `low`, `conversational`, `bold-hook`
- Xiaohongshu: `information or result`, `medium`, `medium-high`, `editorial/tutorial`, `note-card`
- Reels: `mood or product beauty`, `medium-spacious`, `none-low`, `lifestyle`, `clean-brand`
- Shorts: `topic clarity or proof`, `medium`, `low-medium`, `tutorial`, `proof-led`

## 5. Copy Heuristics

### High-conversion
- Open with a result or pain point
- Add one concrete proof point
- End with a direct CTA

### High-engagement
- Open with tension, confession, or disagreement
- Leave some room for the comment section
- CTA asks for opinion or experience

### Brand / awareness
- Open with the signature angle or value
- Keep the copy cleaner and less noisy
- CTA can be soft: remember, discover, follow, explore

## 6. Guardrails

- Avoid saying what the video does not visibly support
- Avoid overstuffed hashtags
- Avoid writing the same sentence into cover, title, and caption
- Avoid making every package sound like generic ad copy
- Avoid one-size-fits-all cover recommendations when the publish platform is known
