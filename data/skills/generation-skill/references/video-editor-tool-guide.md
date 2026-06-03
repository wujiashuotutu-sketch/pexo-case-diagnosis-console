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
| CJK font/render failure | Copy and timing are right, but glyphs/wrapping/font path fail | Use an exact CJK-capable catalog font id from `video-editor__list_fonts`, or ASS with an explicit CJK-capable style, after timing/source are validated |
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
- **Font catalog id hard stop**: `text_opts.font` takes a font family `id` returned by `video-editor__list_fonts`, not a display name and not a guessed slug. Before rendering any `kind=subtitle` or `kind=text` track containing Chinese, Japanese, Korean, Arabic, emoji, or mixed-script copy, call `video-editor__list_fonts` unless you already called it in the same session and have the exact ids. Use the returned `id` verbatim. For simplified Chinese, the known catalog id is `noto-sans-cjksc` (`name: "Noto Sans CJK SC"`); `noto-sans-cjk-sc` is invalid and blocked. If the catalog does not contain a font covering every required glyph, do not ship burned-in captions.
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
        "source": { "file": "asset://a_bgm", "in_ms": 0, "out_ms": 10000 },
        "volume": 0.8,
        "fade_out_ms": 1000
      }]
    }
  ]
}
```

**Crossfade does NOT reduce total video duration.** Total duration = sum of all clip durations = `5000 + 5000 = 10000ms`. Crossfade extends the previous clip beyond its `out_ms` to create overlap — if real frames exist beyond the trim point, they play; otherwise the last frame freezes. For smooth transitions, set `out_ms` shorter than actual source duration to reserve frames for the overlap zone.

### Crossfade with Preserved Source Audio

When a source video's original audio is preserved as a separate `kind=audio` clip, the moving visual source and the audio source must share one source clock. Check this invariant before rendering:

```text
video.start_ms - video.source.in_ms == audio.start_ms - audio.source.in_ms
```

If both `source.in_ms` values are `0`, the video and audio `start_ms` values must match. Crossfade opacity does not justify a 1s source-clock offset.

Blocked pattern:

```json
{
  "video": { "source": { "file": "asset://a_video", "in_ms": 0, "out_ms": 13250 }, "start_ms": 2000 },
  "audio": { "source": { "file": "asset://a_video", "in_ms": 0, "out_ms": 13250 }, "start_ms": 3000 }
}
```

This makes the moving picture 1000ms ahead of its original sound from `3000ms` onward.

Use one of these safe patterns:

| Intent | Timeline pattern |
|---|---|
| Transition includes original sound | Start moving video and original audio at the same overlap start, then fade audio in if needed. Example: image `0-3000`, video `2000-15250 source 0-13250`, audio `2000-15250 source 0-13250`. |
| Transition should be visually silent | Use a still frame/freeze frame/overlay-only visual during the overlap. Start moving video and original audio together after the overlap. Example: image `0-3000`, first-frame visual dissolve `2000-3000`, moving video `3000-16250 source 0-13250`, audio `3000-16250 source 0-13250`. |

### Two Videos + Middle Chapter Card

For direct edits like "combine these two videos and put this image as a chapter card between them", build a timeline ledger first:

| Element | Timeline | Source window |
|---|---:|---:|
| clip 1 | 0-10000ms | 0-10000ms |
| chapter card | 10000-13000ms | still image held for 3000ms |
| clip 2 | 13000-23000ms | 0-10000ms |

Preferred primary-video pattern:

```json
{
  "output": { "width": 1080, "height": 1920, "fps": 30, "format": "mp4" },
  "tracks": [
    {
      "kind": "video",
      "clips": [
        { "source": { "file": "asset://a_clip_1", "in_ms": 0, "out_ms": 10000 } },
        { "source": { "file": "asset://a_chapter_image", "in_ms": 0, "out_ms": 3000 } },
        { "source": { "file": "asset://a_clip_2", "in_ms": 0, "out_ms": 10000 } }
      ],
      "transitions": [{ "type": "cut" }, { "type": "cut" }]
    },
    {
      "kind": "audio",
      "clips": [
        { "source": { "file": "asset://a_clip_1", "in_ms": 0, "out_ms": 10000 }, "start_ms": 0 },
        { "source": { "file": "asset://a_clip_2", "in_ms": 0, "out_ms": 10000 }, "start_ms": 13000 }
      ]
    }
  ]
}
```

Before rendering, run this exact preflight for every source video whose original audio is preserved:

```text
video.start_ms - video.source.in_ms == audio.start_ms - audio.source.in_ms
```

Hard stop: do not encode a 3s card after a 10s clip as `{ "source_type": "color", "color": "#000000", "end_ms": 13000 }` inside a sequential `kind=video` track. That can become a 13000ms local clip and push following video later. Encode the card as a 3000ms still/image clip, or as a local color clip with `start_ms:0,end_ms:3000` plus an absolute overlay at `10000-13000ms`.

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

### Image as Video Clip (still-image hold)

`kind=video` and `kind=overlay` tracks accept image files (JPEG, PNG, WebP) as `source.file`. Image files render as still-image clips held for the duration defined by `source.out_ms - source.in_ms`.

```json
{
  "tracks": [{
    "kind": "video",
    "clips": [
      { "source": { "file": "asset://a_title_card_image", "in_ms": 0, "out_ms": 3000 }, "fade_in_ms": 500, "fade_out_ms": 500 },
      { "source": { "file": "asset://a_video_segment", "in_ms": 0, "out_ms": 10000 } }
    ],
    "transitions": [{ "type": "crossfade", "duration_ms": 500 }]
  }]
}
```

Use cases: cover bake-in (image as first ~100ms clip), title/end cards, Ken Burns (image + `scale_kf`), mid-video product stills, infographics.

### Image / Video Overlay (PIP, watermark, logo)

`kind=overlay` places an image or video layer on top of the main video. Position via integer pixel fields.

```json
{
  "tracks": [
    { "kind": "video", "clips": [{ "source": { "file": "asset://a_main", "in_ms": 0, "out_ms": 15000 } }] },
    {
      "kind": "overlay",
      "clips": [{
        "source": { "file": "asset://a_logo" },
        "start_ms": 0, "end_ms": 15000,
        "x": 50, "y": 50, "width": 200, "height": 80,
        "opacity": 0.9, "z": 10
      }]
    }
  ]
}
```

### Solid Color Clip

`source_type=color` generates a programmatic solid-color frame. Uses `start_ms`/`end_ms` — do NOT use `in_ms`/`out_ms`.

In a sequential `kind=video` track, treat `start_ms`/`end_ms` on color clips as a local duration declaration, not as a safe way to express an absolute timeline endpoint after previous clips. For divider cards, prefer an image/still primary video clip with `source.out_ms`, or set color duration to the actual local duration (`start_ms:0,end_ms:3000` for a 3s card).

```json
{ "source_type": "color", "color": "#000000", "start_ms": 0, "end_ms": 1000 }
```

### Track-Level & Master Loudness Normalization

- `track.normalize_lufs`: Per-track EBU R128 two-pass linear normalization (overrides `clip.dbfs`).
- `output.target_lufs`: Master normalization after mixdown.
- Priority: `track.normalize_lufs` > `clip.dbfs` > raw audio.

### PNG Still Export

`output.format = "png"` exports the first rendered timeline frame. Use `fps=1` with source trimmed to produce exactly 1 frame.

---

## Post-Render Duration Gate

After `video-editor__execute_edit_video`, compare the tool-returned duration against the timeline ledger before calling `show_final_video`. If the tool returns a duration that differs by more than 1000ms, rebuild the edit spec from the source assets. Final user-facing duration must come from the rendered/probed file, not from the plan.

For outputs with burned-in subtitles or spoken text captions, duration checks are necessary but not sufficient. Before `show_final_video`, inspect representative frames inside each subtitle window, including the first and longest cues for every subtitle/text track. Block delivery and reassemble if:

- CJK or mixed-script captions appear as square boxes/tofu glyphs.
- The visible caption language/script differs from the subtitle source.
- Captions are clipped, overflow the frame, or touch protected UI/safe-area bands.
- Captions duplicate or occlude existing baked text, faces, products, or critical action.

If frames show tofu boxes and the subtitle source text is correct, diagnose as `CJK font/render failure` first. Do not regenerate VO or rewrite subtitles before validating `text_opts.font` against `video-editor__list_fonts`.

## Common Errors

| Error Message | Cause | Fix |
|----------|------|------|
| `no tracks defined` | `tracks` is empty or missing | Include at least one track |
| `no source (file)` | Clip has no `source.file` and is not text/color | Add `source` |
| `text field is required` | Text track clip is missing `text` | Add `text` |
| `transitions count must be clips-1` | Transitions count does not match clips | Align the count |
| `speed must be positive` | `speed <= 0` | Use a positive number |
| `out_ms not set and no probe function available` | `source.out_ms` not set and duration cannot be probed | Explicitly set `source.out_ms` |
| Middle card becomes long black screen | A sequential divider/color clip used `end_ms` as an absolute timeline endpoint, e.g. `end_ms:13000` after a 10s clip, so it rendered as a long local duration | Build a timeline ledger; encode the card as a 3000ms still/image clip or local `start_ms:0,end_ms:3000`; align audio start times from the same ledger |
| Final reply says 23s but tool returned 33s | Agent answered from planned timeline instead of rendered facts | Treat tool-returned duration as authoritative; rebuild before `show_final_video`; final wording must use post-render/probed duration |
| Subtitle clip errors on MP3/WAV | VO audio file mistakenly used as subtitle source | Use `subtitle_file` / alignment JSON |
| `no source (file)` on `kind=subtitle` | Subtitle clip was written like a text clip, with inline `text` instead of `source.file` | Use `source.file` pointing to the timed subtitle artifact; do not downgrade to manual `kind=text` if timed subtitles exist |
| Subtitle "selected wrong" but source files match VO | Subtitle/audio windows overlap because start times were anchored to visual cuts rather than measured VO duration | Build the VO fit ledger, retime the next line, or shorten/regenerate VO; do not change JSON to ASS as the first repair |
| Chinese video contains English/pinyin screen text even though subtitles look correct | Readable words were requested in image/video prompts and baked into the visual layer | Regenerate the text-bearing key frame/segment with the correct language or remove the baked text; subtitle tracks cannot fix it |
| Chinese subtitles render as square boxes/tofu | `text_opts.font` is missing, Latin-only, or a guessed/non-catalog id such as `noto-sans-cjk-sc`; renderer fallback lacks CJK glyphs | Call `video-editor__list_fonts`, use exact returned id such as `noto-sans-cjksc` for Simplified Chinese, re-render, and inspect subtitle frames before delivery |
| ASS chosen immediately after a subtitle complaint | Complaint was not classified into source/timing/render/baked-text/occlusion buckets | Run subtitle/text layer triage first, then choose ASS only if render or timing-container needs justify it |
| Front subtitles lead or lag generated on-camera speech | Original TTS alignment was used after sync speech was baked into generated video | Build a clean speech rough cut and run speech2text ASR on it; use final-timeline ASR timestamps |
| `in_frame is not allowed in ms mode` | Frame fields used in millisecond mode | Switch all to ms-series fields |
