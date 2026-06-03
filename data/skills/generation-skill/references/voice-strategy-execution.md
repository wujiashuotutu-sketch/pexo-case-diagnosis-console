---
id: voice-strategy-execution
description: "Generation-stage voice strategy rules: spoken-source exclusivity, on-camera dialogue prompt requirements, VO-led visual constraints, audio_list lipsync timing, and assembly handoff contracts."
---

# Content

This reference is for generation-skill only. It does not replace the full voiceover writing and voice catalog guidance owned by script-skill and assembly-skill. Generation-skill uses this file to keep generated video prompts compatible with the declared voice strategy.

## 1. Scope Boundary

Generation-skill owns execution safety for spoken audio during video generation:

- It must preserve the Voice Strategy Declaration from the production plan.
- It must ensure each generated sequence has exactly one primary audio narrative mode.
- It must make video prompts compatible with later VO/TTS assembly.
- It must hand off enough audio lineage for assembly-skill to audit real media facts.

Generation-skill does not own:

- Writing long-form narration copy from scratch.
- Selecting the final voice catalog ID.
- Producing TTS assets.
- Burning subtitles.
- Mixing VO/BGM in the final timeline.

Those belong upstream to script-skill or downstream to assembly-skill.

## 2. Spoken-Source Exclusivity And Identity

Every spoken line must have exactly one source:

- `co_gen_dialogue`: the video model speaks it inside the generated clip.
- `audio_list_tts`: a speech audio asset is passed to `video_generate` and baked into the generated clip.
- `post_tts_vo`: assembly-skill produces or places the VO/TTS later.

Before any `video_generate` or `audio_produce` call, verify that no spoken line is assigned to more than one source.

Source exclusivity does not mean voice identity can drift. Decide voice identity from viewer attribution: if the audience will perceive the same person/character as the owner of words across multiple shots, or as both visible speaker and off-screen narrator, preserve a single voice identity:

- Use script-skill's `voice_identity_id`, `voice_id`, or voice-reference asset as the source of truth.
- Generate one master speech take or per-line speech assets with the same voice identity before the relevant video calls.
- Route visible lines as `audio_list_tts` so the video model bakes the same voice into lip/body performance.
- Route off-screen lines as `post_tts_vo` using the same voice identity/asset family.
- Do not mix open-ended co-generated speech for the visible line with catalog TTS for the off-screen line when both are meant to be the same speaker.
- Direct co-generation remains acceptable for a self-contained single-shot visible line when no later/earlier narration is presented as the same speaker, no exact voice source is required, and the line fits within the model's single-call limit.

Hard stops:

- Do not generate a visibly speaking character with open-ended speech while also planning TTS for the same semantic line.
- Do not put the same line in a video prompt and also ask assembly-skill to produce that same line as VO.
- Do not treat post-produced VO as a repair for a talking-head clip whose mouth movement was generated from a different speech source. Muting the clip's embedded audio does not remove the visual speech timing.
- Do not use `sound: "on"` visible-speaking prompts as a placeholder for a line that should be deterministic unless the exact line is in the prompt or a speech asset is supplied through `audio_list`.
- Do not call `video_generate` for visible speaking when the only speech contract is open-ended performance wording such as "speaking naturally", "continues speaking", "talks to camera", "explains", "presents", or "natural speech only". Without exact quoted dialogue or `audio_list`, this lets the model invent words and language.
- Do not use `co_gen_dialogue` for one line and `post_tts_vo` for another line under the same perceived voice identity unless the plan explicitly says voice/timbre mismatch is acceptable.

## 3. Audio Narrative Modes

Each sequence must declare one primary mode:

| Mode | Use when | Generation requirement |
|---|---|---|
| `on_camera_sync_speech` | A visible person or character is perceived as speaking. | Include the exact spoken line in the prompt, or use `audio_list` if deterministic speech/lipsync is required. |
| `voiceover_narration` | Speech is off-screen narration over visuals. | Avoid visible speaking cues. If the shot includes a face, describe listening, working, smiling, thinking, or acting, not speaking. |
| `silent_broll_with_text` | Meaning is carried by visuals and post text, not speech. | No speech cues. Use SFX/ambience only if sound is on. |
| `nat_sound_only` | Production sound, SFX, or ambience is the audio layer. | No explanatory spoken content. |

If one sequence seems to need both `on_camera_sync_speech` and `voiceover_narration`, split the sequence or rewrite the plan before generation.

Viewer-attribution hard stop:

- Do not classify speech as `voiceover_narration` just because the user's words resemble a narration label. First decide what the audience will perceive: is a visible body, face, mouth, gesture, or direct-camera performance the source of the words, or is an unseen narrator speaking over supporting visuals?
- If the voice must be coupled to a visible character's timing, gestures, mouth, or performance, do not treat it as generic off-screen VO unless the plan explicitly states that the narrator is off-screen and the visible character is intentionally silent B-roll.
- If the route is still ambiguous and affects lip-sync or performance quality, ask one focused clarification before generation. Otherwise choose the path that preserves visible performance, because post-produced TTS cannot repair a character that should have performed the line.
- If the viewer is meant to perceive the visible character as the speaker, a generation prompt that suppresses speech or describes only silent performance is BLOCKED unless the handoff contains all three override fields: `visible_speech_request_preserved: false`, `silent_broll_override_reason`, and `user_visible_speech_change_disclosed: true`.
- Voice consistency is not an override for visible speech. If the same perceived speaker needs one timbre across a visible line and B-roll narration, first generate the shared/per-line speech asset, then pass the visible line via `audio_list_tts`; put only off-screen lines in `post_tts_vo`.

## 4. On-Camera Speech Requirements

For `on_camera_sync_speech`, the prompt must provide a speech contract.

Acceptable patterns:

- Exact quoted line in the generation prompt:

```text
The presenter says in Mandarin: "I used to spend three or four hours a day on repetitive tasks."
```

- A speech audio asset in `audio_list` for lipsync, with the visual prompt describing the performance.

When using `audio_list` for speech:

- Treat the supplied speech asset as the only spoken source for that line.
- Treat the returned video's embedded/native audio as the only verified sync clock for the generated mouth movement unless the provider explicitly guarantees exact source-waveform passthrough. Do not assume the uploaded audio asset and the returned embedded audio are frame-identical just because their durations are close.
- The prompt must say the visible speaker performs the supplied audio/line; do not also invite unscripted sales talk, narration, explaining, announcing, or "speaking naturally".
- If the exact line is known, include it in the prompt as quoted dialogue even when the audio asset is also supplied. This gives the video model a text contract and reduces invented speech.
- The generation handoff must mark `audio_lineage: audio_list_tts` and `do_not_add_separate_vo: true` for that line.
- The generation handoff must also mark `sync_clock_source: embedded_generated_video_audio`, `source_audio_asset`, `native_audio_must_be_preserved: true`, and `do_not_replace_with_master_audio: true` when the line drives visible lips.
- If script-skill declares the same `voice_identity_id` for visible speech and off-screen VO, `audio_list` is the preferred visible-speech path. Use the shared or per-line TTS/reference-voice asset from the declaration instead of asking the video model to invent a new voice.
- The actual `video_generate` payload must include the returned speech asset in `provider_param.*.audio_list` before the call is submitted. A written plan saying `audio_list_tts` is not sufficient.
- If the provider requires a companion visual reference for `audio_list` and none exists, generation is blocked until the strategy names a concrete fallback: create/derive a visual reference and use `image_list + audio_list`, use exact quoted co-generated dialogue, or explicitly rewrite the shot as silent/non-speaking B-roll with user-visible disclosure.

When not using `audio_list`:

- Direct co-generation is valid for short one-shot visible speech when the line is self-contained, the total segment fits the model limit, no exact supplied voice/audio must be preserved, and no later/earlier off-screen narration is perceived as the same speaker.
- The prompt must still provide exact spoken content. A generic performance instruction is not enough when the final words matter.
- If the user's brief is in Chinese and does not specify another spoken language, exact visible dialogue should be written in Chinese/Mandarin. Directorial text may be English, but the quoted dialogue language must not be left for the model to infer.

Unacceptable patterns:

```text
He begins speaking naturally to camera.
He continues talking with warmth.
The host explains the app.
```

Those are performance descriptions, not spoken content. They allow the model to invent speech and must not be used when the final line is meant to be correct.

Language preservation:

- Spoken text should remain in the target spoken language.
- Directorial text can be English, but quoted dialogue should not be translated away from the intended audio language.
- When no target spoken language is explicitly specified, infer it from the user's brief language for visible presenter speech. A Chinese brief implies Chinese/Mandarin speech, not arbitrary model-invented language.

## 5. VO-Led Visual Constraints

For `voiceover_narration`, the video prompt must not invite accidental speech.

When the sequence shows a presenter, host, talking head, or character facing camera, and speech is planned as post TTS/VO, include an explicit exclusion:

```text
no speech, no dialogue, no voice, no spoken words
```

Also avoid action phrases that imply speech:

- "speaking to camera"
- "talking"
- "explaining"
- "presenting"
- "announcing"
- "reading aloud"

Use non-speaking alternatives:

- "looks at camera with a thoughtful smile"
- "nods gently while listening"
- "works quietly at the laptop"
- "uses the phone with a satisfied expression"
- "gestures silently toward the product"

If visible speech is creatively required, the mode is not `voiceover_narration`; use `on_camera_sync_speech` or split the sequence.

## 6. audio_list Lipsync Timing

When `audio_list` contains speech intended to drive visible speaking:

- Treat the audio asset as the primary clock.
- Do not set a longer duration than the speech audio unless the pause is already baked into the audio.
- Prefer omitting `duration` if the model can infer timing from the audio.
- If a precise tail pause is needed, either edit the speech asset to include that pause before generation or create a separate visual-only tail shot.
- After generation, treat the returned clip's embedded/native audio as the clock that the visual mouth motion actually followed. Assembly must preserve that embedded audio for exact sync unless there is a documented waveform-preserving passthrough guarantee.
- Do not mute the returned clip and reattach the source speech asset as a "clean" or "deduplicated" fix. That swaps the visual clock for a different audible clock and can create mouth drift even when both files are nominally the same length.

Never generate a longer talking-head clip from a shorter speech asset and then attach the original speech separately in assembly.

### User-supplied audio role

Before using a user-supplied audio file, decide what role it plays:

- If it is a lip-sync driver for visible speech/singing, ordinary `audio_list` generation makes the returned clip's embedded/native audio the safest sync clock.
- If it is the exact final master audio the user wants unchanged, do not promise frame-accurate mouth sync from ordinary `audio_list` unless a waveform-preserving route exists. Either preserve the returned generated audio for sync, disclose that keeping the master makes sync approximate, or use a route that guarantees one shared clock.
- If it is a rhythm or mood driver for B-roll or montage, `audio_list` can guide visual timing while the final master may be placed in assembly, as long as no visible lips are expected to match it.
- If it is a voice identity reference, first create or select matching speech assets, then route each line by visibility.

### Music-vocal / singing exception

When `audio_list` contains a song or vocal track and the visible subject is singing:

- Treat it like visible speech for sync purposes.
- Use `audio_lineage: audio_list_music` plus `visible_vocal_performance: true`.
- Mark `sync_clock_source: embedded_generated_video_audio`, `source_audio_asset`, `native_audio_must_be_preserved: true`, and `do_not_replace_with_master_audio: true`.
- If the user requires the exact uploaded master song as the final audible track, ask/declare the tradeoff before generation: this route may produce a visually reactive singing performance, but exact mouth sync is only guaranteed to the returned embedded/native audio unless a waveform-preserving lip-sync path is available.

## 7. Handoff Contract

Every generated segment handed to assembly-skill must include:

- segment file path
- actual duration if known
- sound status
- primary audio narrative mode
- audio lineage: `co_gen`, `audio_list_tts`, `audio_list_music`, or `silent`
- source audio asset and sync-clock fields for any `audio_list` visible performance
- spoken lines assigned to the segment, if any
- spoken lines assigned to post TTS/VO, if any
- `voice_identity_id` / `voice_id` / voice-reference asset for each spoken line when declared upstream
- any explicit speech exclusions used in the prompt
- `do_not_add_separate_vo: true` whenever a spoken line was provided through `audio_list_tts`
- `native_audio_must_be_preserved: true` and `do_not_replace_with_master_audio: true` whenever `audio_list_tts` or `audio_list_music` drives visible mouth movement

For every visible spoken line, also include a machine-checkable payload map:

```yaml
voice_source_payload_map:
  - line_id: line_01
    sequence_id: seq1
    speaker_visibility: on_camera
    planned_source: audio_list_tts
    exact_text: "..."
    source_audio_asset: asset://...
    payload_audio_list_present: true
    payload_visual_reference_present: true
    fallback_path_used: null
    assembly_guard: no_separate_vo_for_same_line
```

If `planned_source: audio_list_tts`, both payload flags must be true. If either is false, do not call `video_generate` yet and do not hand the segment to assembly as completed.

Also hand off a required sequence manifest:

- one row per planned required sequence
- `sequence_id`, intended asset name, returned file path, actual duration, audio narrative mode, audio lineage, expected spoken line IDs, and status
- replacement policy: whether the sequence is skippable or non-substitutable

If a required sequence failed or has no returned file path, generation-skill must not hand off to assembly as if production is complete. Regenerate/fallback that sequence, or explicitly replan the story and mark the manifest accordingly. Never duplicate another successful sequence to fill the missing slot when the missing sequence has different visual or spoken content.

Assembly-skill must still audit the real media facts with speech analysis. Generation-skill's declaration is a contract, not proof that the generated media followed it.

## 8. Fast Preflight Checklist

Before each `video_generate` call:

1. Is the sequence mode one of the four declared modes?
2. If the character visibly speaks, is the exact line in the prompt or supplied via `audio_list`?
3. If the original request had a visible-speech cue, is `visible_speech_request_preserved: true` and is the prompt free of speech exclusions? If not, does the handoff contain the full silent-B-roll override (`visible_speech_request_preserved: false`, `silent_broll_override_reason`, `user_visible_speech_change_disclosed: true`)?
4. If the line is post TTS/VO, does the prompt avoid visible speaking and include speech exclusions only when there is no preserved visible-speech cue?
5. Is any spoken line duplicated across co-gen/audio_list/post TTS?
6. If `audio_list` speech is used, does duration follow the audio clock?
7. If `audio_list_tts` depends on generated TTS, has that asset already returned before this `video_generate` call?
8. If the plan says `audio_list_tts`, is the returned speech asset actually present in `provider_param.*.audio_list`?
9. If the provider requires `audio_list` to be accompanied by image/video reference, is `image_list` or `video_list` actually present?
10. If `audio_list` drives visible lips/singing, did you mark the returned embedded audio as the final sync clock?
11. Is the handoff lineage clear enough for assembly-skill to audit?
