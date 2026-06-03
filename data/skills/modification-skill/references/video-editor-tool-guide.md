# video-editor Tool Usage Guide

> Parameter definitions follow the MCP tool schema as the authoritative source. This document covers what the schema cannot convey: capability boundaries, subtitle format specifics, text design principles, core DSL combination patterns, and common errors.

---

## Capability Boundaries

### analyze_audio

Lightweight audio inspection tool: duration, EBU R128 integrated loudness (LUFS), true_peak, and BPM.

**Cannot do** (do not assume these capabilities):

- Return beats, downbeats, segment boundaries, or best_window
- Auto-find climax sections, auto-split songs, or output structured musical section boundaries
- Recognize vocal content, lyric meaning, or emotional structure

Recommended use: pre-mix loudness assessment, volume anomaly diagnosis, rough tempo estimation, asset validation.

For transcripts and speech timestamps, use `audio_produce(provider=elevenlabs, mode=speech2text, model=scribe_v2)`. Do not use `video-editor__analyze_audio` as an ASR or subtitle timing tool.

---

## Subtitle Formats

`kind=subtitle` `source.file` supports the following formats:

| Format | Description |
|--------|-------------|
| `.ass` | ASS subtitle file |
| `.srt` | SRT subtitle file |
| `.vtt` | WebVTT subtitle file |
| `.json` | Character-level time-aligned JSON (ElevenLabs alignment format) |

### ElevenLabs Alignment JSON

The `subtitle_file` / alignment JSON returned by `audio_produce` can be used directly as `source.file` for `kind=subtitle`. The audio `file` (MP3/WAV) returned by `audio_produce` is NOT a subtitle file and cannot be used as subtitle source.

This applies to post-produced VO/TTS narration. For generated on-camera sync speech where the speech is already embedded in the video (`audio_list` lipsync, co-generated dialogue, or other sync-speech footage), do not use the original TTS alignment as final subtitle timing. First create a clean speech rough cut that matches the final visual timeline, then run speech2text ASR on that rough cut and use those final-timeline timestamps. The approved script may correct ASR wording for names, products, and acronyms, but it must not replace ASR timing.

If TTS source text contains performance tags (e.g. `[sighs]`, `[excited]`), subtitles must be cleaned - do not let control tags appear on screen.

### Subtitle/Text Layer Troubleshooting

"Subtitle wrong" is not one failure mode. Classify before changing format:

| Failure bucket | Evidence | Correct repair |
|---|---|---|
| Wrong timed caption source/content | Subtitle artifact or manual text does not match the spoken asset | Use the correct timed artifact or regenerate/correct the subtitle source |
| Caption timing/overlap | Correct artifact is selected, but clip `start_ms`/`end_ms` overlaps, drifts, or uses visual boundaries instead of VO duration | Rebuild from the VO fit ledger and subtitle last cue; do not switch formats as the first fix |
| CJK font/render failure | Copy and timing are right, but glyphs/wrapping/font path fail | Use a CJK-capable font or ASS style after timing/source are validated |
| Baked visual text wrong language/content | `analyze_file_content` shows wrong words already in video/image pixels | Regenerate the key frame/segment or replace the visual layer; subtitle files cannot repair burned-in text |
| Duplicate/occluding text | Existing title card/sign/UI/text shares the same window as subtitles | Remove duplicate overlay, add subtitle-skip window, or move captions to a safe zone |
| Visible-speech caption timing | Captions use original TTS timing after speech was baked into generated video | Build a clean speech rough cut and run final-timeline ASR |

ASS is a render/styling/timing-container choice, not a root-cause diagnosis. Use it after the bucket proves ASS is the correct repair.

Structure example:

```json
{
  "characters": ["ni", "hao", " ", "w", "o", "r", "l", "d"],
  "character_start_times_seconds": [0.0, 0.12, 0.24, 0.30, 0.38, 0.46, 0.54, 0.62],
  "character_end_times_seconds": [0.12, 0.24, 0.30, 0.38, 0.46, 0.54, 0.62, 0.74]
}
```

All three arrays must have the same length; time unit is seconds; each character's end time must be >= its start time.

`kind=subtitle` clips must use `source.file` pointing to a timed subtitle artifact. Inline `text` with `start_ms` / `end_ms` belongs to `kind=text`, not `kind=subtitle`.

Correct:

```json
{
  "kind": "subtitle",
  "clips": [{
    "source": { "file": "asset://a_subtitle_json" },
    "start_ms": 0,
    "end_ms": 9056,
    "text_opts": { "alignment": "2", "margin_v": "130" }
  }]
}
```

Wrong:

```json
{
  "kind": "subtitle",
  "clips": [{
    "text": "I am not going to sell you anything today.",
    "start_ms": 0,
    "end_ms": 2480
  }]
}
```

---

## Text Packaging Design Principles

Use these as **heuristics**, not rigid recipes.

- **Start from the text's job.** Informational captions want stability; packaging text can carry more personality.
- **Design for what the renderer can actually produce.** Don't invent effects relying on unsupported glyphs, emoji typography, or multiple fonts inside one text line.
- **Readability is the primary constraint.** When the frame is busy: simpler type, cleaner contrast, less motion, more breathing room, fewer simultaneous words.
- **Build hierarchy before decoration.** Emphasis from layout, grouping, contrast first; size and weight second; outlines, shadows, boxes, color, motion last.
- **Let typography hierarchy come from structure, not mixed fonts.** Build contrast through size, weight, spacing, color, placement, timing, and separate text elements.
- **Size text relative to role and frame, not by habit.** Judge from viewing distance, aspect ratio, information density, and how much of the frame already carries important detail.
- **Place text where the composition can support it.** Prefer zones with lower visual competition. Bottom-center is a natural subtitle default, not sacred if UI or platform chrome occupy that area.
- **Think in safe areas, not edges.** Reserve extra breathing room for square and vertical outputs. Account for the text block's full visual mass including outline, background box, and wrapping.
- **Design for the text block, not just the first line.** Long phrases and wrapped subtitles occupy more height than a single short line. Judge placement using the likely multi-line block.
- **Match styling to scene tone.** Premium/cinematic/luxury: restrained, low-noise. Social/creator/music/youth: punchier size contrast and stronger accents.
- **Respect the frame's focal subject.** Packaging text should support the main action, not sit on top of the face, product, or critical UI.
- **Use background support selectively.** Borders, shadows, translucent boxes are tools for separation, not default ornaments. Lightest treatment that keeps text readable.
- **Prefer render-safe copy over typographic novelty.** If a design depends on rare glyphs or symbol-heavy copy, simplify the text.
- **Mixed-script subtitle hard stop**: Select fonts by the complete subtitle character set, not by the dominant language. If subtitle or caption text contains any Chinese, Japanese, or Korean characters, including mixed Chinese-English lines, the render path must specify a known CJK-capable font/fontfile when the tool supports it, or use an `.ass` subtitle file with an explicit CJK-capable style. A Latin-only font is blocked even if most words are English. If no font path can cover all required glyphs, do not ship burned-in subtitles; report the limitation or use a renderer-safe fallback.
- **Prefer consistent systems across a video.** Keep subtitle/packaging style stable unless the story clearly changes mode.
- **When uncertain, choose the quieter solution.** Prefer the option that reads faster, obscures less, and sustains across the edit.
- **Timed subtitle artifact wins by default**: When `audio_produce` returned a `subtitle_file` / alignment JSON or other timed subtitle artifact, use that timed artifact as the default caption source. Do not casually rewrite the same spoken line as manual `kind=text`.
- **Manual spoken-caption fallback is exceptional**: `kind=text` is for short packaging text, titles, CTA lines, or truly exceptional coarse subtitle fallback. It is not the normal path for ordinary VO subtitles when timed subtitle data already exists.
- **Embedded sync speech uses rough-cut ASR timing**: For generated video that already contains on-camera speech, create a clean speech rough cut first, run speech2text ASR on that rough cut, and then add subtitles using those timestamps. Segment-level ASR plus offset math is acceptable only when the rough-cut path is unavailable and the edit contains no trims, speed changes, crossfades, or reordered segments.

### Text Motion Effect Selection

Choose text motion by the text's role, then select the lightest tool that can express that role.

- **Informational captions prioritize stability.** VO/dialogue captions, corporate/premium/medical/finance/education pieces: plain timed captions, subtle fade, or restrained whole-cue drift. Avoid typewriter, word-pop, karaoke.
- **Visual packaging text can carry stronger motion.** Titles, chapter words, CTAs, lyrics, rhythm-driven slogans: word-pop, scale, color changes, beat-sync motion when the text is part of the visual language.
- **Higher information density requires quieter captions.** Dense UI, fast camera, heavy SFX/BGM, continuous VO -> text should be a calm reading anchor.
- **Brand tone determines motion language.** Premium/cinematic/elegant -> low-presence fades. Energetic/creator/youth/music -> more visible word-level motion.
- **TTS alignment timing != creative text motion.** ElevenLabs alignment JSON is a timing source, not a design decision.

**Tool boundaries**:

| Tool | Suitable for | Not suitable for |
|------|------|--------|
| `kind=subtitle` + alignment JSON | Standard VO subtitles, preserving TTS timestamps | Complex per-word visual design |
| `kind=text` + `opacity_kf` / `x_kf` / `y_kf` | Short titles, CTAs, few keywords with fade/slide/drift, exceptional coarse fallback captions | Large-volume spoken subtitles, default VO subtitles when timed subtitle data exists |
| `.ass` + `kind=subtitle` | word-pop, karaoke, per-word color change/scale, beat-sync | - |

---

## Core DSL Patterns

The following examples show combination patterns that are non-obvious from the schema alone.

### Multi-Segment + BGM (crossfade transition)

```json
{
  "output": { "width": 1920, "height": 1080, "fps": 30 },
  "tracks": [
    {
      "kind": "video",
      "clips": [
        { "source": { "file": "asset://a_clip_1", "in_ms": 0, "out_ms": 5000 } },
        { "source": { "file": "asset://a_clip_2", "in_ms": 0, "out_ms": 5000 } }
      ],
      "transitions": [
        { "type": "crossfade", "duration_ms": 1000 }
      ]
    },
    {
      "kind": "audio",
      "clips": [{
        "source": { "file": "asset://a_bgm", "in_ms": 0, "out_ms": 9000 },
        "volume": 0.8,
        "fade_out_ms": 1000
      }]
    }
  ]
}
```

Note: visual duration = 5000 + 5000 - 1000 (crossfade) = 9000ms. BGM `out_ms` must match.

### Text Overlay

```json
{
  "tracks": [
    {
      "kind": "video",
      "clips": [{ "source": { "file": "asset://a_main", "in_ms": 0, "out_ms": 10000 } }]
    },
    {
      "kind": "text",
      "clips": [{
        "text": "Hello World",
        "start_ms": 1000,
        "end_ms": 5000,
        "text_opts": {
          "font": "inter",
          "fontsize": "72",
          "fontcolor": "white",
          "x": "(w-text_w)/2",
          "y": "h-text_h-h*0.10",
          "borderw": "3"
        },
        "fade_in_ms": 500,
        "fade_out_ms": 500,
        "z": 20
      }]
    }
  ]
}
```

Key points: `kind=text` clips have no `source`; use `start_ms` + `end_ms` for timing. Position via `text_opts.x` / `text_opts.y` (FFmpeg expressions, not integer `x`/`y`).

### ElevenLabs Subtitle Burn-in

```json
{
  "tracks": [
    {
      "kind": "video",
      "clips": [{ "source": { "file": "asset://a_main", "in_ms": 0, "out_ms": 30000 } }]
    },
    {
      "kind": "subtitle",
      "clips": [{
        "source": { "file": "asset://a_elevenlabs_alignment_json" },
        "end_ms": 30000,
        "z": 15
      }]
    }
  ]
}
```

`kind=subtitle` clips only need `source.file` pointing to a subtitle file (`.json` / `.ass` / `.srt` / `.vtt`).

If a timed subtitle artifact already exists for the spoken line, prefer this path over manual `kind=text` reconstruction.

### Audio-Only Output

```json
{
  "tracks": [{
    "kind": "audio",
    "clips": [{
      "source": { "file": "asset://a_music", "in_ms": 0, "out_ms": 20000 },
      "dbfs": -16
    }]
  }]
}
```

When there are no video / overlay / text tracks, the output is an `.aac` file.

---

## Common Errors

| Error Message | Cause | Fix |
|----------|------|------|
| `no tracks defined` | `tracks` is empty or missing | Include at least one track |
| `no source (file)` | Clip has no `source.file` and is not text/color | Add `source` |
| `text field is required` | Text track clip is missing `text` | Add `text` |
| `transitions count must be clips-1` | Transitions count does not match clips | Align the count |
| `speed must be positive` | `speed <= 0` | Use a positive number |
| `out_ms not set and no probe function available` | `source.out_ms` not set and duration cannot be probed | Explicitly set `source.out_ms` |
| Subtitle clip errors on MP3/WAV | VO audio file mistakenly used as subtitle source | Use `subtitle_file` / alignment JSON |
| `no source (file)` on `kind=subtitle` | Subtitle clip was written like a text clip, with inline `text` instead of `source.file` | Use `source.file` pointing to the timed subtitle artifact; do not downgrade to manual `kind=text` if timed subtitles exist |
| Subtitle "selected wrong" but source files match VO | Subtitle/audio windows overlap because start times were anchored to visual cuts rather than measured VO duration | Build the VO fit ledger, retime the next line, or shorten/regenerate VO; do not change JSON to ASS as the first repair |
| Chinese video contains English/pinyin screen text even though subtitles look correct | Readable words were requested in image/video prompts and baked into the visual layer | Regenerate the text-bearing key frame/segment with the correct language or remove the baked text; subtitle tracks cannot fix it |
| ASS chosen immediately after a subtitle complaint | Complaint was not classified into source/timing/render/baked-text/occlusion buckets | Run subtitle/text layer triage first, then choose ASS only if render or timing-container needs justify it |
| Front subtitles lead or lag generated on-camera speech | Original TTS alignment was used after sync speech was baked into generated video | Build a clean speech rough cut and run speech2text ASR on it; use final-timeline ASR timestamps |
| Subtitle looks clipped / too wide even though `x: "(w-text_w)/2"` is centered | Manual `kind=text` was centered but never width-fit against the protected stage | Split the cue first, then reduce styling weight; centering is not a fit check |
| Long spoken subtitle rendered as one heavy bottom box | Manual `kind=text` used for a full spoken sentence instead of a timed subtitle asset or split cues | Prefer `kind=subtitle` with timed artifact; otherwise split into shorter sequential cues before render |
| Emoji or decorative symbols make subtitle overflow / render inconsistently | Subtitle copy includes glyph-heavy characters the chosen font/render path may not handle safely | Remove non-essential symbols and use render-safe copy |
| `in_frame is not allowed in ms mode` | Frame fields used in millisecond mode | Switch all to ms-series fields |
