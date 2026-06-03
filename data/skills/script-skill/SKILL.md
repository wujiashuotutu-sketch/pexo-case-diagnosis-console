---
name: script-skill
description: "Sequence-level production design - break a creative script into executable shot sequences with complete visual, audio, editing, and effects design. Handles shot composition, camera language, SFX/dialogue/VO/music planning, visual packaging, and production model routing. Use when creative direction is locked (from brainstorm-skill or user brief) and needs to be translated into a production-ready shot list with per-sequence timing, model routing, and audio design."
---

# Usage

**Input**: A creative script from brainstorm-skill - narrative arc, key beats, emotional shape, audio direction, visual style notes, plus user-uploaded reference assets and format preferences.

**Output**: A production-ready **sequence breakdown** with per-shot design covering visuals, audio, editing rhythm, packaging, asset mapping, and model routing - carried forward as internal context for subject-asset-skill and generation-skill. This is the definitive execution plan: generation-skill follows it, not re-invents it.

## Required Planning Output

Before downstream production begins, produce a production-ready structured plan containing:

- `constraint_summary`
- `shot_strategy`
- `duration_budget`
- `sequence_breakdown`
- `required_sequence_manifest`
- `audio_strategy`
- `voice_source_declaration`
- `text_layer_declaration`
- `consistency_strategy`
- `fallback_strategy`

Definitions:

- `constraint_summary`: separate **hard constraints**, **soft preferences**, and **negotiable details**.
- `shot_strategy`: define how the final viewing experience is organized visually, including whether the piece is executed as a single generation, segmented continuation, or another valid production path.
- `duration_budget`: define the target duration, tolerance, per-sequence visual windows, spoken-line estimated duration, uncertainty/risk level, and approved overflow response. This is mandatory whenever post-produced VO/TTS or user-provided audio is part of the plan.
- `sequence_breakdown`: the binding ordered shot list. For every sequence and every internal shot beat, specify timing, frame content, main subject, subject action, camera/composition, references, audio treatment, and exact speech/VO ownership. This is mandatory even for simple videos; downstream skills must not invent missing shot or audio details.
- `required_sequence_manifest`: one row per required sequence with `sequence_id`, required narrative content, expected spoken line IDs, planned duration, replacement policy, and whether the sequence is skippable. Default: every narrative sequence is required and non-substitutable.
- `audio_strategy`: define how dialogue, narration, ambience, and music are handled, including whether audio is co-generated, post-produced, or mixed.
- `voice_source_declaration`: one row per spoken line, assigning exactly one source (`co_gen_dialogue`, `audio_list_tts`, or `post_tts_vo`), the speaker/voice identity, and the assembly guard for that line.
- `text_layer_declaration`: one row per readable text element, assigning exactly one owner (`timed_subtitle_artifact`, `ass_post_overlay`, `layer1_keyframe`, `unsupported`, or `forbidden_in_video_prompt`) plus language/script, time window, sequence, and collision policy. This includes VO captions, dialogue captions, screen packaging text, brand marks, signs, UI labels, title cards, and any text the user expects to see or read.
- `consistency_strategy`: define how identity, style, lighting, color, costume/material state, and cross-sequence continuity are maintained.
- `fallback_strategy`: define what degraded path is acceptable if model or tool limits prevent the ideal execution path.

If target duration exceeds the single-generation limit of the selected model, segmented generation is allowed. In that case, explicitly define how continuity will be preserved across segments rather than assuming downstream skills will infer it.

**Abbreviated path (not a full skip):** When the user already provides a shot-by-shot brief with timing, reference mapping, and audio direction, you may **compress** Steps 2-5 but must still emit the **Required Planning Output** (§ above) and run **Step 6b / 6c** whenever cross-segment continuity or frame-chain intent applies (see below). Do **not** route to generation-skill with only the user's prose brief.

**CRITICAL - Continuity pack is not optional when intent matches:** A "complete" user brief does **not** replace `parallel_continuity_activation`, `junction_link_mode`, or `frame_chain_plan`. If the user (or brainstorm handoff) signals seamless joins, cinematic/storyboard control, or explicit open/end frames across **>=2 segments**, you **must** complete Step 6b and Step 6c (when criteria match) even when the shot list is already written. Downstream generation-skill **blocks** multi-segment parallel video without these fields.

**CRITICAL - This skill is not optional for execution planning**: When brainstorm-skill confirms a direction, complete at least the Required Planning Output + continuity/frame-chain blocks before generation. Skipping entirely causes generation-skill to improvise structure, miss reference gaps, and skip pre-planned junction stills.

---

# Core Workflow

## Step 1 - Production Model Routing (four-layer system)

Determine the production model based on user assets and creative requirements. This decision constrains all downstream planning (sequence duration, audio co-generation, prompt limits). The routing must land on a concrete production choice.

### Routing Decision Tree

Analyze user assets via multimodal analysis for copyrighted IP and reference precision needs:

| Layer | Model | Provider/Param | When |
|-------|-------|----------------|------|
| **L1** | Grok | `fal` / `fal_grok_text2video` | Non-final pure T2V without precision/reference needs, NSFW, or speed-priority. **Never valid when user-uploaded reference materials exist.** |
| **L2** | Seedance Fast | `seedance` / `seedance_reference2video` | Reference-capable fast visual anchor; quickly creates a near-final composition/motion/style anchor for the final film |
| **L3** | Seedance | `seedance` / `seedance_reference2video` | **Production default** - text-driven, multimodal mixed, long narrative |
| **L4** | Kling | `kling` / `kling_reference2video` | Precision single-frame/key-frame production, copyrighted IP, readable in-frame text/UI, or selective micro-detail |

### Routing Rules

- **Default is Seedance** for nearly all reference-based and text-only cases (including real human face photos via subject reference).
- **Grok exclusion**: Grok only supports `text2video` with no `image_list`/`video_list`/`audio_list`. Selecting Grok discards all user references. Only available for pure-text input.
- **Face handling**: Seedance accepts faces (real human photos, illustration, anime, cartoon, AI-generated stylized characters) directly via subject reference. Pass the user's image into `image_list` unchanged. Do not pre-process faces into line art, do not mask or remove the face area, and do not auto-route to Kling on the basis of "real face" alone.
- **Seedance Fast visual anchor**: Seedance Fast can use references to quickly produce a near-final visual anchor for composition, motion, subject look, and style. If that anchor works well, production will often stay on Seedance. Tighter framing alone is not a strong reason to move to Kling.
- **Closeup guidance**: Hand closeups, face closeups, beauty shots, and tight crops fit Seedance across all visual styles. Kling is more suitable when readable text/UI or micro-detail accuracy becomes central.
- **15s planning bias**: For character videos with reference images and total target duration <=15s, a single Seedance production call is often the best starting point.
- **Kling rationale**: If the handoff selects Kling, note a concrete reason such as `precision single-frame/key-frame production`, `copyrighted IP`, `readable text/UI`, or `micro-detail edge case`. Avoid vague reasons like `closeup`, `real face`, `higher precision`, or `better quality`.
- **User intent overrides**: User explicitly wants speed -> Grok. User explicitly wants quality -> Seedance.
- **Model affects sequence planning**: Seedance allows <=15s per sequence; Kling allows <=10s; Grok allows <=10s. The model choice must be locked before sequence breakdown begins.

### Pre-call Model Verification (binding for generation-skill)

The routing decision must specify all four fields consistently:

| Routing decision | `provider` | `model` | `mode` | `provider_param` key |
|-----------------|-----------|---------|--------|---------------------|
| Seedance | `seedance` | `doubao-seedance-2-0-260128` | `reference2video` | `seedance_reference2video` |
| Seedance Fast | `seedance` | `doubao-seedance-2-0-fast-260128` | `reference2video` | `seedance_reference2video` |
| Kling | `kling` | `kling-v3-omni` | `reference2video` | `kling_reference2video` |
| Grok | `fal` | `xai/grok-imagine-video/text-to-video` | `text2video` | `fal_grok_text2video` |

## Step 2 - Sequence Planning

Break the creative script into executable sequences. Each sequence is a self-contained narrative unit that maps to one generation call.

1. **Set sequence boundaries** - duration per sequence depends on the model: Seedance <=15s, Kling <=10s, Grok <=10s. Let the narrative arc's natural break points drive where sequences split, not a fixed formula.

2. **Single-call preference**: When total video duration fits within one call (Seedance <=15s, Kling <=10s), prefer a single sequence - use prompt-internal timing cues (`[0-5s]`, `[5-10s]`, etc.) to structure beats within a single prompt. Splitting is allowed when there is a clear creative reason (independent scenes, different reference sets, isolated retry needs), but unnecessary splitting wastes API calls, introduces cross-segment consistency risk, and forces post-assembly overhead. For multi-sequence videos, leverage Seedance's 15s cap to reduce sequence count. **VO-led exception**: If the video will use post-produced voiceover/narration, the single-call plan is valid only when the estimated VO read time plus 0.5-1s slack fits inside the target duration. If the VO does not fit, shorten the narration during script planning or allocate a longer visual structure before generation; do not rely on assembly to trim narration later.

3. **Duration budget and audio uncertainty gate**: Post-produced audio duration is not known until the actual asset exists. Estimates are planning aids, not delivery facts. Before generation, create a compact `duration_budget`:
   - `target_total_ms` and whether it is hard, soft, or user-unspecified
   - per-sequence planned visual window and minimum acceptable window
   - each VO/dialogue/audio line's estimated duration, word/character count, and slack
   - `audio_duration_risk`: `low`, `medium`, or `high`
   - approved overflow response: `shorten_vo_and_regenerate`, `generate_more_visual_beats`, `extend_total_duration_with_user_acceptance`, or `ask_user`

   Mark risk `high` when the copy is dense, the target duration is hard, the estimate has less than 15% slack, the line contains dramatic pauses/emphasis markers, or the requested pacing is fast. For high-risk post-TTS plans, either produce/probe VO before committing final video generation, or design extra modular visual beats that can be added without slowing the existing footage. Do not plan a strategy that depends on large playback-speed changes after assembly.

4. **Plan production strategy**:
   - **Parallel** (default) - all sequences generated independently from shared references. Faster, every sequence gets audio co-generation.
   - **Serial** - only when sequences depict continuous unbroken action in the same scene requiring frame-level visual continuity.
   - **Hybrid** - serial for continuous-action blocks, parallel for the rest.
   - **Continuous-action override**: When adjacent sequences depict a **single character's unbroken motion arc** - no scene change, no time skip - those sequences **must be recommended as serial**, regardless of reference coverage. Independent scenes can be parallel.
   - Audio is **not** a factor - Seedance supports audio co-generation in serial continuation.
   - Decide before any generation. State the choice and reasoning.

5. **Mandatory sequence breakdown table**: Before any image, video, audio, or music generation, output an internal detailed sequence plan. Each sequence must include:
   - `sequence_id` and duration
   - `narrative_role` - what this sequence contributes to the story
   - `visual_beats` - one or more shot beats with `[start-end]`, framing, camera movement, subject position/action, background/environment, and intended viewer takeaway. **Montage sequences** (fast multi-beat, battle/sports/cutdown, parallel lines): add one line per beat — why we cut here (`action_match` / `cause_effect` / `match_cut` / `rhythmic_beat` / `saturation_point`). See `references/editing-rhythm-design.md` §6. Skip for single talking-head, slow hero, or unbroken serial action.
   - `main_subjects` - visible character/product/environment subjects and which reference anchors each one
   - `subject_identity_continuity` - whether a character/product persists from earlier/later sequences, which visual references must be reused, and which attributes must remain stable (face, age, hairstyle, clothing, body type, props)
   - `audio_beats` - ambience, SFX, music role, and speech state for each beat
   - `speech_plan` - exact spoken text if any, spoken language, speaker visibility, delivery mode, and whether lips/body must match
   - `text_layer_plan` - every readable text element in the sequence, with `text_id`, category, exact copy if known, language/script, owner, planned time window, and whether subtitles must avoid this window
   - `generation_contract` - what the downstream prompt must include or exclude, including exact dialogue lines or explicit exclusions such as `no speech, no dialogue, no voice, no spoken words`
   - `assembly_expectation` - what audio should be preserved, muted, ducked, or blocked later

   A plan that says only "B-roll", "VO", "environment sound", or "character speaks" is insufficient. It must say what is on screen, who/what is the subject, what the viewer hears, who owns each spoken line, and what generation-skill must do for that sequence.

## Step 3 - Per-Sequence Visual Design

For each sequence, design the visual execution. Consult `references/shot-design-principles.md` for shot sequence logic, camera movement narrative functions, and shot connection patterns.

1. **Shot outline** - core shots within the sequence: what happens, shot type (wide/medium/close/detail), camera movement (static/push-in/pan/orbit/tracking), and the narrative purpose of each shot.

2. **Timing allocation** - budget time per shot using prompt-internal timing cues (`[0-5s]`, `[5-10s]`). Let the emotional weight drive duration: high-intensity beats get more time, breathing beats get less. For shots with voiceover or readable text, budget >= spoken/read duration + 0.5-1s slack (~3-4 Chinese chars/sec, ~2.5-3 English words/sec). For English VO, estimate ~2.5-3 spoken words/sec and treat 15s as roughly 35-42 words after accounting for pauses and emphasis; if the copy is denser, rewrite it before handoff. See `references/editing-rhythm-design.md` for rhythm curve design and how emotion/information density maps to shot language.

   **Visual pacing protection**: Timing must preserve the intended viewing effect. Slow motion or speed changes are valid only when they are part of the creative shot design. Do not assign a short visual beat and assume assembly can stretch it later to fit unknown VO. If the spoken content may need more time, add real visual beats or reduce the copy.

3. **Emotion & information density arc**: Annotate where each sequence sits on the emotional intensity and information density curves - whether a given moment is a quiet breathing beat, an information-heavy walkthrough, an emotional peak, etc. These two dimensions inform shot language choices (see `references/editing-rhythm-design.md` Section 4).

4. **Visual Style Convention** (multi-sequence only) - define 4 constants that every sequence shares:
   - **Rendering style** (photorealistic / cinematic / painterly / illustration / motion graphics)
   - **Color palette** (warm/cool/neutral, dominant tones)
   - **Lighting mood** (natural / studio / dramatic / soft / golden hour)
   - **Texture quality** (organic film grain / clean digital / dreamy soft focus)

   These constants become a **style preamble** that generation-skill prepends to every segment's prompt, preventing each segment from independently interpreting the visual style. When the creative story involves a deliberate style shift (e.g., reality -> fantasy), annotate which segments deviate and why. If all segments share one visual world (the common case), state the convention once and note "applies to all sequences."

5. **Subject Element Brief** - script-skill must explicitly list every person, scene/location, object/prop, product, brand element, UI/screen, and readable-text carrier that must appear in the video. This is a story inventory, not an asset-generation plan. For each element, include:
   - `element_id` and role (`character`, `scene`, `object`, `product`, `brand`, `ui`, `text_carrier`)
   - stable description from the script (what the viewer must recognize)
   - sequence IDs where it appears
   - whether it is recurring, identity-critical, or allowed to vary
   - relationship anchors, such as "same presenter owns seq1 speech and seq2 VO", "same tablet appears in close-up and desk shot", or "same coworking window area returns in closing"
   - continuity-sensitive traits that must not drift, such as face/person identity, wardrobe, product scale, room layout, logo placement, or screen content

   Script-skill does **not** decide the final number or type of reference assets. It hands this complete element brief to subject-asset-skill, which decides which `character_ref`, `prop_ref`, `scene_ref`, `product_ref`, `style_ref`, or key-frame assets are required and how they map to each sequence.

6. **Subject consistency intent** - for every subject element appearing in more than one sequence, state whether continuity is required and why. Detailed reference mapping and gap analysis happens in subject-asset-skill. For recurring people, also specify stable identity attributes that prompts must preserve: age range, face/ethnicity, hairstyle, wardrobe, body build, and any persistent props. If the same person appears in talking-head and B-roll shots, every sequence must map back to the same character identity, not just the same broad "young person" description.

   **Recurring visible-person hard gate**: If a visible human/character appears in more than one sequence and no user-provided `character_ref` exists, the handoff must mark that subject as `coverage: uncovered` and require subject-asset-skill to generate or derive a `character_ref` before generation. Prompt-only descriptors such as "same young man" or "the presenter returns" are not valid identity anchors for multi-sequence production.

## Step 4 - Audio Design

Design the complete audio landscape. Audio co-generation is the #1 priority - SFX and on-screen dialogue are always co-generated, never post-produced. See `references/video-generation-execution.md` Section I (Audio Strategy) for the full audio strategy by model and reference combination.

Before assigning any voice path, treat the user's wording as evidence rather than a command label. First decide the viewing relationship: who will the audience believe owns the words, and does the voice need to be coupled to a visible body, mouth, gesture, or camera performance? If the audience would read the visible character as the speaker, preserve that performance in generation. If the voice clearly sits outside the scene over supporting visuals, plan off-screen narration. When the boundary is genuinely ambiguous and changes lip-sync or performance quality, ask one focused question; otherwise protect the harder-to-repair quality: visible audio-visual coupling.

**Single speaker ownership gate (before sequence output)**: If the same character is presented as the source of both an on-camera line and a self-narrating or explanatory voice elsewhere, decide whether those words belong to one perceived speaker identity. Do not split one perceived speaker into visible speech plus overlapping post-produced VO unless the brief intentionally calls for simultaneous speakers. If the opening shot makes the person the speaker and later narration is framed as that person's own voice, treat it as one speaker with one source family, then design the sequence list around that source family.

**Cross-sequence voice identity gate**: If the same perceived speaker appears across multiple sequences, or appears once as a visible speaker and elsewhere as an off-screen narrator, plan a single voice identity before generation. Use one approved voice source or a set of per-line assets from the same source family, then route by visual relationship:
- visible on-camera line -> pass the matching speech asset in `audio_list` so the generated video bakes the same voice into lip/body performance
- off-screen narration over B-roll -> place the matching speech asset in assembly as `post_tts_vo`

Do not rely on open-ended co-generated speech for one line and catalog TTS for another line when the audience should perceive the same person as speaking. That creates avoidable timbre drift. Co-generated speech is acceptable for a short, self-contained visible line when voice identity is not reused later and exact voice control is not important.

**Audio role gate for user-supplied audio**: When the user provides or references audio, decide its role before choosing tools. It may be the final master that must remain unchanged, a lip-sync driver for visible mouth/body performance, a rhythm/mood driver for visuals, or a voice identity reference. These roles lead to different prompt and assembly strategies. If audio drives visible lips, the returned video's embedded/native audio is the safest sync clock. If the user requires the original master recording to stay unchanged, disclose that ordinary `audio_list` visual sync may be approximate unless a waveform-preserving route is available.

**Long-form vocal music / music-video feasibility gate**: If the user supplies a vocal song or asks for a character/singer to mouth lyrics, sing, or perform a full track, classify this as `music_video_lipsync_risk` before sequence planning. This is a capability boundary, not ordinary BGM.
- If the user requires **all three**: original master audio unchanged, visible singer/character mouth movement, and exact lyric-level sync, mark the ideal route `unsupported_without_waveform_preserving_lipsync` unless a tool in the current runtime explicitly guarantees waveform-preserving lip sync. Do not plan full production as if ordinary Seedance `audio_list` guarantees this.
- For any vocal music track longer than one generation call (>15s on Seedance / >10s on Kling), require a `music_lipsync_feasibility_declaration` with: `master_audio_required`, `visible_vocal_performance`, `sync_precision` (`exact` / `approximate` / `expressive_only`), `track_duration_ms`, `planned_generation_count`, `credit_risk`, `pilot_required`, and `approved_fallback`.
- Default safe path: produce a 10-15s pilot window first, then ask the user to confirm one direction: keep original audio with approximate mouth performance, keep model/native audio for better mouth sync, silent visual performance for later external music, or stop. Do not plan a full-song batch before that confirmation.
- If the user has already complained about credits, repeated revisions, or capacity, prefer an edit-only recovery path and state its limitations. Do not propose another large video-generation batch as the first recovery.

**Visible-performance hard stop**: Do not choose `voiceover_narration` merely because the request uses a narration-like label when the same request ties the voice to a visible character's body, timing, gestures, mouth, or direct-camera performance. Choose `on_camera_sync_speech` with exact spoken lines or `audio_list` lipsync, or ask a focused clarification about whether the visible character should speak or remain intentionally silent while an off-screen narrator speaks.

**Visible-speech preservation gate (hard block)**: When the user's intended shot makes a visible character/presenter the perceived speaker, the sequence plan must preserve visible speech. Do not rewrite that shot into silent gaze, thinking, listening, working, or B-roll merely to solve voice consistency. If voice identity must stay consistent across visible speech and B-roll narration, the default plan is:
- generate a shared/per-line speech asset with the selected `voice_key` or voice reference before the relevant video call
- visible line -> `audio_list_tts`
- off-screen B-roll narration -> `post_tts_vo`

The only allowed exception is an explicit silent-B-roll override in the plan, with `visible_speech_request_preserved: false`, `silent_broll_override_reason`, and `user_visible_speech_change_disclosed: true`. Without all three fields, downstream generation must treat any prompt that suppresses speech for that perceived speaker as invalid.

For each sequence:

1. **SFX & atmosphere** - always co-generated. Design at least one concrete sound event tied to on-screen action per sequence. Plan a shared ambient foundation across sequences for cross-segment coherence. See `references/audio-design-guide.md` Sections 1-3 for sound-style positioning and audio-visual relationships.

2. **SFX coherence plan** (multi-sequence only): Define a **shared ambient foundation** - a consistent base-layer SFX character that should persist across all segments (e.g., "warm organic room tone" or "soft outdoor nature ambience"). On top of this base, plan a **designed SFX arc** across segments - how the sound evolves through the narrative, not random per-segment choices. This plan feeds into generation-skill's per-segment SFX prompt writing.

3. **Dialogue & monologue** (on-screen speech) - always co-generated when the character's speech starts and ends within the sequence. Design the spoken content, emotional register, and rhythm. See `references/dialogue-monologue-design-kb.md` Sections 1-2 for dialogue construction principles.
   - **Spoken-language default**: If the user's brief is written in Chinese and they ask for a visible person to speak, default `spoken_language` to Chinese/Mandarin unless the user explicitly names another spoken language. Do not leave the language implicit for visible speech.
   - **Exact-text gate**: A visible-speaking sequence cannot be handed off with only "speaks naturally", "talks to camera", "explains", or similar performance wording. `speech_plan` must contain either `exact_text` in `spoken_language`, or `exact_text_missing: true` plus a blocking note that generation must ask for the line or replan as disclosed silent B-roll before `video_generate`.

4. **Voiceover & narration** (off-screen speech) - post-assembly via TTS for cross-sequence voice consistency. Plan the VO content, pacing, and tone per sequence. Select voice ID from the catalog. See `references/vo-design-principles.md` Sections 1-2 for VO content design and Section 6 for the voice catalog. **Fit gate**: The planned VO copy must fit the target visual duration using the timing heuristic above. If it does not fit, reduce the spoken content or revise the video duration before generation. Assembly must receive a fitting VO plan, not an overlong script to trim.

   **Measured-duration risk policy**: If actual generated VO later exceeds the planned window enough that assembly would need any clip speed below `0.85`, above `1.15`, or total duration drift over 10% from the target, the plan is considered invalid, not merely "VO-first". Valid recovery paths are: regenerate a shorter complete VO, generate additional visual material, explicitly extend the final duration when the user's target was soft, or ask the user to choose. Do not hide the mismatch by slowing existing footage.

5. **Reference-audio presenter path** - if supplied speech audio or a voice reference is meant to drive visible performance, start with audio-conditioned generation. Seedance often fits best: pass speech audio in `audio_list` with the presenter reference, and split long audio by sequence so each sequence gets only its own <=15s chunk. If the voice should stay off-screen, keep it in the narration path above.

6. **BGM timing mode** - determine temporal relationship between music and visuals:
   - **Video-first** (default >15s): generate video first, analyze rhythm, compose BGM to match.
   - **Music-first**: when the concept is rhythm-driven or user provided a music track.
   - **Independent**: when BGM is purely ambient.
   
   Base the recommendation on the creative story's audio-visual relationship. See `references/video-generation-execution.md` Section IV (BGM Planning) for BGM timing strategy. For full mix patterns, see assembly-skill SKILL.md Rule 4.

7. **Voice Source Declaration (binding handoff)** - each spoken line has exactly one planned audio source before any generation call. Produce an internal structured declaration per spoken line:
   - `line_id`
   - `speaker_id` and `voice_identity_id`
   - exact `text`
   - `spoken_language`; if the user wrote the creative brief in Chinese and did not specify another spoken language, use Chinese/Mandarin
   - `exact_text_missing`: `true` only when a visible-speaking line is required but no line has been supplied or authored yet; this blocks downstream visible-speaking generation until resolved
   - `sequence_id` / time window
   - `speaker_visibility`: `visible_on_camera`, `off_screen`, or `no_lip_movement`
   - `planned_source`: `co_gen_dialogue`, `audio_list_tts`, or `post_tts_vo`
   - `voice_asset_plan`: `shared_master_take`, `per_line_same_voice_key`, `user_voice_reference`, or `co_gen_no_identity_lock`
   - `voice_key` or voice-reference asset when TTS/reference voice is planned
   - `generation_requirement`: exact quoted prompt line, `audio_list` speech asset, or explicit speech exclusion (`no speech, no dialogue, no voice, no spoken words`)
   - `assembly_guard`: `keep_embedded_speech_no_extra_vo`, `produce_post_vo_only_if_no_embedded_speech`, or `silent_broll_then_post_vo`
   - `requires_assembly_asr`: always `true` for any generated video with `sound:on` or any visual speaker
   - `original_visible_speech_cue`: copy the user/plan phrase that implies visible speaking, or `none`
   - `visible_speech_request_preserved`: `true` unless an explicit silent-B-roll override is present
   - `silent_broll_override_reason`: required when `visible_speech_request_preserved` is `false`
   - `user_visible_speech_change_disclosed`: required and must be `true` when `visible_speech_request_preserved` is `false`

   This declaration is binding for generation-skill and assembly-skill. Do not create a separate `audio_produce` VO for a line whose `planned_source` is `co_gen_dialogue` or `audio_list_tts`. Do not plan visible speaking for a line whose `planned_source` is `post_tts_vo` unless the shot is explicitly silent B-roll with speech exclusions.

   For every line in the declaration, mirror the same decision inside `sequence_breakdown.speech_plan`. If a sequence has a visible speaker but no planned speech source, its generation contract must explicitly say the person is silent and include speech exclusions. If a sequence has post VO, the visible shot plan must not describe mouth movement, talking to camera, or "saying" unless the intent is a separate on-screen speaker and the line is listed as intentional multi-speaker dialogue.

8. **Assembly re-identification requirement** - script planning is not proof of media facts. The handoff must instruct assembly-skill to re-run speech detection on generated clips with `audio_produce(provider=elevenlabs, mode=speech2text, model=scribe_v2)` before adding any VO/TTS track. If assembly detects embedded speech in a clip assigned to `audio_list_tts` or visible on-camera speech, assembly must not add post VO for that line. If the detected transcript does not match the intended line, assembly must fail closed and request regeneration or strategy change.

9. **Audio strategy by model/reference combination** (key decisions):
   - **Seedance with any references** -> audio co-gen enabled (`sound: "on"`), design SFX + dialogue in prompt.
   - **Visible presenter + supplied speech/timbre reference** -> usually prefer Seedance with per-sequence speech chunks in `audio_list`; this often preserves audio-visual coupling better than later narration.
   - **Kling with reference video** -> always silent, extract Sound Reference Context for post BGM/narration.
   - **Single <=15s Seedance / <=10s Kling** -> design dialogue/monologue + SFX in prompt; allow music + narration in-prompt only when this is the final single delivery.
   - **Multi-sequence** -> design SFX + in-sequence dialogue per sequence; keep BGM and off-screen narration for post-assembly.

## Step 5 - Visual Packaging & Text Design

Design all on-screen text, brand elements, UI, and decorative graphics. See `references/packaging-keyframe-guide.md` for the complete Layer 1/Layer 2 classification and composition rules, and `references/visual-packaging-guide.md` for overlay types and design patterns.

### Two-Layer System

**Layer 1 - AI Generation Layer (via key frame reference images)**: For packaging elements and environment-layer text carriers where visual atmosphere and scene integration matter more than pixel-perfect text accuracy.

- **What belongs here**: Brand name/logo compositions, decorative typography / artistic text, visual style overlays, product packaging layouts, end cards, sticker-style elements, animated graphic overlays, plus **any in-scene material carrying readable text** (posters, signs, certificates, LED walls, dashboards, app screens, device interfaces, product labels, title cards, picture-in-picture-style screens).
- **How it works**: Generate text-bearing key frame images using image generation tools. Pass to generation via `image_list`. In the prompt, describe how the image's content appears in the video - not the literal text.
- **Readable text rule**: If the audience is supposed to read exact words on screen, those exact glyphs must live in a reference image. Do **not** plan to have the model draw the words from prompt text.
- **Prompt prohibition**: Do not write instructions like `"the screen shows '90%'"` or `"the words XXX appear"` as if the video model should render characters from scratch.
- **In-frame packaging**: Text that is visually integrated into the shot (poster-style headlines, spatially attached text, tracked typography) counts as Layer 1 key frame references.
- **Product UI in scene**: Product screenshots, dashboards, app screens -> environment-layer references, not post overlays.
- **Text occlusion planning**: When text/UI may be partially covered, annotate the safer strategy (keep unobstructed, or provide dual-image reference).
- **Layer exclusivity rule**: When a text element is assigned to Layer 1 (generated in image), it is **EXCLUSIVE** — assembly must NOT add a `kind=text` or `kind=subtitle` overlay for the same content in the same time window. The text already lives in the image; a post-production text track would double-render it. Annotate clearly in the packaging plan: `"title_card_open: Layer 1 ONLY — no post text overlay"`.

**Layer 2 - Post-Production Layer**: For precise readable post text that should be composited after video generation.

- **Still not generally supported as freeform overlay planning**: precise selling-point text, data callouts, prices, website links, and other dense information bars should remain marked unsupported unless a downstream edit path is explicitly confirmed.
- **Creative script annotation**: use notes like `packaging: [element] - NOT SUPPORTED (requires precise post text overlay)`.

### Classification Decision Tree

- Brand name / logo -> **Layer 1**
- Artistic typography -> **Layer 1**
- Decorative stickers / graphic overlays -> **Layer 1**
- End card with brand identity -> **Layer 1**
- Product UI / dashboard / app screen in scene -> **Layer 1** as `ui_ref`
- Poster / sign / certificate / screen / label with readable text in scene -> **Layer 1** as environment-layer key frame
- Spatially integrated selling-point text in shot -> **Layer 1** as in-frame packaging key frame
- Selling point text (must be readable) -> **Not supported** by default (inform user unless downstream edit path is explicitly confirmed)
- Subtitles / captions -> **Layer 2** with explicit **platform safe-area** planning. If the shot already contains a designed-in text card (Layer 1 title card, price card, CTA), mark that time window as subtitle-skip so assembly does not overlay captions on top of existing text. All text overlays (including title cards) must respect safe-area constraints: top/bottom margin at least 8% of frame height, fontsize should not exceed canvas width / 10 for vertical outputs.
- **Title cards / end cards with text baked in image** -> **Layer 1 ONLY**. The text is already rendered in the generated image. Do NOT plan a separate `kind=text` track for the same wording — that produces visible doubling. If the generated image text is unclear, regenerate the image; do not compensate with a text overlay. **Static placement option**: Title cards and end cards that need no motion can be placed directly as image clips in the timeline (still-image hold) without video generation — annotate as `static_image_placement: true` in the sequence plan so generation-skill can skip `video_generate` for that shot.
- Data callouts / numbers -> **Not supported** by default (offer Layer 1 as best-effort where appropriate)
- Price / phone number / website link -> **Not supported**

### Text Layer Declaration Gate

Before handoff, produce a binding `text_layer_declaration`. Do not leave any readable text implied only inside prose.

Each row must include:

- `text_id`
- `category`: `vo_caption`, `dialogue_caption`, `screen_packaging_text`, `brand_logo_or_mark`, `in_scene_signage_ui_label`, or `model_incidental_text_forbidden`
- `exact_copy`: the intended text, or `none` when the element is explicitly illegible/incidental
- `language_script`: for example `zh-Hans`, `en`, `mixed zh-Hans/en`, or `none`
- `owner`: exactly one of `timed_subtitle_artifact`, `ass_post_overlay`, `layer1_keyframe`, `unsupported`, or `forbidden_in_video_prompt`
- `sequence_id` and `time_window`
- `collision_policy`: `subtitle_skip_window`, `subtitle_safe_zone_required`, `no_duplicate_overlay`, or `none`

Hard blocks:

- If the user's brief is Chinese/CJK and the text is meant to be readable, the declaration must not silently translate it into English or pinyin. Use the user's language unless they explicitly asked for another language.
- If a text element is assigned to `layer1_keyframe`, the exact glyphs must be rendered in the key frame/reference image. The video prompt may describe the reference image, but must not ask the video model to invent or typeset the raw words.
- If a text element is assigned to `timed_subtitle_artifact`, downstream generation prompts must not also request that same text as signage, screen copy, or title-card text.
- If exact readable post text is required but no stable post-overlay path is confirmed, mark it `unsupported` rather than smuggling it into a video prompt.

## Step 6 - Pacing Plan

Design how the overall rhythm flows across sequences (e.g., slow build -> climax -> resolution). Think about the emotional arc and information density across the full story before diving into individual shots - let the story's rhythm guide shot language choices rather than defaulting to aesthetic habit.

**Cut logic (montage only):** Name which sequences are montage and which montage mode applies (`accumulation` / `parallel` / `metaphor` / `cross-cut` — see `references/shot-design-principles.md` §5). Verify no run of three+ unmotivated hard cuts. One sentence per junction is enough; do not add a separate schema unless the piece is montage-heavy.

## Step 6b - Cross-Segment Continuity (intent-first, multi-segment)

**Upstream hints:** If brainstorm handoff includes `continuity_intent: high` or `frame_chain_recommended: true`, treat as a **mandatory evaluation** of this step (not optional). Map user language into `user_production_intent` even on the abbreviated path.

**Intent gate (at least one primary signal):**
- Editing / storytelling strict: seamless joins, no jumps, story must flow, smooth cuts between segments.
- High quality / cinematic: film look, premium, broadcast, movie-level.
- Complex scene / storyboard: shot list, storyboard, camera moves, multiple beats per segment.
- Explicit open/end control: opening frame, ending frame, first-to-last composition within a segment.

**Hard exclusions (do not activate):**
- User wants fast montage / fragmented cuts / no continuity.
- One unbroken shot for the whole piece (use serial continuation in one block).
- `audio_list` / lipsync owns the visible speech clock.
- Pure Grok T2V with no reference pipeline.

**Technical gate (all required):**
- `planned_sequence_count >= 2`
- `production_strategy` is `parallel` or a `hybrid` block that uses parallel generation
- Production model supports `reference2video` (Seedance / Kling)

No minimum total duration. **Two segments** are enough when intent signals are present.

When activated, add:

- `user_production_intent`: `continuity_strict`, `quality_tier` (`standard` | `cinematic`), `storyboard_control` (`none` | `light` | `full`).
- `global_style_lock` - one sentence for every segment prompt.
- `segment_contracts` - per sequence: `sequence_id`, `entry_anchor`, `exit_anchor` (visual + optional SFX).
- `bridge_plan[]` - optional 1-2s bridges when a junction may break.
- `junction_link_mode` - how adjacent segments share frames (see Step 6c). Default: `pre_planned_stills` when frame chain activates; otherwise `anchor_text_only`.

Set handoff flag: `parallel_continuity_activation: true`.

Montage overlap: `visual_beats` keep beat-level cut motives (Step 6). `segment_contracts` govern **segment-to-segment** joins only.

## Step 6c - Pre-Planned Frame Chain (seamless junctions, parallel-safe)

Activate **in addition to Step 6b** when cross-segment continuity is required **and** any of:
- `continuity_strict: true`, or
- `quality_tier: cinematic` with `storyboard_control` at least `light`, or
- user explicitly wants storyboard / opening-ending control / seamless segment joins.

Set `frame_chain_mode: pre_planned` and `junction_link_mode: pre_planned_stills` unless the user explicitly requests junctions tied to **generated video pixels** (see tail-extract path below).

**Do not use frame chain** for montage-only pieces where junctions are intentional `scene_reset` hard cuts with no exit→entry match.

### Canonical handoff schema (field names are binding — use exactly)

**Top-level (Step 6b):** `parallel_continuity_activation`, `junction_link_mode`, `user_production_intent`, `global_style_lock`, `segment_contracts`, `bridge_plan`

**Top-level (Step 6c, only when frame chain activates):** `frame_chain_mode: pre_planned`

**Nested object `frame_chain_plan`** (required when `frame_chain_mode: pre_planned`):

```yaml
frame_chain_mode: pre_planned
junction_link_mode: pre_planned_stills   # or tail_extract_junction | anchor_text_only | serial_video_list

frame_chain_plan:
  in_segment_still_density: standard    # standard | high
  chain_nodes:
    - id: OPEN_S1
      binds: [seq1.entry_anchor]
    - id: END_S1
      binds: [seq1.exit_anchor, seq2.entry_anchor]
    - id: END_S2
      binds: [seq2.exit_anchor, seq3.entry_anchor]
  per_sequence_slots:
    - sequence_id: seq1
      slot_node_ids: [OPEN_S1, CHAR_MAIN, STYLE_MAIN, END_S1]
    - sequence_id: seq2
      slot_node_ids: [END_S1, CHAR_MAIN, STYLE_MAIN, END_S2]
```

**Invariants:**
- `slot_node_ids[0]` = entry still for that sequence (`OPEN_S1` or previous segment's `END_S(n-1)` node id).
- `slot_node_ids[-1]` = that sequence's exit node id (`END_Sn`).
- Junction: seq(n+1).slot_node_ids[0] **must equal** seqn.slot_node_ids[-1] (same `id`, same file after Phase A).
- `CHAR_*` / `STYLE_*` ids must match subject-asset anchor ids used in the Subject Anchor Plan.

**Downstream mapping (generation-skill, not API fields):**
- Build `image_list` in **the same order** as `slot_node_ids`; resolve each id via `frame_chain_manifest[id]`.
- Seedance prompt: `"image 1"` = `slot_node_ids[0]` role (entry); `"image {N}"` = `slot_node_ids[-1]` role (exit); journey from 1 to N. No `first_frame` / `last_frame` API params.

### Junction link modes (pick one per story block)

| Mode | When | Execution |
|------|------|-----------|
| **`pre_planned_stills`** (default) | Planning-first seamless joins; parallel speed | Phase A: one GPT Image 2 batch for all chain nodes (+ optional MID stills). Phase B: one parallel `video_generate` batch. **Do not** wait for video to extract junction stills before Phase B. |
| **`tail_extract_junction`** | User asks to match **actual generated** last frame / reject storyboard stills for junctions | Allowed but **not** the default parallel path. May require generating upstream segment(s) first for affected junction(s), then extracting PNG from final ~0.5s, then regenerating downstream segment(s). Document tradeoff: slower, breaks full parallel batch for those junctions. |
| **`anchor_text_only`** | Light continuity (style + anchor copy) without frame chain | Step 6b only; shared refs, no `frame_chain_plan`. |
| **`serial_video_list`** | Same-scene unbroken action, frame inheritance from video | Use only for continuous-action blocks — **not** combined with `pre_planned_stills` on the same junction. |

**Tail-frame extraction** remains a valid tool when `junction_link_mode` is `tail_extract_junction`, or as **repair** after `pre_planned_stills` when a junction fails QA (update `END_Sn` asset, regenerate downstream segments only).

Set handoff flag: `frame_chain_mode: pre_planned` when this step activates.

## Step 7 - Production Handoff

Package everything for subject-asset-skill and generation-skill as internal context (not shown to user):

- **Sequence list** - ordered sequences with per-sequence: shot outline, timing, visual design, audio design, packaging elements, reference image assignments.
- **Subject Element Brief** - complete inventory of all people, scenes/locations, objects/props, products, brand elements, UI/screens, and text carriers required by the script, including sequence appearances, recurrence, identity criticality, allowed variation, and relationship anchors. This is the required input for subject-asset-skill to design references and anchoring.
- **Duration Budget** - target duration, tolerance, per-sequence visual windows, VO/audio duration estimates, audio uncertainty risk, and approved overflow response.
- **Required Sequence Manifest** - ordered required assets with `sequence_id`, expected generated asset name, required spoken line IDs, duration window, and replacement policy. A later segment may not stand in for a failed earlier sequence unless the script is explicitly replanned and the manifest is updated.
- **Subject Coverage Manifest** - every recurring visual subject with `subject_id`, role, stable identity traits, visible sequence IDs, required reference type, current coverage (`covered` / `partial` / `uncovered`), and blocking gaps. For recurring visible people/products, every sequence that shows the subject must later receive the same reference asset in `image_list` unless a documented, user-visible strategy change removes that subject from the sequence.
- **Production model** - which model, with concrete `provider` + `model` + `mode` + `provider_param` key.
- **Production strategy** - parallel / serial / hybrid, with reasoning.
- **Visual Style Convention** - the 4 constants for multi-sequence consistency.
- **Audio plan** - per-sequence SFX/dialogue assignment, VO plan, BGM timing mode, SFX coherence plan, voice source declarations.
- **Voice Source Declaration** - per spoken line: speaker/voice identity, exact text, planned source (`co_gen_dialogue` / `audio_list_tts` / `post_tts_vo`), voice asset plan, speaker visibility, generation requirement, assembly guard, and `requires_assembly_asr`.
- **Text Layer Declaration** - per readable text element: `text_id`, category, exact copy, language/script, owner, sequence/time window, and collision policy. This is binding for generation and assembly.
- **Packaging plan** - Layer 1 key frame image annotations, Layer 2 limitations noted.
- **Packaging feasibility discipline** - when writing shot design and packaging notes, avoid concepts that rely on unsupported special characters, decorative Unicode, emoji typography, or mixed-font composition within one text line/track. Script-level packaging should already be production-aware, so downstream skills receive buildable design intent rather than impossible typography wishes.
- **Text motion intent** - for subtitles, titles, and CTA text: define the role (informational caption vs visual packaging), motion intensity (none / restrained / expressive), and why it matches the video's tone. Do not specify implementation details such as ASS tags, keyframe arrays, coordinates, or exact animation durations.
- **Pacing plan** - rhythm flow across sequences.
- **Parallel continuity pack** (Step 6b) - `parallel_continuity_activation`, `user_production_intent`, `global_style_lock`, `segment_contracts`, `bridge_plan`, `junction_link_mode`.
- **Frame chain** (Step 6c, when activated) - top-level `frame_chain_mode`; nested `frame_chain_plan` with `in_segment_still_density`, `chain_nodes`, `per_sequence_slots` (see canonical schema in Step 6c).
- **Prompt writing guidance** - follow `references/video-generation-execution.md` Section III for prompt layers, character limits, and model-specific syntax.

**User-facing summary filter** (mandatory before presenting to user): Strip ALL internal production terms - replace with natural equivalents. Banned terms -> replacements:
- "Seq 1/2/3" -> "first/second/third scene"
- "SFX co-gen" / "co-generated" -> "synchronized SFX" or just describe the sounds
- "post-assembly" -> "score/music" or omit
- "parallel" / "serial" / "hybrid" -> omit entirely
- "sound on/off" -> omit
- Model names (Grok, Kling, Seedance) -> omit

The user should read a creative summary, not a production spec.

---

# Knowledge Base Triggers

Consult the relevant knowledge base **before** making design decisions:

| Designing... | Read first |
|---|---|
| **Sequence boundaries, model routing, parallel/serial strategy** | `references/video-models-routing.md` Section I and `references/video-generation-execution.md` Section II |
| **Shot composition, camera movement, shot connections** | `references/shot-design-principles.md` |
| **Editing rhythm, pacing curves, emotion-density mapping, montage cut motives** | `references/editing-rhythm-design.md` (§6 for montage) |
| **Montage mode defaults** | `references/shot-design-principles.md` §5 |
| **Cross-segment continuity (intent-first, ≥2 seq, parallel/hybrid)** | `references/editing-rhythm-design.md` §7 |
| **Pre-planned frame chain (seamless junctions)** | `references/editing-rhythm-design.md` §8 |
| **SFX, music atmosphere, audio-visual relationships** | `references/audio-design-guide.md` Sections 1-3 |
| **On-screen dialogue or monologue** | `references/dialogue-monologue-design-kb.md` Sections 1-2 |
| **Voiceover content, voice selection** | `references/vo-design-principles.md` Sections 1-2, Section 6 |
| **Audio co-gen strategy, BGM timing** | `references/video-generation-execution.md` Sections I and IV |
| **On-screen text, UI, packaging, signage** | `references/packaging-keyframe-guide.md` + `references/visual-packaging-guide.md` |
| **Reference image or storyboard panel generation** | `references/image-generation-guide.md` |
| **Prompt writing (layer priority, syntax, limits)** | `references/video-generation-execution.md` Section III |
| **Fallback and degradation** | `references/video-models-routing.md` Section III |

---

# What This Skill Does Not Do

- **Creative direction or narrative development** - brainstorm-skill.
- **Subject element decomposition, asset mapping, gap analysis, supplementary reference generation** - subject-asset-skill.
- **Video generation execution** (calling `video_generate`, `audio_produce`, `music_generate`) - generation-skill.
- **Timeline assembly and post-production mixing** - assembly-skill.
- **Modifying existing videos** - modification-skill.
- **Cover selection, publish packaging, social copy** - publishing-skill.
- **Model names in user-facing output** - internal, per system prompt Ground Rules.

Scope test: this skill owns *how each shot is designed and what production plan to follow*. Upstream (brainstorm) owns *what story to tell*. Downstream (subject-asset) owns *what assets exist and what's missing*. Generation-skill owns *execution*.
