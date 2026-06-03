---
name: modification-skill
description: "Self-contained video modification & editing skill - interpret feedback, re-generate segments, directly edit video (trim/speed/crop/volume/transitions), produce and mix audio (VO/BGM), and reassemble. Handles both iterating on Pexo-generated videos AND direct user video editing requests. Routes upstream only when creative direction or production structure needs fundamental changes. Not for first-time creation from scratch (brainstorm/script/generation-skill)."
---

# Usage

This skill is a **self-contained modification and editing engine**. Two entry points:

1. **Iteration on produced videos**: User gives feedback on a Pexo-generated video -> analyze feedback -> decide approach -> execute modification -> deliver updated video.
2. **Direct video editing**: User brings an existing video and wants edits (trim, add music, add narration, adjust pacing, crop, speed change, etc.) -> execute directly.

**Input**:
- User feedback on the current video (time points, plot, visuals, pacing), OR
- Direct editing instructions on any video
- The sequence list and production context of the current video (when available)

**Output**: The updated finished video. **Never expose internal terms** (sequence numbers, generation modes, sound on/off, model names) to the user - use natural creative language.

**Tools available**: This skill directly uses `video_generate` (re-generation), `video-editor__execute_edit_video` (editing, assembly, mixing), `audio_produce` (TTS/VO production), `music_generate` (BGM production), `image_generate` (packaging key frames, cover images), `analyze_file_content` (feedback analysis), `video-editor__analyze_audio` (loudness / tempo inspection), and `get_file_info` (file info refresh, duration check). For edit spec mechanics (format, volume rules, transition rules, pre-assembly checklist), follow **assembly-skill** as the canonical reference - do not invent alternative assembly rules.

---

# Routing: Local vs Upstream

Before executing, determine whether this modification can be handled locally or needs to go upstream.

## Handle Locally (this skill)

- **Point impact** - single element fix: one accessory, one expression, one timestamped issue, one audio cue.
- **Line impact** - repeated class: multiple scenes of the same type need the same kind of fix.
- **Post-production adjustments** - trim, speed, crop, scale, volume, transitions, fade.
- **Audio additions** - add voiceover/narration, add BGM, add SFX to existing footage.
- **Audio adjustments** - volume rebalancing, BGM re-shaping, VO timing fixes.
- **Segment re-generation** - re-generate one or more specific segments while preserving the rest.
- **Reassembly** - reassemble after re-generation or editing changes.
- **Direct editing requests** - user brings a video and wants edits applied.

## Route Upstream

- **Surface impact / rejection** (user hates the whole direction, wants a completely different concept) -> **brainstorm-skill** - the creative direction needs rethinking, not modification.
- **Structural change** (user wants different sequence structure, different story arc, different scene order) -> **script-skill** - the production plan needs redesigning.
- **Major asset gap** (user provides fundamentally new reference material that changes subject coverage) -> **subject-asset-skill** - the asset foundation needs rebuilding.
- **Full redo** (user explicitly asks to start fresh) -> full pipeline from brainstorm.

**Decision test**: "Can I fix this by changing specific segments, editing the timeline, or adding audio layers - without re-inventing the story or production plan?" If yes -> local. If no -> upstream.

---

# Constraints & Behavior

## Feedback Analysis (Rules 1-5)

1. **Feedback Analysis Pass** (mandatory, before deciding approach): Analyze the user's feedback as a structured requirement set rather than reacting to literal wording only.
   - **Intent type**: classify as **confirmation**, **modification**, **supplementation**, **inquiry**, or **rejection**.
   - **Deliverable layer**: classify as **narrative**, **visual**, **audio**, or **cross-layer**.
   - **Impact scope**:
     - **Point impact** - single local element or moment.
     - **Line impact** - repeated class of elements or multiple scenes of the same type.
     - **Surface impact** - global tone, overall style, or whole-video structure.
   - **Comment relationship**: when multiple comments exist, determine whether they are **independent**, **sequential**, **elaborative**, or **contradictory** before planning execution.
   - Use this pass to consolidate the true requirement before choosing approach.

2. **Production Context Recovery** (mandatory, before deciding approach): Recover how the current video was actually produced, because modification strategy depends on the original production path.
   - Determine whether the current asset was created as:
     - **direct audio-visual generation** (video and embedded audio generated together),
     - **silent visual generation + post audio assembly**, or
     - **hybrid assembly** (some embedded audio preserved, some audio added in post).
   - Recover or reconstruct the sequence-level **audio narrative mode**: `on_camera_sync_speech`, `voiceover_narration`, `silent_broll_with_text`, or `nat_sound_only`.
   - Determine whether the current clip contains **valuable embedded audio** (co-generated SFX, dialogue, monologue, ambience, vocal events).
   - Determine whether the requested modification touches:
     - visual appearance only,
     - post-produced audio only,
     - or an **audio-visual coupling** that depends on visual action and audible output staying synchronized.
   - Do not choose a modification strategy until this production context is recovered.

3. **Constraint Guard** (mandatory, before deciding approach): Before any modification, verify the proposed change against **all confirmed constraints** from the session:
   - **Duration**: If the user confirmed a specific duration, any modification must preserve it. If a proposed approach would alter duration, either compensate elsewhere or explicitly inform the user.
   - **Aspect ratio**: Modifications must preserve the confirmed aspect ratio.
   - **Creative direction**: Modifications should stay within the confirmed creative direction unless the user explicitly requests a direction change.
   - If a user's feedback inherently conflicts with a constraint (e.g., "make it faster" might imply shorter duration), **surface the tension** and propose a solution.

4. **Locate Sequences**: Map by time point / plot / visual content to the sequence list; identify which sequences to change. Default to **local modification** - never redo the entire video unless the user explicitly requests it.

5. **Localized Feedback Routing**: When feedback is timestamped, frame-anchored, or clearly targets a single local detail, default to the lightest viable local strategy.
   - **Localized Visual Feedback**: a local accessory, prop, expression, object detail, or one moment in one shot.
   - **Localized Audio Feedback**: a local level issue, one specific sound cue, one isolated BGM adjustment.
   - **Audio-Visual Coupled Feedback**: a requested change where visible action and audible output must be correct **together** (e.g., lip sync, action-tied sound).
   - Routing priority for localized issues:
     1. post-production adjustment (direct edit),
     2. structure-preserving visual edit,
     3. selective re-generation,
     4. full re-generation only if lighter paths are not suitable.

### Subtitle/Text Complaint Triage

When the user says "subtitle wrong", "caption wrong", "text wrong", "字幕错", "文字不对", or similar, do not immediately choose ASS, manual captions, or subtitle reformatting. First classify the failure with media evidence.

Mandatory checks:

1. Recover the edit spec, generated assets, VO/TTS assets, subtitle artifacts, and any `text_layer_declaration` / `visual_text_audit` from the previous run.
2. Run `analyze_file_content` on the relevant windows to identify burned-in visual text, its language, and whether it collides with captions.
3. Inspect the timeline mapping: spoken asset -> subtitle artifact -> `kind=subtitle`/`kind=text` clip -> start/end times.
4. If post-produced VO exists, build or reconstruct the VO fit ledger before changing subtitle format.

Classify into one or more buckets:

- `wrong_timed_caption_source_or_content`: the subtitle artifact/text does not match the spoken line.
- `caption_timing_or_overlap`: the correct subtitle artifact is used, but starts, ends, overlaps, or drifts against VO/audio.
- `cjk_font_or_render_failure`: copy and timing are right, but glyphs/font/wrapping/render path fail.
- `baked_visual_text_wrong_language_or_content`: the wrong words are already generated into the video/image.
- `duplicate_or_occluding_text`: subtitles overlap title cards, signs, packaging, faces, products, or another text layer.
- `visible_speech_caption_timing`: captions are based on original TTS timing instead of final embedded speech/rough-cut ASR timing.

Routing after classification:

- ASS is appropriate for font/style/karaoke/word-level subtitle rendering after timing/source are proven correct. It is not the default diagnosis.
- `caption_timing_or_overlap` is fixed by retiming audio/subtitle windows from the VO fit ledger, not by changing JSON to ASS.
- `baked_visual_text_wrong_language_or_content` is fixed by regenerating the key frame/segment or using an explicit overlay strategy where feasible. Subtitle format changes cannot repair text burned into the footage.
- `duplicate_or_occluding_text` is fixed by subtitle-skip windows, safe-zone placement, or removing duplicate overlays.
- If multiple buckets apply, fix the earliest owner in the pipeline first: script declaration -> generation prompt/key frame -> assembly timeline -> render styling.

## Modification Approach Decision (Rule 6)

6. **Decide: Direct Edit, Re-generate, or Combined?** Apply the **progressive modification principle** - start with the lightest-touch approach, escalate only if insufficient.

   **Direct edits via `video-editor__execute_edit_video`** (fastest, preserves content):
   - **Pacing / timing** - trim dead air, shorten transitions, adjust speed. When the user says "speed up the pacing", default to tighter editing, not playback speed.
   - **"too long" / "trim"** - explicit duration reduction. Verify against confirmed duration constraint.
   - **Transitions** (jarring cuts, needs fades) -> adjust transition type and duration.
   - **Audio levels** (music too loud, voice too quiet) -> adjust volume per track.
   - **Framing** (zoom in, crop) -> scale/crop parameters.
   - **Speed ramps, Ken Burns effects** -> keyframe animation via `scale_kf`, `speed_kf` (and where needed `opacity_kf`, `x_kf`, `y_kf` for overlays/text). Keyframe format follows the tool schema (`ms`, `v`, `e` fields).

   **Re-generation via `video_generate`** (when content must change):
   - **Content changes** (different visuals, scenes, characters) -> **Seedance preferred**; use **Seedance Fast** when the goal is a quick reference-based visual anchor; use **Kling only** for precision single-frame/key-frame work, copyrighted IP, fine-detail, or in-frame text.
   - **Visual style changes** (restyle, re-skin - keep structure) -> **edit video (base)** (Kling only). Input <=10s, preserves duration and timing.
   - **Specific element motion** (e.g., "slow down the leaves") -> re-generate with updated motion descriptions in the prompt, not playback speed.

   **Audio production via `audio_produce` / `music_generate`**:
   - **Add voiceover** -> write VO script, present summary to user, generate TTS, mix into video.
   - **Add BGM** -> design audio direction, generate via `music_generate`, mix into video.
   - **Modify existing voiceover** -> re-generate TTS for affected segments when timing changed; reuse when timing preserved.
   - **BGM re-generation after visual changes** -> use video-first approach: analyze updated footage before writing new BGM prompt.
   - **Volume complaint triage** -> before adjusting gain, inspect the relevant BGM / VO / source video with `video-editor__analyze_audio`; use `lufs`, `true_peak`, and `duration` to decide between whole-track normalization and local gain edits.

   **Audio-Visual Coupled Feedback** requires special handling:
   - If the request depends on visible action and audible output being synchronized, do **not** treat it as ordinary audio-only feedback.
   - **Speech replacement / dubbing**: Interpret as a speech-modification problem, not generic voiceover. Evaluate reference-guided dubbing before plain TTS.
   - **Fallback ordering**: (1) reference-guided speech modification, (2) localized re-generation, (3) post-produced replacement audio (explicitly acknowledged fallback).
   - **Explicit downgrade disclosure**: If the final path is replacement audio on top of fixed visuals, tell the user clearly.

   **Prefer non-generative approaches when applicable** - they're faster and preserve existing content.

## Re-generation Rules (Rules 7-11)

7. **Execution Truthfulness**: If the path preserves structure and applies a true edit, describe it as an edit. If it re-generates footage, describe it as regenerated. Never tell the user "this is an edit" when the actual path is a new generation pass.

8. **Retry Limit**: After **2 consecutive failures** with the same approach, **stop and switch strategy** or inform the user of the limitation.

9. **Cascade Re-generation** (when create-video re-generation is needed):
   - **Serial-generated videos**: Modifying Sequence N requires re-generating N and all subsequent sequences. Cascade can be truncated at scene-change boundaries.
   - **Parallel-generated videos**: Modifying Sequence N requires only re-generating N.
   - **Hybrid videos**: Cascade applies within serial blocks; parallel sequences are independent.
   - **Edit video does not trigger cascade** - it preserves structure and timing.

10. **Re-generation Audio Strategy & Embedded Audio Preservation**: Audio co-generation is the #1 priority - SFX and on-screen dialogue are always co-generated.
    - **Seedance re-generation**: `sound: "on"` regardless of reference type.
    - **Kling re-generation**: Sound on without reference video. Always silent with reference video - prefer reference images to maintain audio co-generation.
    - **SFX coherence**: Re-generated segments' SFX must match the preserved segments' audio character.
    - **Preserve embedded audio by default** when the modification is visual-only.
    - **Do not preserve embedded audio blindly** when the user is changing the synchronized audio-visual event.
    - When re-generating, **use existing assets as visual anchors**: pass original reference images or extract key frames from original sequences.
    - **Character consistency**: The primary lever is reference images, not prompt text.
    - **On-screen text fixes**: In-scene readable text (signs / labels / title boards / packaging copy) is fixed by re-generating the underlying key frame image with the correct text via `image_generate`, then re-running the dependent video segment. The video editor does not composite post-production text on top of rendered footage.

11. **Asset Organization** (before re-generation):
    - When assets exceed capacity limits, classify material vs. reference, budget material first.
    - Only 1 reference video per call, **must be <=10s**.
    - Rank by role priority; keep within limits; silently drop lowest-priority items.

## Assembly & Delivery (Rules 12-15)

12. **Assembly Execution**: After re-generation, editing, or audio production, assemble the final video. This skill executes assembly directly via `video-editor__execute_edit_video`, following **assembly-skill's canonical rules** for edit spec construction:
    - Follow assembly-skill **Rule 1** (Pre-Assembly Checklist) before every `video-editor__execute_edit_video` call.
    - Follow assembly-skill **Rule 2** (Transition Type & Duration Budget) for transition design.
    - Follow assembly-skill **Rule 3** (Audio-Video Sync) for speed-change clips.
    - Follow assembly-skill **Rule 4** (Audio Track Preservation & Volume Mixing) for volume and mixing decisions.
    - Follow assembly-skill **Subtitle Hard Stops** before any subtitle, caption, or text-overlay decision tied to spoken lines.
    - **Reassembly source rule**: Always reassemble from **original individual segment files**, not from a previously rendered composite. Never set `volume: 0` on a source with co-generated audio.
    - **BGM masking**: When co-generated audio conflicts with BGM, prefer BGM re-shaping (sectional volume changes) over re-generating video.

13. **Voiceover & Audio Layer Decisions**:
    - **Adding voiceover**: Write VO script based on video content, present summary to user, generate via `audio_produce`, mix as new audio track.
    - **Do not misclassify visible speech replacement as voiceover** - see Rule 6 audio-visual coupled handling.
    - **Adding BGM**: Design audio direction, generate via `music_generate`, mix as audio track.
    - **Modifying existing VO**: Reuse when timing preserved; re-generate when timing changed.
    - **Current audio analysis boundary**: `video-editor__analyze_audio` helps with loudness / BPM inspection only. It does not provide beat grids, segment boundaries, lyric transcription, or climax detection - use `analyze_file_content` for semantic interpretation and keep timing edits manual / strategy-driven.
    - **Media-fact gate before new VO**: Before adding or replacing any spoken layer, inspect the current clip with multimodal understanding plus audio tools to determine what already exists: whether there is embedded speech, what is being said (ASR/transcription), whether burned-in subtitles already exist, and when those elements occur on the timeline.
    - **Anti-Doubling**: Each spoken line has exactly one audio source (co-gen, audio_list lipsync, OR separate TTS - never more than one). Before assembly, execute the AUDIO AUDIT step from assembly-skill Rule 1: probe each segment with ffprobe/analyze_audio, build the audio truth map, and use `embedded_speech` to gate whether a separate VO track is needed. If the clip already contains usable on-camera speech for the intended line, do not add duplicate VO.
    - **Timed subtitle artifact wins by default**: If `audio_produce` returns `subtitle_file` / alignment JSON for the spoken line, use that timed subtitle artifact as the default caption source.
    - **Manual spoken-caption fallback is exceptional**: Do not rewrite an ordinary spoken line as manual `kind=text` subtitles when a timed subtitle artifact already exists, unless no stable subtitle render path is available and the user can accept approximate captions.
    - **Render-safe subtitle copy**: Do not add emoji, decorative Unicode, or glyph-sensitive symbols to ordinary subtitles by default. Remove non-essential symbols rather than trying to force them through styling.

14. **Interruption Recovery**: When a tool call is cancelled mid-execution:
    - Inventory surviving assets before re-planning.
    - Reuse successfully generated assets - do not re-generate.
    - Preserve successful parameter patterns from earlier calls.
    - Scope recovery to the exact failure point.
    - Tell the user what survived and what remains.

15. **Cover Preservation**: After any reassembly, ensure the video remains preview-safe on frame 0.
    - If opening unchanged -> preserve existing cover.
    - If opening changed -> follow assembly-skill **Rule 9** for cover source priority and bake-in.

# Tools

Tools are provided at runtime. This skill uses:
- `video_generate` - re-generate video segments (Seedance preferred, Kling for IP/detail/text)
- `video-editor__execute_edit_video` - direct editing (trim, speed, crop, scale, volume, fade, transitions) and reassembly
- `audio_produce` - TTS/voiceover production (off-screen narration)
- `music_generate` - BGM generation
- `image_generate` - packaging key frames, cover image generation
- `analyze_file_content` - feedback analysis, frame inspection
- `get_file_info` - refresh file info / duration verification

For model routing (four-layer system, Seedance/Kling decision tree, degradation chain), see `references/video-models-routing.md`.
For image generation (routing strategy, prompt rules, reference discipline), see `references/image-generation-guide.md`.
For DSL combination patterns, text design principles, and common errors, see `references/video-editor-tool-guide.md`. Parameter definitions follow the tool schema.
For assembly rules (volume hard gate, pre-assembly checklist, BGM strategy), see assembly-skill Rules 1-4.
