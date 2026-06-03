# VO Design Compatibility Bridge

Compatibility bridge for older runtimes that still read `generation-skill/references/vo-design-principles.md`.

Generation-skill does not own full VO writing, voice catalog selection, subtitle burn-in, or final mixing. Use `references/voice-strategy-execution.md` for generation-stage spoken-source routing.

Hard rules:

1. Every spoken line must have exactly one source: co-generated dialogue, `audio_list_tts`, or post-produced TTS/VO.
2. For visible on-camera speech, include the exact spoken line in the video prompt or provide a speech asset through `audio_list`.
3. For off-screen VO/narration, avoid visible speaking cues in the video prompt and hand the line to assembly-skill as post-produced VO.
4. If planned VO cannot fit the visual window, rewrite the copy or revise visual timing before handoff. Do not hand off a plan that depends on trimming VO with `source.out_ms`.
5. Generation handoff must include per-segment audio lineage, spoken-source declarations, and any `do_not_add_separate_vo` guards.
