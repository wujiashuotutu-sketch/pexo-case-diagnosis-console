---
name: assembly-skill
description: "Post-production assembly — timeline composition, transitions, audio production (VO/TTS, BGM), audio mixing, duration enforcement, cover bake-in, and non-generative edits (trim, speed, crop, scale). Use when video segments are ready and need assembling into a finished video, when reassembling after modification-skill re-generates segments, or for non-generative edits (trim, speed, crop, volume) on existing video."
---

## Strategy Gene

- **Domain**: post-production assembly, timeline, audio mixing, VO, BGM, transitions, cover
- **Summary**: Assemble video segments into a finished video with correct audio layers, transitions, and cover — after all segments are generated and audio strategy is decided.
- **Reference Read Order**:
  1. Read `references/vo-design-principles.md` before producing or placing any VO/TTS. Use it for VO-first timing, overflow handling, and voice catalog decisions.
  2. Read `references/video-editor-tool-guide.md` before constructing any `video-editor__execute_edit_video` spec, subtitle track, text overlay, source window, or post-render validation.
  3. Read `references/editing-rhythm-design.md` when transition rhythm, crossfades, pacing, or shot-boundary timing affects the edit.
- **Tool Use Logic**:
  1. Use `video-editor__ffprobe` for real media duration, stream presence, resolution, and fps. Use it before final timeline math and after render validation.
  2. Use `audio_produce(mode=speech2text, model=scribe_v2)` for speech transcripts and speech timestamps. This is the canonical speech-detection tool.
  3. Use `audio_produce(mode=text2speech)` for VO/TTS production; then probe the returned VO media duration before final placement.
  4. Use `video-editor__analyze_audio` only for loudness/tempo diagnostics, never for transcripts, speech timing, or VO completion.
  5. Use `get_file_info` for asset metadata or signed URL refresh; treat it as a duration source only when the response explicitly includes duration.
  6. Use `analyze_file_content` before adding text/subtitles to detect burned-in text, subject placement, faces, products, and safe subtitle zones.
- **Decision Principles**:
  1. Media facts beat plan estimates. Tool-probed durations and transcripts override scripted timestamps, prompt intent, and prior assumptions.
  2. Fail closed when the decision depends on unavailable media facts. If an asset cannot be resolved or measured, fix the reference or stop.
  3. VO is timeline-authoritative for spoken completeness, but not a license to damage the visual design. Visual windows and cuts may adapt to complete measured VO; VO is not clipped to satisfy visual timing. If measured VO would require unnatural slowdowns, narrative padding, or material target-duration drift, replan instead of forcing the edit.
  4. Every spoken line has one source. Do not mix embedded speech, lipsync audio, and post-produced VO for the same line/speaker.
  5. Final edit specs must be checked against exact tool fields, especially `source.in_ms`, `source.out_ms`, `start_ms`, subtitle timing, and segment durations.
- **Strategy**:
  1. Build a media truth map from probed segment facts before any assembly decision.
  2. Validate the required sequence manifest before writing the edit spec.
  3. Build the VO fit ledger whenever post-produced VO exists.
  4. Assemble from original individual assets, never from a previous rendered composite.
  5. Build an explicit timeline ledger before `video-editor__execute_edit_video`: every visual segment/card/overlay/audio clip gets `timeline_start_ms`, `timeline_end_ms`, `source_in_ms`, `source_out_ms`, and expected duration. Use the same ledger for video and audio start times. Mental arithmetic is not acceptable: write the ledger row-by-row, then copy audio `start_ms` from the matching visual row's `timeline_start_ms`.
  6. For source videos whose original audio is preserved separately, preserve the same source clock for moving picture and sound: `video.timeline_start_ms - video.source_in_ms == audio.timeline_start_ms - audio.source_in_ms`. A crossfade may change opacity, but it must not make source video time advance before the matching source audio time unless the offset is explicitly intended.
  7. Verify final render duration and audio coverage from probed media facts.
- **AVOID** (any of these is a hard BLOCKED):
  - Trim, fade-out, speed-up, or set `out_ms` shorter than a VO asset to fit a shorter video
  - Add a TTS/VO track when the segment already has embedded speech for the same line (audio doubling)
  - Mute an `audio_list` visible singing/speaking segment and replace it with the original master/source audio unless a waveform-preserving route is documented or the user explicitly accepts approximate lip sync
  - Add a `kind=text` overlay when the same text is already rendered in a Layer 1 image overlay for the same time window (text doubling)
  - Set volume=0 on co-generated audio unless creative intent is full silence
  - Leave any audio track without explicit `out_ms` (causes output longer than visual content)
  - Apply `fade_in_ms` to the first clip when a cover is baked in (defeats cover visibility)
  - Ship assembly when a planned segment is missing from the edit spec (incomplete narrative)
  - Substitute one successful segment for a different failed segment without explicit story replanning
  - Build a final timeline where the audible spoken line and the visible mouth movement came from different speech sources for the same speaker/line
  - Ship overlapping spoken subtitle clips unless the script explicitly calls for simultaneous speakers and the subtitle layout has separate safe zones
  - Use playback speed changes as the default repair for unknown/overlong VO. Any clip speed below `0.85` or above `1.15` is blocked unless the speed change was part of the original visual design or the user explicitly accepts the pacing tradeoff.
  - Use `end_ms` without `start_ms` on a non-first sequential `kind=video` clip, especially `source_type: "color"` divider/card clips. This often creates a long sequential clip instead of a clip ending at an absolute timeline time.
  - Preserve original video audio with a different source clock from the moving visual source. Example BLOCKED: video file starts at `2000ms` with `source.in_ms:0`, audio from the same file starts at `3000ms` with `source.in_ms:0`. If the transition needs silent visual overlap, use a still/freeze frame for the overlap and start moving video plus audio together.
  - Ship a render whose tool-returned duration or post-render probed duration differs from the timeline ledger by more than 1000ms.

## Subtitle Hard Stops

Read `references/video-editor-tool-guide.md` before constructing any subtitle, caption, or text-overlay edit spec. Do not rely on general memory or upstream planning text for subtitle assembly.

### Text Layer Manifest Gate

Before adding subtitles or text overlays, reconcile the script/generation `text_layer_declaration` and `visual_text_audit` against the actual edit spec.

For each declared row, verify:

- `owner: timed_subtitle_artifact` -> a `kind=subtitle` clip uses the matching timed artifact or a final-timeline ASR artifact.
- `owner: ass_post_overlay` -> a `kind=subtitle` ASS file exists and is used only after timing/source are validated.
- `owner: layer1_keyframe` -> no duplicate `kind=text` or `kind=subtitle` clip repeats the same copy in that time window.
- `owner: forbidden_in_video_prompt` or `unsupported` -> no generated visual asset contains readable text for that row unless the plan has been explicitly changed.

If generation handoff reports `prompt_requested`, `incidental_model_output`, `unknown`, or wrong-language baked text in the visual text audit, run `analyze_file_content` for that window and classify it before assembly. If the wrong text is burned into the video/image, assembly is BLOCKED for subtitle-only repair; regenerate or use an explicit overlay/replacement strategy first.

### Visual Text Detection Gate (mandatory before adding any text/subtitle track)

Before adding ANY `kind=text` or `kind=subtitle` clip to the edit spec, run `analyze_file_content` on the visual assets (overlay images and/or video segment) in that time window. This serves two purposes:

**Purpose 1 — Prevent text doubling:**
- If readable text already exists in the frame (baked into an image overlay or generated in the video), do NOT add a `kind=text` clip with the same or similar wording. That time window is text-overlay BLOCKED for duplicate content.

**Purpose 2 — Inform subtitle placement:**
- See where visual content, subjects, and existing elements sit in the frame. Place subtitles in zones with lower visual competition — avoid covering faces, products, key action, or existing text.
- Use the frame analysis to decide: position (top vs bottom vs side), margin adjustments, fontsize scaling, and whether a background box is needed for legibility.

**Procedure:**

1. Before constructing text/subtitle tracks, run `analyze_file_content` on representative frames from each time window where text will appear.
2. Note: (a) any existing text in frame, (b) subject positions and focal areas, (c) visual busy-ness / contrast zones.
3. If existing text found → BLOCKED for same wording; skip that text clip.
4. If no conflict → use frame composition to guide placement (`text_opts.x`, `text_opts.y`, `margin_v`, fontsize, background box).
5. When in doubt about doubling, do NOT add a duplicate overlay. Prefer clean delivery.

The trigger is simple: **about to add text? look at the frame first.** No upstream metadata needed — just see what's actually in the picture, then decide whether and where to place text.

### Subtitle Timing & Format Rules

Before any spoken subtitle / caption decision:
- If `audio_produce` returned a `subtitle_file` (or equivalent timed subtitle artifact), that artifact is the default source of truth for timing.
- When such a timed subtitle artifact exists, ordinary spoken captions as manual `kind=text` clips are BLOCKED unless no stable subtitle render path is available and the user explicitly accepts approximate captions.
- Do not add emoji, decorative Unicode, or glyph-sensitive symbols to ordinary subtitles unless the user explicitly asked for them and the chosen render path is known to support them.
- Do not place subtitles with fixed shallow-bottom offsets that ignore cue height and frame safe area.
- Do not ship long English spoken lines as one shallow-bottom text block. Split cues first, then style them.
- If a caption layout depends on width fit, wrapping behavior, or safe-area assumptions, verify those constraints before render. Centering text with `x: "(w-text_w)/2"` is not a fit check.
- After placing spoken subtitle clips, compare every subtitle window against every other spoken subtitle window. BLOCK if `next_start_ms < current_end_ms` unless the script explicitly calls for simultaneous speakers and the layout keeps both captions readable in separate safe zones.
- For VO subtitles, `current_end_ms` must be derived from the VO fit ledger: `clip.start_ms + source_window_ms` or the timed subtitle artifact's last cue, whichever is later. Do not use visual segment boundaries as the subtitle/audio clock.

---

# Usage

This skill owns everything that happens **after individual video segments exist** — assembling them into a finished video with proper transitions, audio layers, and cover packaging.

**Input**:
- Video segment list (each segment's `file` path from upstream tool return; includes duration and embedded audio state)
- Required sequence manifest from generation-skill (sequence id, returned file path, status, expected line ids, actual duration, replacement policy)
- Voice Strategy Declaration (which spoken lines are co-generated, which need TTS)
- BGM Timing Mode Declaration (video-first / music-first / independent)
- Creative script audio direction (VO copy, BGM descriptions, SFX notes)
- Cover instructions and transition recommendations

**Output**: The assembled finished video. **Never expose internal production terms** (sequence numbers, sound on/off, model names, edit spec internals) to the user.

## Final Alignment Check

Before delivery, validate against hard constraints:

**Block** if: duration materially misses target, duplicate/conflicting audio layers, composition contradicts declared strategy, or VO fit was achieved by degrading visual pacing instead of replanning.

**Warn** if: degraded path used, continuity risk high, voice treatment may feel post-produced.

---

## Constraints & Behavior

### 1. Audio Audit (FIRST — before any assembly decision)

Before probing audio, validate the required sequence manifest:
- Every required sequence must have a unique successful returned media file unless the plan explicitly marks it skippable.
- The edit spec must contain every required sequence exactly in the planned order unless a documented replan changed the story.
- A successful clip may not be reused as a substitute for a different required sequence when that sequence carries different spoken content, visual action, or narrative beat.
- If any required sequence is `failed`, missing, or only present as another sequence's duplicated asset, assembly is BLOCKED. Regenerate/fallback that sequence or replan before final delivery.

Build an audio truth map by probing every segment:
- Use the tools declared in Strategy Gene.
- For any segment whose lineage, manifest, prompt, or visual analysis indicates `on_camera_sync_speech` / visible speaking / talking-head performance, run `audio_produce(provider=elevenlabs, mode=speech2text, model=scribe_v2)` before final delivery. `video-editor__analyze_audio` is not a substitute. If STT cannot run or returns no usable transcript/language when the delivery decision depends on it, assembly is BLOCKED.
- For any `sound:on` / `co-gen` segment that will remain audible at nonzero volume while the plan also adds post-produced VO/TTS in the same time window, run the same STT audit even if the visuals look like montage/B-roll with no visible speaker. Do not assume "SFX-only" from prompt wording alone. If STT cannot confirm the segment is speech-free, assembly is BLOCKED from layering separate VO on top.

Per-segment truth map: `has_audio`, `audio_source` (co-gen / audio_list_tts / audio_list_music / silent / user_upload), `embedded_speech`, `embedded_music`, `speech_transcript_file`.

**Decision gates**:
- `embedded_speech=true` → BLOCKED from adding same speech as separate track
- `embedded_music=true` → BLOCKED from adding separate BGM without explicit intent
- `silent` → safe to add any layers
- `co-gen SFX only` → safe to add VO; duck segment volume
- `co-gen unknown speech status + planned post VO` → run STT first; do not mix by assumption
- **Conflict** (embedded speech + orphan TTS both exist): classify by speaker visibility — on-screen → keep co-gen; off-screen narration → keep TTS. Re-plan, don't just block.
- **Lipsync** (`audio_list` + `sound: "on"`): TTS is baked into video. No separate VO track for same lines. Duration mismatch >200ms → rebuild upstream.
- **`audio_list` visible-performance sync clock** (`audio_list_tts` or `audio_list_music` + visible speaking/singing): the generated segment's embedded/native audio is the final sync clock. Keep the video clip audio at dialogue/vocal volume and do not add or substitute the source/master audio as a separate full-volume track. If the edit spec sets that clip `volume: 0` while adding the original source/master audio for the same time window, assembly is BLOCKED because the visible mouth motion and audible source come from different clocks.
- **Nonzero embedded-speech overlap hard stop**: If STT detects speech in a video clip and any separate speech clip overlaps that time window, adding the separate speech clip is BLOCKED unless the transcript is intentionally different dialogue and the mix plan explicitly calls for simultaneous speakers. Lowering embedded speech to `0.08`, `0.05`, or any other "nearly muted" value is still audio doubling and is BLOCKED.
- **Montage-narration overlap hard stop**: If a montage/B-roll clip was generated with `sound:on`, and post VO/TTS is planned over that same window, you must prove `co-gen SFX only` via STT or an equivalent speech audit before keeping the clip audible. Prompt phrases like `"no background music"`, `"deep bass impacts"`, `"whoosh transitions"`, or `"ambient sound only"` are not proof that the model did not generate spoken narration. If STT finds speech, either mute/remove the clip audio or drop the separate VO; do not ship both.
- **Lipsync/audio_list priority**: When the segment lineage is `audio_list_tts` or visible on-camera sync speech, the embedded audio is the intended speech source after generation. Do not add the same TTS/VO again in assembly. If STT confirms the embedded transcript matches closely enough, keep the segment audio at dialogue volume. If STT shows the generated video says different words from the intended line, do not cover it with the correct VO; regenerate with the correct `audio_list`/exact dialogue contract, or ask for a strategy change before treating the shot as silent B-roll.
- **Wrong embedded-speech recovery tree**: If a visible-speaking segment has `embedded_speech=true` and STT transcript does not match the planned line/language/speaker intent, assembly has only four valid paths: (1) keep the embedded speech only if it is intentionally accepted as the final spoken content, (2) regenerate the segment with the correct `audio_list` or exact quoted dialogue, (3) regenerate/replan the shot as genuinely silent/non-speaking B-roll with the required override fields, or (4) ask/surface the strategy change. Disallowed: lowering the clip to 0.07/0.05/0.01 and overlaying the correct VO, calling wrong embedded speech "ambience", or using final ffprobe success as semantic approval.
- **Unknown/wrong language hard stop**: If a visible-speaking segment was generated from a prompt without exact quoted dialogue or `audio_list`, do not assume the language is acceptable. Run STT. If detected language or transcript does not match the planned `spoken_language` and line intent, regenerate with exact quoted dialogue / `audio_list`, or replan as disclosed silent B-roll. Do not ship arbitrary co-generated speech as "natural ambience".
- **Vocal music / singing priority**: When the segment lineage is `audio_list_music` and the visuals show a person/character singing or lip-syncing lyrics, treat embedded audio like on-screen dialogue. The original song asset may not be layered back over a muted generated clip. If exact master audio is required, stop and surface the tradeoff or use a waveform-preserving lip-sync route; do not ship a hidden clock swap.
- **Mouth-motion/source mismatch hard stop**: Muting a speech-bearing video clip does not make its mouth movement compatible with a separate VO. If the visual subject is visibly speaking and STT confirms embedded speech or the generation lineage is visible on-camera speech, a separate VO/TTS track for that same speaker/time window is BLOCKED even when the video clip volume is set to `0`.
- **Mixed cross-shot narration rule**: A final can mix visible speech and off-screen narration when the source family is intentional. If the same perceived speaker appears in both roles, visible-speaking clips must come from the shared speech source via `audio_list_tts` or an otherwise approved identity-preserving route, while off-screen narration may be placed as post VO from the same source family. Do not repair voice identity at assembly by muting a visible-speaking clip and laying a separate VO over it.
- **Duplicate-audio recovery rule**: If the user complains about "duplicate", "advanced", "echo", or "two voices" after an `audio_list` lip-sync preview, first identify whether two clocks were layered. The default repair is to remove the separate source/master track and preserve the generated segment's native audio. Do not default to muting the generated segment audio, because that usually breaks mouth sync.
- **Fail closed**: If speech analysis fails and the doubling decision depends on it, stop.

### 2. Transitions & Timeline

- Crossfade (500–750ms) for continuous performance; cut for scene changes. See `references/editing-rhythm-design.md`.
- **Montage junctions:** If the plan marks a montage block, each hard cut should match a stated motive (§6). Unmotivated cuts → replan or ask; do not paper over with dissolves. Dissolve is not a default montage fix.
- **Parallel continuity junctions:** If handoff has `parallel_continuity_activation: true`, compare each junction's previous `exit_anchor` against next `entry_anchor`.
  - If `frame_chain_mode: pre_planned`, also verify junction pixels roughly match the planned `END_Sn` still (identity, horizon, key prop positions). Mismatch → prefer single-segment regen with same stills before tail-frame repair.
  - If `junction_link_mode: tail_extract_junction`, expect junction to follow extracted still — do not treat storyboard mismatch as failure.
  - If matched, hard cut or short overlap is allowed; record junction reason (`action_match`, `cause_effect`, or `audio_bridge`).
  - If mismatched, insert planned bridge (1-2s) instead of default dissolve; then replan/ask if still broken.
- **Bridge-first recovery:** For continuity mismatches, prefer bridge insertion over full segment regeneration unless speech correctness or identity consistency is broken.
- Fade and crossfade are mutually exclusive at same cut point.
- Duration: `actual = Σ(segment_durations)`. Crossfade does NOT reduce total duration — it extends the previous clip's timeline beyond its `out_ms` to create the overlap region.
- **Crossfade overlap strategy**: If source media has frames beyond `out_ms`, real frames fill the overlap (smooth transition). If source ends at `out_ms`, the last frame freezes during overlap. For smooth transitions, set `out_ms` shorter than actual source duration to reserve real frames for the overlap zone.
- Audio `start_ms` = sum of preceding clips' **output** durations. Output duration = `(out_ms − in_ms) / speed`.
- All `_ms` suffix — no frame-based fields.
- **Timeline ledger gate**: Before constructing the edit spec, write the intended timeline as a ledger and derive every `start_ms`, `end_ms`, and `source.out_ms` from it. Never maintain separate mental clocks for video and audio.
- **Audio start copy gate**: When preserving audio from a source video in a separate `kind=audio` track, the audio clip's `start_ms` must equal that source video's visual `timeline_start_ms` from the ledger, unless an explicit creative offset is documented. Chapter cards, dividers, and crossfades do not justify starting the next video's audio early. Example: `video1 0-31208`, `card1 31208-33208`, `video2 33208-43208`, `card2 43208-45208`, `video3 45208-57333` means audio starts must be `0`, `33208`, `45208`. Values like `32708` or `43208` for video3 are BLOCKED.
- **Same-source audio preflight**: Immediately before `execute_edit_video`, compare every audio clip sourced from a file that also appears as a primary video clip. If `audio.start_ms != video.timeline_start_ms`, stop and rebuild the spec. Do not call the tool and hope the renderer aligns it.
- **Divider/card clips**: For a still/image chapter card in the main sequence, use a primary `kind=video` image clip with `source.in_ms:0` and `source.out_ms:<card_duration_ms>`, or use an explicitly positioned overlay/background with both `start_ms` and `end_ms`. Do not express a 3s card after a 10s clip as a sequential color clip with only `end_ms:13000`.
- **Sequential vs absolute timing**: In a sequential `kind=video` track, file/image clips advance the timeline by their source window. Absolute `start_ms`/`end_ms` fields belong to overlays, text/subtitles, and explicitly positioned effects. If a visual element is meant to occupy 10000-13000ms, the ledger must show `duration_ms:3000` and the edit spec must encode a 3000ms element, not a 13000ms sequential element.

### 3. Volume Mixing

| Priority | Layer | Volume Rule |
|:--------:|-------|-------------|
| P1 | VO / narration | 1.0, `dbfs: -16` — never masked |
| P2 | On-screen dialogue (co-gen/lipsync) | 1.0 — duck BGM, never duck this |
| P3 | Key SFX (co-gen) | ≥ 0.6 — duck only under P1 |
| P4 | Ambient (co-gen) | 0.3–0.5 under VO |
| P5 | BGM | 0.08–0.15 under VO; 0.20–0.30 in gaps; ≤0.25 standalone |

Per-segment mixing: characterize embedded audio type (dialogue/SFX/ambience) via `analyze_audio` + `analyze_file_content`, then set volume accordingly. Do not apply flat volume across all segments.

Track-level and master loudness normalization: `track.normalize_lufs` applies EBU R128 two-pass linear normalization to an entire track before mixdown (overrides per-clip `dbfs` on that track). `output.target_lufs` applies a final master normalization after all tracks are mixed. Priority: `track.normalize_lufs` > `clip.dbfs` > raw audio.

Speech overlap rule: volume ducking is for SFX, ambience, and BGM under VO. It is not a repair for wrong or duplicate speech. When the video clip contains embedded speech, assembly should normally keep that speech and suppress the separate VO/TTS track, especially for `audio_list_tts` or visible on-camera sync speech. `volume > 0` on a speech-bearing video clip plus overlapping separate speech is allowed only for intentional multi-speaker dialogue that is explicitly in the script. Otherwise it is BLOCKED.
For montage/B-roll with post narration, "leave the source video at 0.2-0.4 just in case it only has SFX" is not acceptable without STT confirmation. If speech status is unknown, the only safe defaults are: audit first, or mute the source clip before adding VO.

Clock ownership rule: for `audio_list_tts` and visible-vocal `audio_list_music`, `volume: 0` on the generated video clip is allowed only for an explicitly approved approximate-sync strategy or full silent-B-roll rewrite. It is not an acceptable way to "clean up" duplicate audio while keeping the same mouth movement.

### 4. VO Production

- Route: `provider=elevenlabs`, `mode=text2speech`, `model=eleven_v3`. Voice catalog in `references/vo-design-principles.md` Section 6.
- One call per spoken line (no batch mode).
- **Measured-duration gate**: Probe every produced VO asset with a duration-capable tool before final assembly (`video-editor__ffprobe` preferred; `get_file_info` only if it explicitly returns duration). `audio_produce.duration` is a hint, not the final authority. If the VO asset cannot be measured, BLOCK.
- **VO fit gate**: Before `video-editor__execute_edit_video`, build a VO fit ledger as described in `references/video-editor-tool-guide.md`. BLOCK if any line's measured duration, subtitle last-character timing, source window, visual window, or next-line start disagree.
- **Source-window gate**: `source.out_ms` trims media. It must cover the full measured VO, or be omitted when the full asset should play. Never shorten VO to hit a visual cut or target duration.
- **Overflow handling**: If complete measured VO does not fit, regenerate shorter complete VO, retime/extend visuals, or ask the user. Do not use `source.out_ms`, fade-out, or speed-up as a hidden repair.
- **Visual-effect preservation gate**: Do not equate "VO-first" with "force the current footage to match the VO." After VO is measured, compare the needed visual window against the original visual design and target duration. If fitting VO would require any video clip speed `<0.85` or `>1.15`, total duration drift `>10%` from a hard/communicated target, or static/repeated/padded visuals that weaken the intended effect, assembly is BLOCKED. Choose one of these paths:
  1. regenerate a shorter complete VO with the same meaning,
  2. generate additional or replacement visual beats sized to the measured VO,
  3. explicitly extend the final duration when the user's target was soft and the pacing still works,
  4. ask the user to choose between longer duration, shorter narration, or more generation.

  Small speed changes inside `0.85-1.15` are allowed only for fine timing polish. Large slow-motion/fast-motion is allowed only when it is a deliberate creative effect declared in the script, not a hidden timing repair.
- **Subtitle handoff**: Use the timed subtitle artifact returned by `audio_produce` when available, and apply the gates in **Subtitle Hard Stops** plus `references/video-editor-tool-guide.md`.
- Generic TTS ≠ identity-preserving dub — never substitute without user acknowledgement.
- If VO fails repeatedly, surface it — don't silently ship music-only.

### 5. BGM Production

- **Timing modes**: Video-first (default — generate BGM after all segments, use `composition_plan`), Music-first (BGM drives video via `audio_list`), Independent (parallel, prompt mode).
- Duration must exactly match visual timeline. Calculate from actual segment durations.
- `music_generate`: `prompt` mode or `composition_plan` mode (mutually exclusive). Composition plan sections ≥3000ms each.
- No copyrighted references in music prompts.
- **Adaptive strategy**: Dense sound-on → sectional BGM, not wall-to-wall. BGM bridges gaps.
- If visual rhythm changed after re-gen, existing BGM likely misaligns → re-generate video-first.
- BGM planned but file missing → BLOCKED. Do not silently drop planned BGM.

### 6. Duration Enforcement & Non-Generative Edits

- Verify segment durations via ffprobe. Trim overlong with `in_ms`/`out_ms`. Total must match target ±1s.
- Visual trims are allowed to hit target duration; VO trims are not. If visual duration and complete VO duration conflict, visual timing yields or the VO copy is regenerated shorter.
- Speed changes: apply `speed` on full source range.
- Available: trim, speed, crop, scale, volume, fade, keyframe animation (`scale_kf`, `speed_kf`, `opacity_kf`, `x_kf`, `y_kf`).
- Audio-only editing (no video tracks) → output `.aac`.
- For direct editing tasks with an obvious target duration (for example `clip A + 3s card + clip B`), compute `expected_duration_ms` before rendering. If the edit tool returns a different duration, rebuild the edit spec before delivery.

### 7. Cover Image (after assembly, before delivery)

- Priority: existing key frame / style_ref > extracted frame from ~1–2s > generated via `image_generate`.
- Hard-reject near-black, blurred, transitional frames.
- Bake mechanism: place the cover image file as the first `kind=video` clip with a short duration (~100ms `source.out_ms`), silent. Image files are valid video track inputs and render as still-image clips held for the clip duration. Skip if dialogue starts at 0s.

### 8. Reassembly & Integrity

- Always from original individual segments, never from rendered composite.
- Preserve co-gen audio at volume 1.0 unless explicitly muted.
- Required sequence manifest self-check: before `video-editor__execute_edit_video`, compare the manifest against `tracks[].clips[]` using the Audio Audit gates.
- Subject coverage self-check: if generation handoff includes a Subject Coverage Manifest, compare every recurring subject's `visible_in_sequences` and `ref_asset` against the exact video clips being assembled. Assembly is BLOCKED if any clip for a sequence containing that subject was generated without the required reference, was generated before the reference existed and marked stale, or lacks per-sequence payload proof. Do not assemble a mix of anchored and unanchored character/product segments.
- Visual identity QA: for recurring visible people/products, extract or inspect representative frames from each relevant segment before final delivery. If frames show a clear different person/product category from the declared reference (for example a presenter changes race/age/gender/body type across cuts), regenerate the offending segment or ask for a strategy change; duration/ffprobe success is not sufficient.
- Final edit-spec self-check: compare every VO ledger row against the exact `tracks[].clips[]` values immediately before calling `video-editor__execute_edit_video`. If any VO line is shortened, overlapped, or displaced by later section boundaries, rebuild the timeline before rendering.
- Final timeline self-check: compare the full timeline ledger against the exact `tracks[].clips[]` values immediately before `video-editor__execute_edit_video`. Check visual duration, audio `start_ms`, audio `source.out_ms`, overlay windows, and divider/card durations.
- Post-render: verify duration via `video-editor__ffprobe` on the exact file that will be shown to the user. Delta >1s from the ledger or tool-returned duration → structural problem, rebuild from source assets (don't trim composite). If the edit tool itself returns a duration that contradicts the ledger, do not call `show_final_video`; rebuild first.
- Every planned shot must appear in edit spec — no silent omissions.

### 9. Interruption Recovery

- Inventory surviving assets, reuse them.
- Preserve successful parameter patterns. Pick up from failure point.
- Inform user what survived and what remains.

---

For edit-spec structure, DSL patterns, text/subtitle design, and common errors, see `references/video-editor-tool-guide.md`.
