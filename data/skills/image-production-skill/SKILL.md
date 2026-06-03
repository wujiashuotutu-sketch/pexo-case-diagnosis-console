---
name: image-production-skill
description: "Standalone still-image production for image, poster, key visual, cover, product image, character reference, storyboard panel, style frame, or image edit requests when the user has not explicitly asked for video, animation, audio, timeline editing, or a video platform format. Before any standalone image_generate call, read this skill and its image-generation reference first."
---

# Usage

This skill owns standalone still-image deliverables. It is not a thin wrapper around `image_generate`: it resolves image intent, organizes reference assets, chooses the right image route, performs prompt hygiene, generates the image, and checks the result before delivery.

Use this skill when the user's desired output is a still image or image edit. Do not enter video Format Gate, shot planning, `video_generate`, or assembly unless the user explicitly chooses a video deliverable.

**Hard stop before generation:** For standalone still-image work, read this `SKILL.md` and `references/image-generation-guide.md` before the first `image_generate` call. "Simple text-to-image prompt" is not an exemption: move quickly by skipping unnecessary questions and planning, not by skipping the image workflow and mandatory reference read.

**Input**:
- Text prompt for a still visual.
- Optional user-uploaded images, screenshots, brand assets, product photos, character references, masks, or layout references.
- Optional constraints: aspect ratio, style, platform, text content, number of variants.

**Output**:
- One or more generated or edited image assets.
- A concise user-facing note only when a meaningful limitation, assumption, or choice matters.

## Entry Intent Gate

Classify as `image_candidate` when the user provides a single visual scene, aesthetic concept, poster/KV idea, product image request, character image request, or asks to "show me", "make", "generate", "create", or "edit" an image-like output without explicit video signals.

Clear video signals include: `video`, `animation`, `animate`, `clip`, `reel`, `TikTok`, `Reels`, `Shorts`, duration in seconds, shot sequence, voiceover, music, SFX, subtitles, timeline editing, or an uploaded video to edit.

Motion-like image language is not enough to force video. Phrases such as "deer walking", "city slowly consumed by nature", "flowing fabric", or "dynamic pose" can describe a still image. If still vs video is genuinely ambiguous and the cost/credit impact is material, ask one focused question: whether the user wants a still image or a video.

## Task Families

Assign one primary family before choosing a route:

| Family | Use when |
|---|---|
| `text_to_image_scene` | A standalone scene, mood, tableau, environment, or concept from text. |
| `reference_edit` | The user wants an uploaded/generated image changed, restyled, cleaned up, extended, or corrected. |
| `product_visual` | Product hero image, ecommerce still, product-in-context, product beauty shot, packaging still. |
| `poster_kv` | Poster, key visual, cover, thumbnail, campaign graphic, social graphic, brand image. |
| `character_reference` | Character still, avatar, portrait, full-body reference, turnaround sheet. |
| `storyboard_panel` | One or more still panels or key frames for review. |
| `batch_variant` | Multiple options, style variants, campaign image sets, or iterative alternatives. |

## Blocking Clarification Rules

Default reasonably instead of interrogating:

- Number of images: one unless the user asks for options.
- Aspect ratio: infer from the deliverable when possible.
  - Cinematic landscape/tableau: `16:9`
  - Poster/social vertical: `9:16` or `3:4`
  - Avatar/product packshot: `1:1`
  - Uploaded image edit: match source ratio unless the user requests a new format.
- Style: infer from the prompt unless it is too vague for the task.

Ask only when the missing answer materially changes the output:

- A specific product/person/logo must be represented but no reference exists.
- Exact logo, UI, label, data, or text must be reproduced but the source asset or exact text is missing.
- The user request could reasonably be either still image or video.
- The user requests precise text/data that AI image rendering may distort.

## Reference Read Order

Always read `references/image-generation-guide.md` before any `image_generate` call.

Read `references/image-reference-intake.md` when the task uses uploaded assets, generated assets, multiple references, product/person/logo preservation, or image editing.

For text-heavy posters, UI, exact labels, charts, or brand graphics, apply the text rules in `references/image-generation-guide.md` first. If a future packaging/text reference exists locally, read it before generation.

Do not read video references for standalone image production.

## Core Workflow

1. **Classify intent**: confirm this is an image deliverable and assign a task family.
2. **Resolve blockers**: ask only for missing information that changes the final image materially.
3. **Organize references**: label every uploaded asset by role and identify which pixels are ground truth.
4. **Choose route**: use `references/image-generation-guide.md` to select provider/model/mode by failure cost.
5. **Prepare prompt**: keep prompt visual-only; put aspect ratio, size, and files in parameters, not prompt text.
6. **Generate/edit**: call `image_generate` with all required references in `files` and role-bind them in the prompt.
7. **QA**: check the returned image against the user's core intent and reference constraints.
8. **Retry only with a changed hypothesis**: revise route, references, parameters, or prompt based on the observed failure.

## Asset And Reference Rules

Use `references/image-reference-intake.md` for details. The short version:

- User-provided pixels are ground truth.
- Do not recreate a covered product, person, logo, package, UI, or text element from prompt-only description.
- Pass every required reference through the tool input; having seen an image in chat or analysis context is not enough.
- In multi-reference tasks, pass all required references in the same call and bind roles by order.
- Never silently drop a required reference because a provider path is inconvenient.

## QA Checklist

Before final delivery, check:

- **Intent**: the generated image satisfies the user's core scene, subject, and mood.
- **Reference fidelity**: required products, people, logos, UI, packaging, and layouts are preserved when provided.
- **Composition**: the main subject is clear and the frame is not cluttered.
- **Text**: required text is readable enough for its purpose, or the limitation is disclosed.
- **Aspect**: output matches the intended deliverable ratio.
- **Artifacts**: no obvious unwanted watermark, broken anatomy, malformed product, unreadable UI, or stray technical text.

## Handoff To Video

If the user later asks to animate, turn into a video, add music/voice/SFX, or make a clip/reel, hand off to the video pipeline. Treat the produced still image as a reference asset, not as permission to invent a new video brief.
