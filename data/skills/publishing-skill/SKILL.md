---
name: publishing-skill
description: After the final video is ready, package it for publishing - choose or generate the cover, export a prepend-share version when platform preview behavior requires it, and optionally co-design per-platform title/body/tags with the user. Use when cover, thumbnail export, publish packaging, social copy, or tags are in scope. Not for creative, generation, or modifying the video itself.
---

# Usage

**Input**: A finished master video after merge/export, plus any available context: target platform list, language, audience, goal, brand tone, must-include / must-avoid claims, user-provided timecode, or uploaded cover image.

**Output**:
- **Cover asset**: chosen still image plus provenance (`user upload`, `user timecode`, or `auto frame`)
- **Optional publish video**: prepend-share export when a platform is likely to preview from the file's first frames
- **Metadata**: aspect/safe-zone note, whether prepend was applied, and publish packaging notes
- **Optional social copy pack**: per-platform title/opening line, body/caption, CTA, and tags/hashtags when requested

**User-facing rule**: The default cover is the Pexo project thumbnail. Do not imply a mysterious second "export cover" unless the user overrides it for a platform-specific use.

**Default mount status**: This skill is **not mounted by default**. Basic cover generation is handled directly by `assembly-skill` (first delivery, Rule 9) and `modification-skill` (re-export, Rule 15) as part of their standard assembly workflow - they select or generate a simple cover image and bake it into the first 1-3 frames of the delivered MP4. Mount this skill only when advanced publishing features are needed: platform-specific cover design, social copy packs, prepend-share exports, or multi-platform packaging.

## Workflow

1. **Confirm scope and stage**
   - This skill starts only after the master video already exists.
   - It does not replace creative, generation, or merge/timeline assembly.
   - It owns the distribution layer: cover selection, cover export, prepend-share export, and optional social copy.

2. **Separate the two cover jobs**
   - Treat these as distinct assets, not one concept:
     - **Project thumbnail**: in-app list/detail preview
     - **Social / off-platform cover**: feed preview, uploaded poster, or first-frame mitigation
   - The most common failure is using frame 0 from a fade-in master and getting a black thumbnail.
   - Treat **fade-in / black-intro masters** as a publishing hazard by default. If the video opens from black, dim fade, or incomplete reveal, assume frame 0 is not safe for preview or cover extraction.
   - For project thumbnails, do not default to frame 0. Prefer ~1-2s, or the first frame above a luminance threshold. For very short clips, prefer ~15-25% into duration.

3. **Resolve cover source priority**
   - Default priority:
     - **uploaded cover** > **user timecode** > **auto frame pick**
   - If the user provided both upload and timecode and they conflict, ask or follow product-level conflict policy if one exists.
   - If the user already uploaded a cover or selected a timecode, do not override it with auto-pick.

4. **Ask only at the right time**
   - Do not block upstream video creation with cover prompts.
   - Ask during publish/share/export:
     - keep auto cover
     - choose another frame
     - upload a cover
   - Prompt only when auto selection falls through its single decision tree and confidence is too low.

5. **Auto frame selection**
   - Use this only when no upload and no user timecode exist.
   - Goal: a sharp frame with strong information density and a hero subject that survives center-crop and UI overlays.
   - Mandatory bias: prefer a centered hero over an edge-heavy composition, even when the edge-heavy frame is slightly sharper.
   - Fade-in safety override: if the opening contains fade-in, dip-from-black, logo-on-black, or delayed subject reveal, do **not** sample inside that unsafe intro window. Start sampling only after the image is fully established.
   - Procedure:
     - Sample 2-3 timestamps uniformly in **[1.0, 2.0]**
     - Add the duration midpoint
     - If total duration is under 3s, sample in **[0.2T, 0.35T]** plus **0.5T**
     - Dedupe sample times before extraction
   - Hard reject:
     - fade-in frames or partially revealed opening frames
     - near-black frames
     - strong motion blur
     - obviously empty frames
   - Score survivors in this order:
     - sharpness
     - subject position / center safety
     - subject size and readability
     - transition safety
   - Decision tree:
     - unique highest score -> use it
     - top two within epsilon -> tie-break toward midpoint or ~1.5s
     - all rejected or all scores below floor -> do not ship silently; ask for manual frame or upload
   - Do not confuse this with generation continuity frame logic. This is for poster quality, not sequence chaining.

6. **Choose platform-specific cover design**
   - If the platform is known, cover design must be platform-specific. Do not reuse the same frame, crop, text density, and tone across Douyin, TikTok, Xiaohongshu, Reels, and Shorts by default.
   - Decide per platform:
     - frame or crop focus
     - visual priority
     - text density
     - text tone
     - layout feel
   - Read:
     - [references/social-publishing-guide.md](references/social-publishing-guide.md) for cover/copy adaptation
     - [references/cover-platform-notes.md](references/cover-platform-notes.md) for preview behavior and safe-zone considerations
   - Cover selection is for click intent, not cinematic prettiness alone.
   - Prefer at least one of:
     - decisive action
     - strongest product readability
     - strongest facial emotion / tension
     - before-after contrast
     - a surprising visual claim the caption can cash out

7. **Cover still at head of export**
   - Many platforms preview from the file's first frames. If the master starts dark or incomplete, the intended cover may be ignored.
   - After the final cover is fixed, export a publish-bound video with a very short still prepended when platform behavior makes this worthwhile.
   - Rules:
     - prefer **1-3 frames**
     - extend to **<=0.5s** only if needed
     - the prepend segment is normally silent
     - do not globally delay the full audio track
     - if dialogue starts at 0s and the pipeline cannot preserve sync cleanly, skip prepend and rely on uploaded cover where supported
   - If a publish surface effectively uses the **first frame as the cover**, and the workflow requires the cover to be merged into the outgoing video file, prepend is mandatory: the file's first visible frame must already be the intended cover still.
   - For **X publish flows**, assume this risk is real. If the master starts with fade-in or black, produce an X-safe publish export with the selected cover still baked at the head instead of trusting the raw master.
   - Runtime simplification rule: when product cannot yet support a separate publish-bound export variant, the minimum acceptable fallback is to bake the chosen cover into the first **1-3 frames** of the single delivered MP4.
   - Do not wait for a dedicated publishing node just to prevent black-thumbnail delivery. Preview-safe frame 0 is a quality baseline.
   - This is a second-pass timeline/export step, not a generation change.
   - For multi-platform delivery, explicitly list what is produced:
     - cover image
     - share mp4 with prepend when needed
     - unchanged in-app master when applicable

8. **Route by platform behavior**
   - Two broad platform behaviors:
     - **Custom-cover upload friendly**: deliver the cover image; prepend is optional fallback
      - **First-frame / preview heavy**: recommend prepend-share export plus cover image as backup
   - Treat **X** as first-frame / preview heavy for packaging purposes. If the cover is being composited into the export for posting, frame 0 must be that chosen cover, not the master video's original opening frame.
   - Never assume one universal publish bundle. The platform set determines whether one or several deliverables are needed.

9. **Write cover text**
   - Keep cover text short, scannable, and aligned with the frame actually chosen.
   - Prefer one idea per cover.
   - Favor nouns, numbers, contrast, or a direct promise over vague adjectives.
   - Avoid writing the entire caption onto the cover.

10. **Optional social copy pack**
   - Do not run by default. Only do this when the user is publishing/sharing or explicitly asks for title, description, tags, or hashtags.
   - Social copy is distribution-layer work, not a replacement for creative narrative design.
   - When platform is unspecified, produce a locale-neutral draft and label it as not final for any specific platform.
   - When platform is known, produce copy **per platform**, not one universal template.
   - The package should typically include:
     - title or opening line
     - short caption
     - standard caption/body
     - CTA
     - tags/hashtags
     - platform notes when needed
   - Align the copy with the selected cover:
     - if the cover is a video frame, the copy should cash out that frame
     - if the cover is an uploaded image, the copy should align to that image unless the user asks for video-led copy instead

11. **Co-design with the user when copy matters**
   - Platform copy rules and display surfaces change over time. Do not pretend there is one permanent best caption format.
   - Surface useful tradeoffs to the user:
     - tone
     - emphasis
     - emoji or no emoji
     - stronger CTA vs. softer brand language
   - Prefer a small number of strong options over many weak ones.
   - Keep a user-aligned final version rather than endlessly brainstorming.

## Constraints

- This skill does not regenerate or modify the underlying video content.
- If cover compositing is unavailable, still provide frame choice, overlay guidance, and export strategy notes.
- Do not fabricate product facts, efficacy claims, pricing, data, or compliance-sensitive claims.
- Match brand tone when available; otherwise default to concrete, modern, human language.
- If the requested publish angle overclaims what the video visibly supports, say so and write the strongest safe version.
- If multiple platforms are in scope, do not collapse them into one generic cover recommendation unless the user explicitly asks for a shared fallback.

## Handoff Position

This skill normally runs:
- after `generation-skill` delivers a finished video
- after `modification-skill` when the final cut changes

It can also be rerun independently when the team wants a new cover, a new share export, or a new publish copy angle for the same final video.
