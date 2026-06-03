---
id: video-models-routing
description: "Four-layer model routing hierarchy - HappyHorse (L1 fast pure-text preview/NSFW), Seedance Fast (L2 reference-capable fast visual anchor), Seedance (L3 production default), Kling (L4 precision single-frame/key-frame production and fallback). Covers routing decision tree, tool call mapping, per-model usage scenarios and capacity limits, fallback & degradation chains, and user-facing communication rules."
---

# Content

## I. Model Routing - Four-Layer System

Four models organized into a routing hierarchy. **script-skill determines the production model during script planning** - the model choice is written into the script handoff. Generation-skill executes accordingly and only overrides on degradation.

| Layer | Model | `provider` | `model` | Positioning | When to Use |
|-------|-------|-----------|---------|-------------|-------------|
| L1 Fast Preview | HappyHorse | `dashscope` | `happyhorse-1.0-t2v` | Fast & wild | Pure-text non-final preview without precision/reference needs; NSFW content; user explicitly wants speed |
| L2 Visual Anchor | Seedance Fast | `seedance` | `doubao-seedance-2-0-fast-260128` | Reference-capable & fast | Fast reference-to-video preview; quickly produce a near-final visual anchor for composition, motion, subject look, and style direction |
| L3 Production | Seedance | `seedance` | `doubao-seedance-2-0-260128` | Stable & long | Production default - text-driven, multimodal mixed, long narrative |
| L4 Precision Frame | Kling | `kling` | `kling-v3-omni` | Precise & controlled | Fine single-frame/key-frame production, readable in-frame text/UI, copyrighted IP, selective fallback |

### Tool Call Mapping (Definitive Reference)

Every `video_generate` call must use the exact `provider` + `model` + `mode` + `provider_param` key combination for the selected model. Mismatching any field (e.g., using `kling_reference2video` param key when the routing decision is Seedance) is a critical error.

| Model | `provider` | `model` | `mode` | `provider_param` key |
|-------|-----------|---------|--------|---------------------|
| Seedance | `seedance` | `doubao-seedance-2-0-260128` | `reference2video` | `seedance_reference2video` |
| Seedance Fast | `seedance` | `doubao-seedance-2-0-fast-260128` | `reference2video` | `seedance_reference2video` |
| Kling | `kling` | `kling-v3-omni` | `reference2video` | `kling_reference2video` |
| HappyHorse | `dashscope` | `happyhorse-1.0-t2v` | `text2video` | `dashscope_happyhorse_text2video` |

### Routing Decision Tree

**Step 1 - Copyright IP intercept (highest priority)**:
- Agent performs multimodal analysis on user-uploaded reference materials.
- **Copyrighted IP detected** -> **L4 Kling** (`kling` / `kling-v3-omni`).
- **Faces** (real human photos, illustration, anime, cartoon, AI-generated stylized characters): **L3 Seedance** accepts them directly via subject reference - pass the user's image into `image_list` unchanged. Do not pre-process the face into line art, do not mask or remove the face area, and do not auto-route to Kling on the basis of "real face" alone. Route to Kling only when copyrighted IP, readable in-frame text/UI, or micro-detail accuracy is the dominant requirement.
- **No face reference at all** (pure text human presenter request) -> **L3 Seedance** text-to-video - describe the presenter in the prompt; do not pre-generate a face image.

**Step 2 - Input type routing**:
- **Has reference materials** (images, video, audio):
  - Readable in-frame text, UI, KPI, or device screens usually favor **L4 Kling** (`kling` / `kling-v3-omni`)
  - Fine-detail edge cases may favor **L4 Kling** (`kling` / `kling-v3-omni`) when the goal depends on legible micro-details such as watch numerals, engraved jewelry text, small product labels, dense UI, or exact mechanical structure
  - In most other reference-based production cases, prefer **L3 Seedance** (`seedance` / `doubao-seedance-2-0-260128`) for production or **L2 Seedance Fast** (`seedance` / `doubao-seedance-2-0-fast-260128`) when the immediate need is a fast reference-based visual anchor
  - **HappyHorse text2video is eliminated** - fast pure-text models do not accept `image_list`/`video_list`/`audio_list`. Selecting a pure text route when references exist silently discards all user-uploaded materials. This applies to both production and preview.
- **Pure text** (no reference materials):
  - See HappyHorse vs Seedance routing below

**Closeup guidance**:
- Close framing alone is usually not enough to justify Kling.
- Seedance is the default for closeups across photoreal, stylized, anime, illustrated, and AI-generated subjects - including face closeups - unless text readability or micro-detail accuracy is the main goal.
- If a concept already previewed well on Seedance, production will often stay on Seedance unless a clear issue appears.
- Shots like hands placing a gear, a face looking up, or a product beauty closeup fit Seedance.

**Visual-anchor continuity**:
- A Seedance Fast visual anchor can be produced with references and is useful for quickly locking the near-final visual direction before full production.
- A Seedance Fast visual anchor will often lead to Seedance production.
- If production moves from Seedance Fast to Kling, the handoff should note a concrete reason such as precision single-frame/key-frame needs, copyrighted IP, readable in-frame text/UI, or a visible Seedance limitation.

**Step 3 - HappyHorse vs Seedance Fast routing (preview / visual anchor)**:
1. **Default preview anchor: Seedance Fast** - Seedance Fast is the default when the preview should respect references or serve as a near-final visual anchor. It uses `reference2video` and can carry images/videos/audios like Seedance.
2. **HappyHorse only when any of these conditions is met**:
   - **Non-final deliverable**: The result is a preview, direction validation, or iteration artifact - AND the scene does not require precise character/object consistency or multi-person interaction or precise limb actions.
   - **NSFW content**: Seedance's content moderation is stricter; route NSFW to HappyHorse.
3. **User intent overrides all**: User explicitly wants speed -> HappyHorse. User explicitly wants quality -> Seedance Fast. Regardless of other conditions.

### Model Fallback on Timeout

See Section III below for the complete fallback and degradation strategy.

## II. Model Usage Scenarios

### Seedance

Seedance is accessed through the unified **`video_generate`** MCP tool with `provider: "seedance"`, `mode: "reference2video"`.

**Tool call structure**:
```json
{
  "name": "<asset_name>",
  "provider": "seedance",
  "mode": "reference2video",
  "model": "doubao-seedance-2-0-260128",
  "provider_param": {
    "seedance_reference2video": {
      "prompt": "...",
      "image_list": [{"image_url": "https://..."}],
      "video_list": [{"video_url": "https://..."}],
      "audio_list": [{"audio_url": "https://..."}],
      "sound": "on",
      "aspect_ratio": "9:16",
      "duration": "10"
    }
  }
}
```

**`seedance_reference2video` parameters**:

| Parameter | Type | Required | Description & Constraints |
|-----------|------|----------|--------------------------|
| prompt | string | No | Text prompt. Chinese <=500 chars. Reference uploaded assets by position: `"image 1"`, `"video 2"`. Double-quoted text `""` is interpreted as dialogue for speech synthesis when `sound` is `"on"`. |
| image_list | array | No | Reference images. Each item: `{image_url: "https://..."}`. Max 9. |
| video_list | array | No | Reference videos. Each item: `{video_url: "https://..."}`. Max 3, each 2-15s, combined <=15s. |
| audio_list | array | No | Reference audios. Each item: `{audio_url: "https://..."}`. Max 3, each 2-15s. Cannot be the sole input - requires >=1 image or video. |
| sound | string | No | `"on"` (default) = generates voice, SFX, BGM from prompt + visuals. `"off"` = silent video. |
| aspect_ratio | string | **Yes** | `"16:9"`, `"9:16"`, or `"1:1"`. |
| duration | string | No | Source generation length in whole seconds `"4"` - `"15"`. This is not the final edit-window length. If a user timestamp beat is shorter than 4s, still send a legal Seedance source duration (usually `"4"`) and trim in assembly. Omit to let the model auto-select only when no exact provider duration is required. **If `audio_list` contains speech for lipsync / talking-head generation, do not force `duration` longer than the real speech audio. Prefer omitting `duration` unless the audio itself has already been edited to the exact target length.** |

**Top-level fields**: `model` must be `"doubao-seedance-2-0-260128"` (Seedance - production) or `"doubao-seedance-2-0-fast-260128"` (Seedance Fast - fast visual anchor / preview).

**Validation rules** (enforced by server):
- At least one of `prompt`, `image_list`, `video_list`, or `audio_list` must be present.
- `audio_list` cannot be the sole input - at least one image or video must also be provided.
- Total reference items across `image_list` + `video_list` + `audio_list` must not exceed 12.

**Key capabilities**:
- Multimodal mixed drive: up to 9 images + 3 videos + 3 audios in a single call
- Long narrative: up to 15s per call
- Audio co-generation with any reference combination (`sound: "on"`)
- Cross-shot consistency via `video_list` (pass previous sequence for continuation)
- Style migration from reference images/videos

**Key limitations**:
- Does not support copyrighted IP characters as reference. If the model rejects a copyrighted-IP input, auto-fallback to Kling (see Section III).
- Real human faces and other identity-bearing portraits are supported through subject reference - pass the user's image into `image_list` directly. Generating human characters via text-only prompt also remains fully supported.

**Audio behavior**:
- **Default `sound: "on"`** regardless of reference combination. Seedance generates audio (SFX, dialogue, atmosphere) synchronized with visuals.
- `sound: "off"` only when: (a) the sequence will be post-processed with precise audio control, or (b) the creative direction explicitly calls for silent video.
- Unlike Kling, Seedance does NOT force silent output when reference videos are present - audio co-generation works with any reference type.
- **Talking-head / lipsync timing rule**: When `audio_list` contains spoken audio that should drive visible mouth movement, that audio becomes the primary clock for the shot. Do **not** set a longer target `duration` just to create extra breathing room. If you need a pause after the line, either (a) bake the pause into the speech asset before generation, or (b) generate a separate visual-only tail shot.

### Kling

Kling (`kling` / `kling-v3-omni`) supports two fundamentally different usage scenarios. The distinction is about **intent**: are you creating something new, or modifying something that already exists?

#### Create Video

Generate new video content from a text prompt, optionally with reference images and/or a reference video.

**What can be referenced**:
- **Images**: Style, character, mood, product, scene references. Pass alongside the prompt to guide visual direction. Image capacity per call is defined in the tool schema. Use `<filename>` syntax in the prompt to reference materials.
- **Video**: Camera movement, motion dynamics, character appearance, composition, color palette. **Input video must be <=10s.** Kling references **only the video's visual elements** - it cannot reference or extract audio from the input video. Output is always silent when a reference video is present (sound must be off). Only 1 reference video per call. Output duration max 10s.

**Audio behavior**:
- **No reference video** -> sound on. SFX, dialogue, monologue, atmosphere can be co-generated.
- **Reference video present** -> **always silent** (sound off). This is a Kling API constraint, not a strategy choice.

**Typical use cases**:
- Generate a new video from text + reference images (most common L4 scenario).
- Continue a multi-sequence video by referencing the previous sequence's tail frame and video for visual continuity (serial continuation - always silent).
- Borrow camera movement or motion style from a reference video while creating new content.
- Precision single-frame/key-frame production, high-quality closeups where exact frame-level detail matters, fine-detail rendering, in-frame text rendering, copyrighted-IP fallback scenarios.

#### Edit Video

Modify an existing video - apply visual changes (re-skin, restyle) while preserving the original video's structure, timing, and motion.

**Key characteristics**:
- **Input video must be <=10s.**
- Original video's structure (cuts, motion, timing) is preserved.
- **Output duration = input video duration** - the duration parameter is ignored.
- **Output aspect ratio = input video aspect ratio.**
- **Sound must be off** - no new audio generation. Can choose to **preserve the original audio** from the input video.
- The prompt describes the **edit intent** (what to change, what style to apply) rather than a full storyboard.

#### Choosing Between Create and Edit

| Intent | Scenario | Why |
|--------|----------|-----|
| Generate new footage from scratch | Create | No existing video to build on |
| Continue from a previous sequence | Create (with reference video) | New content referencing previous visuals. Always silent. |
| Change visuals but keep structure/timing | Edit (base) | Preserve original motion, change appearance. Sound off. |
| Fix visual issues without re-generating | Edit (base) | Faster, can preserve original audio. No cascade. |

#### Key Capacity Limits

| Constraint | Limit |
|------------|-------|
| Input video duration | <=10s |
| Output duration - create video | 3-10s |
| Output duration - edit video | = input video duration |
| Reference images - no reference video | <=7 |
| Reference images - with reference video or edit | <=4 |
| Reference videos per call | 1 |
| Prompt length | 2500 characters |

### HappyHorse

HappyHorse (`dashscope` / `happyhorse-1.0-t2v`) - text-led generation for fast pure-text previews. L1 positioning - used for fast preview and NSFW content when there are no references.

**Tool call structure**:
```json
{
  "name": "<asset_name>",
  "provider": "dashscope",
  "mode": "text2video",
  "model": "happyhorse-1.0-t2v",
  "provider_param": {
    "dashscope_happyhorse_text2video": {
      "prompt": "...",
      "aspect_ratio": "9:16",
      "duration": "10"
    }
  }
}
```

**Strengths**: Fast generation, built-in audio, good for atmosphere/environment shots, simple single-person actions, mood pieces, NSFW content.

**Weaknesses**: Struggles with multi-person interactions, close-up faces without reference, readable UI/text elements, multiple camera changes within a single call.

**Usage**: Pure text-to-video only - **no `image_list`, `video_list`, or `audio_list` support**. When user-uploaded reference materials exist, HappyHorse must NOT be selected - choosing it silently discards all references. Use Seedance or Kling with `reference2video` mode instead.

**Audio**: Generated by the provider when available. Treat it as native clip audio and inspect before mixing with post VO/BGM.

**Prompt**: Single flowing narrative - mood, visual style, key moments, audio atmosphere. No material-reference syntax is available because this route is text-only.

## III. Fallback & Degradation Strategy

### Model Fallback Chain

**Seedance fails** (timeout, rejection, quality issue):
1. **Retry once** with adjusted parameters (shorter duration, simplified prompt).
2. If the failure is a **copyrighted-IP rejection** -> auto-route to **Kling** with the same references.
3. If the failure is a **general generation failure** -> try **Kling** as visual fallback.
4. If Kling also fails -> inform user, negotiate alternative.

**HARD RULE - Reference consistency must be preserved through every downgrade**:
When degrading from Seedance to Kling, **all user-uploaded reference images must be carried over to the Kling call**. Never drop a user reference to make the downgrade easier. If the user uploaded product images, environment refs, or style refs alongside a portrait, those must appear in the Kling `image_list` just as they would have in Seedance. Losing user references during degradation is a critical failure - it silently changes the visual brief without the user's knowledge.

**Kling fails** (timeout, quality issue):
1. **Retry once** with adjusted parameters.
2. For pure T2V (no references) -> fall back to **HappyHorse** for the failing segment only.
3. For reference-based -> retry Kling with simplified prompt. Do **not** fall back to HappyHorse text-only routes when references are present.

**Audio co-generation fails** (Seedance generates video but audio is missing/broken):
1. Retry with reference images only (drop reference video, extract key frames).
2. If still fails -> change strategy, inform user.
3. **Never fall back to post-production SFX or dialogue.**

### Audio Preservation During Degradation

When degrading from Seedance to Kling:
- **Kling with reference images (no reference video)** -> sound on -> audio preserved.
- **Kling with reference video** -> silent -> audio lost.
- If audio must be preserved and the degradation would require reference video -> prefer converting to parallel with reference images (extract key frames from video) to maintain sound-on capability.

### Reference Preservation During Degradation - HARD RULE

When converting from reference video to reference images during degradation:
1. **Always extract key frames from the reference video or use user's original images** - never use AI re-generation as substitute.
2. **User original images are the permanent visual truth** - no degradation, retry, or strategy change may discard them.
3. **Consistency > speed** - if consistency cannot be maintained during degradation, inform user and negotiate rather than silently degrading quality.

### Sequence Splitting on Degradation

When a Seedance sequence (up to 15s) must be degraded to Kling (max 10s):
- Split the sequence into 2+ Kling-compatible sequences (<=10s each).
- Distribute the narrative arc across the split sequences.
- Maintain reference image coverage in each sub-sequence.
- Prefer parallel for the split sequences (preserve audio co-gen).

### Mid-Production Strategy Changes

When a timeout or error forces a meaningful approach change:
- **Carry over all reference assets** - user's reference video/images must be preserved in the new approach. If reference video can no longer be used directly, extract key frames and include as reference images.
- **Inform the user** briefly in natural language - not technical terms.
- **Never silently drop user-provided reference assets.**

## IV. User-Facing Communication Rules

**Never expose internal production terminology to the user.** Internal-only terms:

- Sequence numbers (Sequence 1, Seq N)
- Generation modes (serial, parallel, hybrid)
- Technical audio terms (sound on/off, sound, post-assembly, SFX co-generation)
- Model names (Kling, HappyHorse, Seedance, Seedream)
- Pipeline terms (cascade, reference anchor, Subject Element Registry, degradation chain)
- Layer designations (L1, L2, L3, L4)

Use natural creative language: "working on the next scene", "putting together the full video", "adding music and finishing touches."
