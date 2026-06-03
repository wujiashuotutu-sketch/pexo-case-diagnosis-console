# Content

## Contents

- **0. Scope Boundary** - SFX, ambience, music (dialogue / monologue / voiceover covered by other refs)
- **1. Sound Style Positioning** - matching sound design to visual and emotional tone
- **2. Music-to-Picture Relationship** - sync, underscore, contrast, narrative function
- **3. Sound Effects & Music Balance** - layering logic and mix priorities
- **4. Beat-Sync Cut-Point Design (When User Provides BGM)** - planning cuts to music beats
- **5. Creative Planning Application Guidance** - how to plan audio during the creative-script phase
- **6. Audio Layer Priority Hierarchy** - VO / dialogue / SFX / ambience / BGM priority order
- **7. Mixing Principles - Sound Type Coordination** - ducking, layering, coexistence rules
- **8. Scene-Specific Mixing Presets** - concrete mixing setups for common scene types


## 0. Scope Boundary

This guide covers **sound effects, environment / atmosphere, and music**.

- **Dialogue / monologue** are handled by `dialogue-monologue-design-kb.md`
- **Voiceover / narration** is handled by `vo-design-principles.md`

Use this guide for soundtrack-layer thinking: what the world sounds like, how action accents are heard, and whether music supports or leads the picture.

## 0.5 Audio Narrative Mode

Before script lock or assembly, every sequence must declare exactly one primary audio narrative mode:

- `on_camera_sync_speech` - the visible person/character is intended to speak on screen.
- `voiceover_narration` - spoken content is off-screen narration.
- `silent_broll_with_text` - no spoken layer; meaning is carried by visuals, music, and/or text.
- `nat_sound_only` - production sound / ambience / action sound is the primary audio.

If a single moment seems to need two conflicting primary modes, resolve that in script design first. Do not defer the decision to assembly.

## 1. Sound Style Positioning

| Style | Characteristics | Suitable For |
|-------|----------------|-------------|
| **Realistic Ambience** | Natural, understated, ambient-dominant | Documentary, lifestyle, emphasizing authenticity |
| **Exaggerated Foley** | Amplified real sounds, dramatic, emphasizing action rhythm | Product feature demos, energetic ads |
| **Minimal Sound Design** | Few elements, generous silence, accents only at key moments | Premium brands, artistic, visuals-led |
| **Cinematic / Epic** | Richly layered, low-frequency impact, strong spatial depth | Brand films, automotive/tech, awe-inspiring feel |

## 2. Music-to-Picture Relationship

### Synchronization
Music rhythm and picture editing are tightly aligned - downbeats match cuts, climax matches visual climax. Suited for energetic ads, rhythm-driven videos.

### Music-Driven
Music drives the overall rhythm; visuals follow the musical structure (intro -> verse -> chorus). Suited for MV-style, fashion/art content.

### Atmospheric Background
Music stays in the background, supporting mood without competing with VO or key information. Suited for VO-led, information-delivery content.

### Counterpoint
Music emotion doesn't fully match the visuals - contrast creates tension and additional emotional layers. Suited for artistic expression, complex emotional narratives.

## 3. Sound Effects & Music Balance

- **Music-dominant**: Sound effects are minimal and don't compete with music. Suited for music-driven content
- **SFX-dominant**: Rich sound effects, music as background support. Suited for emphasizing realism
- **Balanced**: Each serves its purpose without interference. Suited for most content

## 4. Beat-Sync Cut-Point Design (When User Provides BGM)

### 4.0 Current Tool Boundary

When the workflow uses `video-editor__analyze_audio`, treat it as a **coarse audio preflight** tool only. It currently provides:

- `duration`
- `bpm`
- `lufs`
- `lufs_range`
- `true_peak`

Use these fields to judge:

- rough tempo / pacing density
- whether the music feels slow / medium / fast
- whether the file length is suitable for the planned structure
- whether loudness is unusually weak / hot before mixing

Do **not** treat it as a source of:

- beat timestamps
- downbeats
- verse / chorus / outro boundaries
- climax windows
- lyric / emotional semantics

In current music-first workflows, the **primary rhythm coupling mechanism** is passing the audio itself into Seedance via `audio_list`. `video-editor__analyze_audio` is supporting metadata, not the thing that creates beat-accurate sync.

When the user supplies a specific BGM track and the creative direction calls for beat-synced editing (Synchronization or Music-Driven relationship), shots should land on musically impactful moments - not just any beat. The goal is **accent-beat alignment**: cuts happen on strong drum hits, not every quarter note.

> **How this works in practice**: When the user provides a BGM track (or in a music-first workflow), combine the tools by role. Use `video-editor__analyze_audio` for **coarse signal facts** such as duration, BPM, and loudness health. Use `analyze_file_content` only for **qualitative interpretation** - e.g. where the music seems to lift, drop, thin out, or change emotional mode. Do **not** treat either tool as a reliable beat-grid / segment-boundary engine in the current stack. For actual generation, let the audio itself drive sync through Seedance `audio_list`; use tool outputs only to guide coarse planning, sequence pacing, and mix decisions. If you reference musical structure in planning, frame it as approximate creative guidance rather than exact timestamp truth.

### 4.1 Which Beats to Cut On

Not all beats are equal. A 120-BPM track has a beat every 500ms - cutting on every one produces chaotic, unwatchable results. The beats worth cutting on are **accent beats**: moments where percussive energy spikes above the local average. Think kick-drum impacts, snare hits, cymbal crashes - not hi-hat ticks or sustained pads.

When planning beat-synced sequences, describe **where** in the music the cuts should land, referencing structural cues rather than timestamps:
- "Cut on the downbeat of each bar" (every 4th beat in 4/4 time - roughly every 2s at 120 BPM)
- "Cuts align with the snare hits in the chorus"
- "Major transitions land on the intro -> verse -> chorus boundaries"
- "Quick cuts during the drum fill, then hold a wide shot on the drop"

### 4.2 Beat Density & Shot Duration

The density of accent beats determines how fast the cuts feel:

| Accent-Beat Spacing | Resulting Cut Pace | Suited For |
|---|---|---|
| **>=3s apart** | Slow, contemplative | Atmospheric, mood pieces, luxury brand |
| **1.5-3s apart** | Standard rhythm | Most content - comfortable viewing pace |
| **0.8-1.5s apart** | Fast-cut, energetic | Hype reels, sport/action, chorus sections |
| **<0.8s apart** | Staccato burst | Only for brief peak moments (2-4s max); sustained use causes visual fatigue |

If the music has a section where beats are extremely dense (e.g., a drum fill), you don't cut on every beat - hold a dynamic shot (camera movement, zoom) through the fill and cut on the resolution beat at the end.

### 4.3 Minimum Separation Principle

Adjacent cuts that are too close together (<0.8s) compete for attention. When two strong beats are very close, prefer cutting on the stronger one (higher percussive energy) and letting the weaker one pass as an in-shot visual accent (a camera push, a flash, a subject movement) rather than a hard cut.

### 4.4 Soft Landing

Beat-synced doesn't mean robotic. A cut that arrives 50-100ms early ("on the upbeat") creates anticipation; 50-100ms late ("on the backbeat") creates a relaxed, groovy feel. Describe this in creative terms - "cuts that lean slightly ahead of the beat for a driving energy" - the generation model interprets the prompt rhythmically.

## 5. Creative Planning Application Guidance

**Describe sound style qualitatively**, e.g.:
- "Realistic ambience as the base, with refined product foley, creating a warm everyday atmosphere"
- "Cinematic sound design, strong low-frequency impact, richly layered, amplifying a sense of awe"

**Describe music style qualitatively**, e.g.:
- "Upbeat jazz, piano and bass-led, positive energy, music synced with picture rhythm"
- "Warm acoustic guitar, slow tempo, serving as atmospheric background without interfering with VO"

**Describe the audio-visual relationship**, e.g.:
- "Music drives the rhythm; visuals follow the musical structure"
- "Music serves as an atmospheric background layer, supporting mood without competing with visuals and VO"

**When beat-synced**, additionally describe:
- "Cuts land on the snare/kick accents, roughly every 2 bars - not every beat"
- "Fast cuts follow the drum pattern during the chorus; verses hold longer shots"
- "Transitions align with musical structure boundaries (intro -> drop -> verse -> chorus)"

**Avoid**: Specifying exact tracks, precise BPM, audio timelines, mixing parameters
**Focus**: Overall sound and music style, audio-to-picture/narrative relationship, layer balance, beat-sync strategy when applicable

## 6. Audio Layer Priority Hierarchy

All audio in a video follows a strict priority hierarchy. When layers compete for the listener's attention, lower-priority layers must yield (duck) so higher-priority layers remain clearly audible. This is the foundation of all mixing decisions.

| Priority | Layer | Typical Source | Role |
|:--------:|-------|---------------|------|
| **P1** | **Voiceover / narration** | TTS via `audio_produce` | Carries information and narrative. Must never be masked. |
| **P2** | **On-screen dialogue / monologue** | Co-generated (embedded in video) | Lip-synced speech integral to the scene. Near-VO priority. |
| **P3** | **Key action SFX** | Co-generated (embedded in video) | Reinforces visual impacts - footsteps, hits, product clicks, door slams. |
| **P4** | **Atmosphere / ambient** | Co-generated (embedded in video) | Environmental base - wind, crowd murmur, room tone, nature sounds. |
| **P5** | **BGM** | `music_generate` or user-provided | Supports mood and pacing. Lowest priority, never competes with speech. |

**Key principle**: P1 always wins. When a VO line is playing, every other layer must duck enough that the spoken words are instantly intelligible - no listener should have to "lean in" to understand the narration.

## 7. Mixing Principles - Sound Type Coordination

### 7.1 Core Principle: Layer Separation by Role

Each audio layer has a distinct role. Mixing is not about making everything equally loud - it's about ensuring each layer is heard at the right moment without masking others.

- **Narrative layers** (P1-P2): Carry meaning. Clarity is non-negotiable.
- **Accent layers** (P3): Punctuate the visuals. Should be felt, not dominant.
- **Bed layers** (P4-P5): Create atmosphere and emotion. Should be present but never compete.

### 7.2 VO / Narration Mixing Rules

VO is the highest-priority layer. When VO is present, ALL other layers must accommodate it.

| Scenario | VO volume | Video clip volume | BGM volume | Principle |
|----------|:---------:|:-----------------:|:----------:|-----------|
| VO alone (no co-gen SFX, no BGM) | 1.0 + `dbfs: -16` | 0 (silent clip) | - | VO is the only audio - full clarity |
| VO + co-gen SFX (no BGM) | 1.0 + `dbfs: -16` | **0.3-0.6** | - | SFX ducks to become a bed; VO dominates |
| VO + BGM (no co-gen SFX) | 1.0 + `dbfs: -16` | 0 (silent clip) | **0.08-0.15** | BGM deep-ducks; VO clear above music |
| VO + co-gen SFX + BGM (triple stack) | 1.0 + `dbfs: -16` | **0.3-0.5** | **0.08-0.12** | Most aggressive ducking - VO must cut through both layers |
| VO gap / transition (VO momentarily silent) | - | 0.7-1.0 (recover) | 0.20-0.30 (recover) | Layers briefly recover during VO pauses |

**Always normalize VO with `dbfs: -16`** - different TTS calls may produce different loudness levels. Normalization ensures consistent VO volume across the entire video.

### 7.3 Co-generated Dialogue (P2) Mixing Rules

When dialogue is co-generated inside the video (lip-synced to character mouth movements), it cannot be separated from the video track. The video clip volume must stay at 1.0 to preserve lip-sync fidelity.

| Scenario | Video clip volume | BGM volume | Principle |
|----------|:-----------------:|:----------:|-----------|
| Co-gen dialogue only (no BGM) | **1.0** | - | Dialogue lives in the video - full volume |
| Co-gen dialogue + BGM | **1.0** | **0.15-0.25** | Duck BGM only - never duck the video clip |
| Co-gen dialogue + VO narration | **1.0** | 0.08-0.15 | VO takes P1 priority, but video stays 1.0 for lip-sync. BGM ducks deepest. |

If a sequence is tagged `on_camera_sync_speech`, do not layer a separate VO track that repeats the same line. If a sequence is tagged `voiceover_narration`, do not keep a visibly speaking clip active under the narration unless the clip is intentionally treated as muted B-roll.

### 7.4 SFX + BGM Balance (No VO)

When there's no voiceover, the balance between co-generated SFX and BGM depends on their relative importance to the creative intent.

| Scenario | Video clip volume | BGM strategy | Principle |
|----------|:-----------------:|-------------|-----------|
| Heavy co-gen SFX (impacts, action) | **1.0** | No BGM, or BGM only in transitions/intro/outro at 0.15-0.25 | Let SFX carry the sound design |
| Rich ambient atmosphere | **1.0** | Very light BGM at 0.12-0.20, or sectional only | Ambience + light music coexist |
| Montage with mixed silent + sound-on | 1.0 (sound-on) / 0 (silent) | Vary by section - higher during silent clips | BGM bridges the silent gaps |
| BGM carries the arc alone (no SFX) | 0 (silent) | 0.30-0.50 | BGM is the primary audio |

### 7.5 Ducking Strategy - Implementation

Ducking is not a single volume knob - it requires **splitting competing tracks into time-aligned sections** with different volumes.

**When VO overlaps multiple video clips**, each overlapping clip gets ducked independently:
- Video clip with VO -> volume 0.3-0.6
- Video clip without VO -> volume 1.0

**BGM ducking for VO** - split the BGM track into sections:
- Sections where VO is speaking -> BGM at 0.08-0.15
- Sections between VO lines (gaps) -> BGM recovers to 0.20-0.30
- Sections with no VO at all -> BGM at 0.30-0.50

**Dense embedded SFX + BGM reshaping** - when co-gen SFX is dense (action sequences, complex environments):
- Don't try to turn down the video clip (can't stem-separate SFX from other co-gen audio)
- Instead, reshape BGM: mute or drop to 0.12-0.20 during dense SFX moments
- Bring BGM back in transitions, openings, endings, and quiet visual beats

### 7.6 Anti-Patterns

| Anti-pattern | Why it fails | Fix |
|-------------|-------------|-----|
| VO at 1.0 + video clip at 1.0 + BGM at 0.3 | VO buried under co-gen SFX and BGM. Narration inaudible. | Duck video clip to 0.4, BGM to 0.10 |
| All video clips muted (`volume: 0`) to "make room" for VO | Destroys all co-gen SFX and atmosphere. Video feels dead and unnatural. | Duck to 0.3-0.5 instead - atmosphere persists as a bed |
| Flat BGM volume throughout | BGM fights VO during speech, feels thin during gaps | Use sectional BGM - duck during VO, recover in gaps |
| VO without `dbfs` normalization | VO loudness varies across TTS calls. Some lines too quiet, others too loud. | Always set `dbfs: -16` on VO clips |
| Setting co-gen SFX video clip to 0.5/0.8 without VO | Unnecessarily degrades SFX quality when nothing is competing | Only duck video clips when VO actually overlaps that clip |

## 8. Scene-Specific Mixing Presets

Different video types have characteristic mixing profiles. Use these as starting points, then adjust per creative intent.

| Video Type | VO | SFX Role | BGM Role | Typical Mix |
|-----------|:---:|---------|---------|------------|
| **Product demo / tutorial** | Heavy | Light (product clicks) | Background | VO 1.0, video 0.3-0.4, BGM 0.08-0.12 |
| **Brand film / emotional** | Moderate | Rich atmosphere | Carries emotion | VO 1.0, video 0.5 during VO / 1.0 without, BGM 0.30 without VO / 0.10 during VO |
| **MV / music-first** | None | Sync to beat | Primary audio | Video 0 or 1.0 (depends on sound-on), BGM 0.40-0.60 |
| **Lifestyle / vlog** | Light | Ambient, natural | Warm background | VO 1.0, video 0.4, BGM 0.15-0.20 |
| **Action / sports** | None | Heavy impacts | Energetic support | Video 1.0, BGM 0.20-0.30 (sectional) |
| **Documentary** | Heavy | Environmental | Atmospheric | VO 1.0, video 0.3, BGM 0.08-0.12 |
