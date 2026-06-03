---
id: video-generation-execution
description: "Audio co-generation strategy (co-gen first principle, per-model capabilities, sound-on prompt rules, voice source exclusivity, anti-doubling), single-call preference & multi-sequence planning (parallel vs serial, duration limits, reference completeness), prompt writing principles (material reference syntax, layer priority, model-specific tips), and BGM planning modes for upstream skills."
---

# Content

## I. Audio Strategy

### Core Principle: Co-Generation First

Audio co-generation (produced by the video model alongside visuals) is the **#1 priority**. Co-generated SFX and dialogue are perfectly synchronized with visual events, sound natural, and are far superior to post-assembly alternatives. **Do not use post-production audio for SFX or on-screen dialogue** - the quality gap is too large.

Post-assembly is reserved for **BGM** (multi-sequence continuity) and **off-screen voiceover/narration** (cross-sequence voice consistency via TTS).

### Audio Capabilities by Model

| Model | Audio with references? | Notes |
|-------|----------------------|-------|
| **Seedance** | Yes - `sound: "on"` works with any reference combination (images, video, audio) | Default ON. Audio co-gen is independent of reference type. |
| **Kling** | Only without reference video. Reference images + sound on = OK. Reference video = always silent. | API constraint. |
| **HappyHorse** | Provider-native audio when available (pure text only) | Text-only fast route; inspect returned audio before mixing. |

### Audio Type Handling

| Audio type | Single sequence (<=15s Seedance / <=10s Kling) final delivery | Multi-sequence (>15s) | Notes |
|------------|-------------------------------------------------------------|----------------------|-------|
| **SFX / atmosphere** | Co-generated (always) | Co-generated per sequence (always) | Never post-production. Highest-value co-gen asset. |
| **Dialogue / monologue** (on-screen) | Co-generated (always) | Co-generated per sequence (always, when in-sequence eligible) | Never post-production. Lip-sync and emotional match require co-gen. |
| **BGM** | Co-generated OK for final single delivery | Post-assembly via `music_generate` | Multi-sequence BGM must be continuous; per-sequence fragments create jarring cuts. |
| **Voiceover / narration** (off-screen) | Co-generated OK for final single delivery | Post-assembly TTS via `audio_produce` | Cross-sequence narration needs consistent voice via TTS. |

### In-Sequence Voice Eligibility (Multi-Sequence)

When a sequence has audio co-generation enabled, dialogue and monologue can be co-generated if the character's speaking **starts and ends within this single sequence**.

**Eligible - co-generate in prompt:**
- Character delivers a line that starts and finishes within the sequence.
- Two characters exchange dialogue, self-contained within the sequence.
- Character has an internal monologue moment that resolves within the sequence.

**Not eligible - handle in post:**
- The same character's speech continues across the sequence boundary.
- Voiceover/narration that spans multiple sequences.

**When in doubt**, co-generate for self-contained visible performance - with Seedance's audio quality, co-generated voice is usually preferable for one-off on-camera lines. The exception is when deterministic cross-sequence voice identity, exact supplied audio, or final master-audio preservation is critical. If the same perceived speaker appears as both visible speaker and off-screen narrator, use a shared TTS/reference-voice asset plan: pass visible speech through `audio_list` for lip sync and place off-screen narration from the same voice identity in assembly.

### Voice Intent Heuristics

Do not treat any user-facing speech label as a reliable routing command by itself. Decide from the imagined viewer experience:

- Ask who the audience will believe owns the words. If the visible subject is the communicative source, spoken explanation belongs in the generated performance even if the user described it with narration-like language.
- Ask whether the voice must be coupled to visible body timing, mouth movement, gesture, or direct-camera performance. If yes, separate post-produced narration is the wrong primary path unless the visible subject is explicitly silent.
- Ask whether the same perceived speaker continues across shots. If yes, preserve one voice identity before generation; visible lines use `audio_list`, off-screen lines use the matching post VO asset.
- Ask what role any supplied audio plays: exact final master, lip-sync driver, rhythm/mood driver, or voice identity reference. These roles require different prompt and assembly strategies.
- If the visuals are B-roll, product detail, diagrams, location footage, montage, or non-speaking action, off-screen narration is more likely.
- When both interpretations are plausible, prefer the path that preserves the harder-to-recover quality: mouth/body/voice synchronization for visible performance. TTS can be added later for true narration; post-produced TTS cannot repair a visible character who should have performed the line.

### Audio Degradation Chain (Preserving Co-Generation)

When a generation call fails to produce audio:

```
Seedance + reference video + sound: "on"
    down audio co-gen fails
Seedance + reference images only (extract key frames from video / use user originals) + sound: "on"
    down still fails
Change strategy - inform user of limitation, negotiate alternative approach
```

**Never degrade to post-production SFX or dialogue as a fallback.** The quality gap makes post-dubbed SFX and dialogue unacceptable as a standard path.

### Kling Audio Degradation

When a Kling serial sequence is silent (reference video forces it):

```
Kling serial (with reference video) -> silent output
    down prefer converting to
Kling parallel (with reference images extracted from video + user originals) -> sound on
    down if serial is narratively required and cannot be avoided
Accept silent output - inform user of limitation
```

**Reference preservation during audio degradation**: When converting from reference video to reference images, **always extract key frames from the reference video or use user's original images**. Never use AI re-generation to create substitute references. Never lose visual consistency.

### Voice Source Exclusivity

Each spoken line in the video must have **exactly one audio source** - either co-generated (embedded in the video), baked in via `audio_list` lipsync, or post-assembly TTS. Never more than one.

### Voice Identity Continuity

For recurring speakers, source exclusivity must be paired with identity continuity:

- If the same visible person/character speaks or narrates across multiple sequences, carry a single `voice_identity_id`.
- If that same identity has both visible speech and off-screen VO, do not mix open-ended co-generated speech with catalog TTS. Generate one master/per-line speech asset using the same `voice_id` or voice reference.
- Visible speech uses `audio_list_tts` so the video model bakes the shared voice into lip/body sync.
- Off-screen narration uses the matching post TTS/VO asset in assembly.
- For a self-contained single-shot visible line with no reused voice identity and no supplied audio requirement, direct co-generation with exact dialogue remains acceptable and often more natural.
- Only allow different timbres when the plan declares different narrative speakers, or explicitly accepts timbre mismatch.

Before any downstream VO or subtitle plan is finalized, assembly must inspect the generated media facts of each clip: whether embedded speech exists, what is being said, whether visible speaking is present, and whether burned-in subtitles already exist. Do not decide this from prompt intent alone when media inspection can verify it.

**Anti-Doubling Rule**: If at assembly time a video segment already contains embedded speech (from co-generation OR from `audio_list` lipsync), adding a separate TTS/VO track with the same lines is **blocked**. The mandatory AUDIO AUDIT step (assembly-skill Rule 1) must confirm each segment's `embedded_speech` status via ffprobe + `audio_produce(provider=elevenlabs, mode=speech2text, model=scribe_v2)` before building the edit spec. `video-editor__analyze_audio` is not speech recognition; it is only loudness/tempo metadata.

**`audio_list` lipsync rule**: When a video segment was generated with `audio_list` (TTS audio passed as reference for lipsync) + `sound: "on"`, the TTS audio is already baked into the video file. The video's audio stream IS the TTS. Do NOT add the same TTS file as a separate audio track during assembly - this creates exact audio doubling.

**`audio_list` sync-clock ownership rule**: When `audio_list` drives visible speaking, singing, lyrics, or music-video mouth movement, the returned video's embedded/native audio is the only verified clock for the generated mouth/body timing unless the provider explicitly guarantees exact source-waveform passthrough. Do NOT mute the returned video and reattach the original source/master audio as a cleanup or deduplication step. That swaps the audible clock away from the visual clock and can create lip drift even when both files are close in duration.

**Master-audio requirement rule**: If the user requires the exact uploaded song/voice recording to remain the final audible master, do not promise frame-accurate lipsync from ordinary Seedance `audio_list` output unless a waveform-preserving lip-sync path is available. Either (a) preserve the generated clip's native audio for exact sync, (b) disclose that keeping the master audio makes sync approximate, or (c) switch to a tool/path that guarantees the final waveform and mouth motion share the same clock.

**Audio role prompt rule**: The prompt must reflect the chosen role of the supplied audio. For lip-sync, describe the visible subject performing the supplied line/audio and avoid inviting unscripted speech. For rhythm/mood driving, describe visual motion reacting to the audio while avoiding visible mouth sync unless intended. For exact-master preservation, avoid implying guaranteed lip-sync unless a waveform-preserving route is available.

**Media-fact override rule**: If the plan says `voiceover_narration` but inspection shows the delivered clip already contains usable on-camera speech for the same line, STOP and resolve the conflict before assembly. Either keep the in-clip speech and drop the duplicate VO, or replace the shot / reroute the sequence. Do not stack both and hope mix settings will hide the problem.

**Mouth-motion/source mismatch rule**: A talking-head or presenter clip generated with visible speech carries visual speech timing even if its audio is later muted. Do not place a separate TTS/VO line over that mouth movement unless the clip was generated from that same speech asset via `audio_list`. If the visual mouth movement came from co-generated or wrong embedded speech, regenerate the clip with the correct line/source or use silent B-roll with explicit no-speech cues.

**Duration-lock rule for `audio_list` speech**: A speech-driven `audio_list` clip must keep a single timebase from generation through assembly. Do not generate an 8s talking-head clip from a 6.077s speech asset, then attach the original 6.077s audio in post. Either let Seedance infer timing from the speech asset, or first retime/re-cut the speech file to the intended final duration and use that same retimed file everywhere.

**Singing/music-video rule**: A vocal music track passed through `audio_list` for a visible singer is not just BGM; it is a lip-sync driver. Mark the segment as `audio_list_music` plus `visible_vocal_performance: true`, preserve embedded/native segment audio in assembly, and do not replace it with the master MP3 unless the user has explicitly accepted approximate mouth sync or a waveform-preserving route is used.

### Required Sequence Manifest

For multi-sequence production, every required sequence must be tracked from plan to final edit:

- script-skill defines the required sequence manifest
- generation-skill fills returned file path, actual duration, audio lineage, and status for each row
- assembly-skill compares the manifest to the edit spec before rendering

If a required sequence fails, final assembly is blocked until the same sequence is regenerated/fallback succeeds or the story is explicitly replanned. Never duplicate another successful segment to cover a failed segment, especially when the failed segment carries different spoken lines or talking-head mouth movement.

### Sound-On Prompt Rules

When audio co-generation is enabled, the prompt's audio direction varies by scenario:

- **Single sequence final delivery** -> dialogue, monologue, SFX, atmosphere in prompt. Music and narration may also be co-generated when this is the final output.
- **Multi-sequence** -> **SFX always** + **dialogue/monologue when in-sequence eligible**. Do not include music or narration - those are post-assembly.
- **Explicit music exclusion** (multi-sequence): Every sound-on prompt must include `"no background music, no musical score, no musical instruments - sound effects and ambient audio only"` when a separate BGM will be produced. Without this exclusion, the model frequently generates music-like audio that conflicts with post-assembly BGM. **Exception**: When `audio_list` is provided (music-first mode), do NOT include this exclusion - the `audio_list` audio IS the intended music, and the model should generate visuals reactive to it.
- **Explicit speech exclusion** (off-screen VO mode): When separate VO/TTS is planned for a sequence AND the video depicts a character who visibly speaks, gestures at camera, or presents (spokesperson / talking-head / presenter framing), every sound-on prompt must also include `"no speech, no dialogue, no voice, no spoken words"` alongside the music exclusion. Without this, the model co-generates speech for visible speaking characters, doubling with the planned VO. **Exception**: When the character's on-screen speech IS the intended audio (co-gen dialogue path or `audio_list` lipsync), do NOT include this exclusion.
- **Visible-speech exclusion block**: The explicit speech exclusion above is only valid for true off-screen VO or an explicitly approved silent-B-roll rewrite. If the original user request or voice declaration says this visible character should speak, explain, narrate, or talk to camera, speech exclusions are blocked. Use exact prompted dialogue or `audio_list_tts`; if a same-timbre VO asset is required, generate that asset first and pass it into the visible-speech `video_generate` call.
- **Dialogue language preservation**: Spoken text in the prompt is vocalized in whatever language it is written. If the creative script's dialogue is in Chinese, prompt speech lines **must remain in Chinese**. Descriptive/directorial text can be in English.

### Audio-Visual Coupled Requirements

Some requirements depend on visible action and audible output being correct **together** (mouth opening when speaking, action-dependent sound cues). These are **generation-level requirements** - do not downgrade them to post-audio replacement. Route them through audio co-generation paths.

## II. Single-Call Preference & Multi-Sequence Strategy

### Single-Call Preference

When total video duration fits within the model's single-call maximum (Seedance <=15s, Kling <=10s), **strongly prefer generating the entire video in one call**. Benefits: fewer API calls, naturally coherent audio (SFX + atmosphere in one stream), zero cross-segment consistency risk, no post-assembly overhead.

Multi-sequence splitting is allowed but should be a deliberate choice, not a default. Valid reasons to split within the model's max duration include: (a) the narrative contains truly independent scenes that would compete for prompt space, (b) one scene requires a different reference set than another, or (c) a specific segment needs isolated retry without re-generating the whole video. When none of these apply, use a single call at the model's max duration.

**Practical rule**: A 15s video on Seedance or a 10s video on Kling should default to one call. Use prompt-internal timing cues (`[0-5s]`, `[5-10s]`, `[10-15s]`) to structure narrative beats within a single prompt rather than splitting into separate API calls.

**VO-led exception**: Single-call preference is subordinate to voiceover fit. If the finished video will carry post-produced VO/narration, estimate whether the full spoken copy fits the target duration before generation. For English VO, a 15s target usually fits about 35-42 spoken words after pauses and emphasis; for Chinese, use ~3-4 characters/sec. If the VO is denser than the visual window, shorten the copy or change the duration/structure before generation. Do not hand an overlong VO to assembly and rely on `out_ms` trimming.

### Sequence Duration Limits (for multi-sequence videos)

| Model | Max duration per sequence |
|-------|-------------------------|
| Seedance | **<=15s** |
| Kling | **<=10s** |

**Planning principle**: Plan sequence durations based on the model selected by script-skill. When Seedance is selected, leverage up to 15s per sequence to reduce sequence count and cross-sequence consistency risk. Sequence duration is driven by narrative rhythm, not a fixed default - let the story determine natural break points within the model's limit.

**Timeline vs source duration**: User timestamp rows define the final edit window, not necessarily `video_generate.duration`. For every sequence, keep `final_timeline_duration_ms` separate from `source_generation_duration_s`. Provider constraints override scripted sub-shot timing: a 2.2s final beat on Seedance must be generated as a legal 4s source clip and trimmed in assembly, not sent as `duration:"2"` or `duration:"3"`.

### Parallel vs. Serial Generation

**Parallel is the default strategy.** The primary advantage is **speed** (concurrent generation). Serial is reserved for scenes where frame-level visual continuity is essential.

**Decision criteria**: Narrative continuity + speed. Audio is **not** a factor - Seedance supports audio co-generation in serial continuation, eliminating the audio penalty that previously favored parallel.

**Parallel generation** (default): All sequences generated independently from shared reference materials.
- Every sequence uses the same reference images (character sheets, style refs, key frames).
- Seedance: `sound: "on"` on every sequence.
- Kling: sound on (no reference video -> sound on).
- Pros: fast (concurrent), every sequence gets co-generated audio.
- Cons: relies on reference images for visual consistency - prepare strong references before generation.

**Serial continuation** (only when required): Each sequence depends on the previous one's visual output.
- Seedance serial: Pass previous sequence as `video_list`, `sound: "on"`. Up to 15s per continuation. **Audio is preserved** - serial no longer sacrifices co-generated sound.
- Kling serial: Pass previous sequence as reference video. **Always silent** (Kling constraint). If audio must be preserved, prefer converting to parallel with extracted key frames.
- Pros: strong visual continuity through frame-level inheritance.
- Cons: slow (sequential), modification triggers cascade re-generation.

**When to use serial** - only when sequences depict:
- **Continuous unbroken action** within the same scene (dance routine, parkour run, single camera orbit).
- **Same-scene narrative continuity** where camera, characters, and environment must match frame-to-frame.

**When to use parallel** - everything else (the vast majority):
- Scene changes, montage, different time/location, product showcases.
- Even same-character across sequences - parallel with shared references is sufficient when there is a scene change.

**User intent overrides action type**: When the user explicitly requests rapid editing, montage-style pacing, or multi-angle coverage, use **parallel regardless of action type**.

**Hybrid**: Serial for continuous-action blocks, parallel for the rest. Maximize parallel sequences for speed.

### Parallel Prerequisite - Reference Completeness Check

Before generating in parallel, verify that every subject element appearing across multiple sequences has a concrete visual reference. Specifically check:
- **Characters**: Recurring characters must have dedicated `character_ref` images.
- **Style**: A `style_ref` must exist for every sequence.
- **Product**: Recurring products must have `product_ref` images.
- **Style is not subject coverage**: `style_ref` only counts for look - it does not count as character, environment, or interaction coverage.

If any cross-sequence element lacks a visual reference -> generate the missing reference first, then proceed in parallel. Only fall back to serial as a last resort.

### Modification Strategy

- **Parallel videos**: Modifying Sequence N -> re-generate only Sequence N. No cascade.
- **Serial videos**: Modifying Sequence N -> cascade re-generation of N and all subsequent sequences. Truncate cascade at scene-change boundaries if possible.
- **Visual-only fixes** (restyle, re-skin): Use **edit video** - faster, can preserve original audio, no cascade.
- **Audio preservation on re-assembly**: Co-generated audio in unchanged sequences must be preserved (video clip volume = 1.0). See assembly-skill SKILL.md Rule 4 (volume rules).

## III. Prompt Writing Principles

### Material Reference Syntax

| Model | Syntax | Example |
|-------|--------|---------|
| Seedance | Positional: `"image 1"`, `"video 2"` | `"use image 1 as the main subject reference"` |
| Kling | `<filename>` | `"<portrait.png> provides character reference"` |
| HappyHorse | none | Text-only route; do not attach references. |

**Agent responsibility**: Name all reference materials meaningfully at upload time (e.g., `portrait.png`, `style-ref.jpg`, `product-front.png`). Every material must be explicitly referenced in the prompt with its role declared - no orphan references.

### Dialogue and Text

All models: Dialogue, spoken lines, and in-frame text content must be wrapped in double quotes `""` in the prompt to clearly indicate reference relationships. Example: `"the character says: 'Hello, welcome back.'"`. 

### Subject Attribute Descriptions

Every referenced subject must include attribute descriptions in the prompt - particularly **proportion and scale in frame** (wide shot / medium shot / close-up), size relative to other subjects, and spatial relationships. This maintains cross-sequence size consistency and prevents the model from arbitrarily scaling subjects.

Example: `"@product.png is a palm-sized skincare bottle, shown in medium shot held naturally in one hand - maintain realistic product-to-character proportions"`

### Prompt Character Limits

| Model | Max Characters |
|-------|---------------|
| Seedance | ~500 (Chinese) |
| Kling | 2500 |
| HappyHorse | ~2000 |

**Practical guidelines**: Keep prompts concise. Prioritize information the model cannot infer from reference images (motion, timing, narrative progression) over information it can extract from references (product appearance, character look).

### Required Prompt Layers (Priority Order)

Every prompt must address these layers, highest priority first when space is tight:

1. **Reference material mapping** - Declare which references are used and what role each plays. Use the model-appropriate syntax (positional `"image 1"` for Seedance, no material-reference syntax for HappyHorse, `<filename>` for Kling). Declare the element being referenced and its role (product_ref, character_ref, style_ref, etc.).

2. **Subject motion & action logic** - Physical specificity: "fingers slowly trace the bag's stitching" not "model interacts with product."

3. **Camera movement & shot type** - Shot type per beat (close-up, medium, wide), camera movement (static, push-in, pan, orbit), and transitions within the sequence.

4. **Timing cues** - Shot-by-shot pacing: `[0-5s]`, `[5-10s]`, `[10-15s]` or `[Shot 1 - 5s]`. Budget time intentionally: key beats get more time, transitions get less.
   - Timing cues inside prompts are creative pacing instructions. They do not override provider `duration` constraints. If a cue is shorter than the selected provider's minimum source duration, generate a legal source clip and hand off the final trim window to assembly.
   - **VO/text coverage**: Budget shot >= spoken/read duration + 0.5-1s slack (~3-4 Chinese chars/sec, ~2.5-3 English words/sec). For English product explainers, a 15s VO should normally stay around 35-42 words after accounting for pauses and emphasis.
   - **VO fit gate**: If the planned VO cannot fit the intended visual window, rewrite the copy or revise the visual timing before generation. Trimming the generated VO tail in assembly is not a valid timing solution.

5. **Atmosphere & lighting** - Light quality, time of day, shadow behavior, atmospheric elements. If a style reference image covers this, point to it instead of re-describing.

6. **Color & visual style** - Palette, texture/grade. If covered by a style reference, point to it.

7. **Packaging, typography, and environment text** - All produced via key frame reference images. Reference the text-bearing key frame in the prompt. **Never write literal text in the prompt expecting the model to render it** - always point to a pre-rendered key frame.

8. **Audio direction** (when audio co-gen is enabled):
   - **Single sequence final delivery** -> dialogue/monologue + SFX + optional music/narration.
   - **Multi-sequence** -> SFX always + eligible in-sequence dialogue/monologue. Explicitly exclude music: `"no background music - sound effects and ambient audio only"`.
   - **Silent calls** -> omit audio direction entirely.

### Seedance-Specific Prompt Tips

- **Positional reference binding is mandatory** - every reference material must be bound with positional syntax (`"image 1"`, `"video 2"`, etc.) in the prompt. The number corresponds to the item's position in its respective list (`image_list`, `video_list`).
- **Describe subject proportion in frame** (wide shot / medium shot / close-up) to prevent the model from over-enlarging reference subjects.
- **Continuation prompts**: When using `video_list` for serial continuation, reference the previous video (`"video 1"`) and describe how the story and visuals continue. Music description can be relaxed - the model will naturally extend or transition the musical atmosphere.
- **Audio in dialogue**: Place all spoken content in double quotes `""`. The model vocalizes quoted text.

### Kling-Specific Prompt Tips

- **`<filename>` binding** - reference materials use angle bracket syntax.
- **Free-form storyboard text** - Kling handles intelligent scene-splitting. No JSON or structured arrays needed.
- **One prompt = one sequence**, max 10s. Each prompt describes a complete narrative micro-unit.

### Reference-First Economy (Universal)

- When a reference asset covers an element -> **declare the mapping and role only**. Do not re-describe visual content visible in the reference.
- When no reference asset exists -> describe the element in full text detail.
- **Never blend both** for the same element - if it has a reference image, the image wins; text adds only action, motion, and behavior.

### Subject Consistency Across Sequences

Subject consistency is achieved through **reference images, not prompt verbosity**.

- **Reference images are the anchor**: Pass the same reference image(s) to **every sequence** that features the element.
- **Anti-over-description**: When a reference image is present, describe only motion, action, and behavior - not static visual attributes (shape, color, texture, features). The model sees these directly in the image.
- **User-provided images are ground truth**: Never AI-regenerate a user-uploaded image. Use it directly.
- **Product scale anchoring**: When the product appears alongside people, include a realistic scale statement.

### Negative Constraints (All Models)

When generating characters with clothing/accessories or scenes with everyday items: **"no visible brand logos, no trademark symbols, plain unbranded clothing and items"**. Re-generate if brand logos appear.

### First-Frame and Last-Frame Behavior via Prompt

No dedicated API field for frame anchoring. Use prompt descriptions:
- **First-frame anchor**: Upload the desired starting image as reference, describe it as the opening scene.
- **Last-frame anchor**: Upload the desired ending image, describe the video ending at that image.
- **Transition**: Upload both, describe the journey from one to the other.

## IV. BGM Planning & Multi-Segment SFX Coherence

These planning-side rules are extracted from the assembly domain for upstream reference. For full assembly execution rules (volume hard gate, pre-assembly checklist, mixing tables), see assembly-skill SKILL.md.

### BGM Generation Timing Strategy

### BGM Generation Timing Strategy

Three modes - determine before starting any generation:

| Mode | When | Flow |
|------|------|------|
| **Video-first** | Multi-sequence narrative where music must complement actual footage (default >15s) | Generate all video -> analyze visual rhythm -> write BGM prompt -> generate BGM |
| **Music-first** | User provides music / brief designs narrative around musical arc | Generate/analyze audio first -> inspect coarse audio traits -> generate video informed by rhythm |
| **Independent** | Ambient BGM with no expected sync to visual beats | Generate BGM and video in parallel |

**Video-first workflow**: Complete all video generation -> analyze assembled footage (scene transitions, emotional arc, pacing) -> write `composition_plan` with per-section durations matching actual video structure -> generate BGM with exact matching duration.

**Music-first workflow**: Inspect the audio first, then let the audio reference itself drive generation. Current `video-editor__analyze_audio` is only a coarse preflight tool (duration / BPM / loudness), not a beat-grid or segment detector. **Seedance implementation**: Pass the user's audio file via `audio_list` in each `video_generate` call.

If the music-first workflow includes visible singing, record the audio clock decision before generation:

- `sync_clock_source: embedded_generated_video_audio` for exact mouth sync to the returned clip.
- `source_audio_asset: <uploaded or cut audio asset>` for lineage.
- `native_audio_must_be_preserved: true`.
- `do_not_replace_with_master_audio: true`.

If the user requires the exact original master track in the final export, block and clarify the tradeoff before producing a lip-sync preview. Do not silently generate against one clock and assemble against another.

### Multi-Segment SFX Coherence

### Multi-Segment SFX Coherence

When multiple segments are generated with audio in parallel, each independently produces its own SFX. Prevention at prompt-time:

1. **Unified ambient base**: Define a shared ambient foundation in every segment's audio direction.
2. **SFX arc, not randomness**: Plan SFX progression across segments as a designed story.
3. **Cross-reference**: When writing segment N's prompt, reference what came before.
4. **Shared vocabulary**: Use consistent descriptive language for the ambient base.
