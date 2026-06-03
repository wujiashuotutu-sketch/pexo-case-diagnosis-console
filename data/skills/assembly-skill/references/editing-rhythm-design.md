# Content

## 1. Rhythm Curve Design

Visualize the video's overall rhythm as a curve. Influencing factors: editing frequency, camera movement intensity, visual dynamics, audio energy, emotional fluctuation.

### Typical Rhythm Curves

| Curve Type | Characteristics | Suitable For |
|-----------|----------------|-------------|
| **Steady** | Stable intensity with minor fluctuations | Mood/atmosphere videos, product showcases, tutorials |
| **Progressive** | Gradually builds from low to high | Emotional accumulation, value progression, climax build |
| **Undulating** | Distinct highs and lows | Complex narratives, strong emotional contrasts |
| **Slow-then-Fast** | Relaxed opening -> accelerating latter half | Atmosphere -> climax, introduction -> call to action |
| **Fast-then-Slow** | Quick opening -> decelerating latter half | Hook -> deep-dive, high-energy -> emotional settling |

### Rhythm Intensity & Editing Style Matching

- **High intensity (>70%)**: Fast cuts (1-2s/shot), hard cuts, dynamic camera movement
- **Medium intensity (40-70%)**: Mixed rhythm (2-4s/shot), flexible transitions
- **Low intensity (<40%)**: Long takes (4-8s/shot), soft transitions (dissolves), slow camera movement

## 2. Transition Style Guidelines

- **Hard cut**: Default first choice. Clean, modern, fluid
- **Dissolve**: Only for clear time/space jumps or emotional shifts; avoid consecutive use
- **Fade in/out**: Only for video opening, ending, or major section boundaries; **never use mid-section**
- **Creative transitions**: Only when there's a defined stylistic direction (retro, comic-style, etc.)

## 3. Cut-Point Strategies

### Continuity-Based
- **Action-match cut**: Switch during an action, matching state across shots
- **Motion cut**: Switch while subject/camera is moving - motion masks the transition

### Narrative & Cognitive
- **Cause-and-effect / Reaction cut**: Connect cause to effect, action to reaction
- **Saturation-point cut**: Switch when the audience has absorbed the key information, maintaining information-flow efficiency

### Style & Rhetorical
- **Match cut**: Connect visually/thematically similar shots, creating metaphorical links
- **Jump cut**: Abrupt switch between near-identical shots, breaking temporal continuity
- **Rhythmic cut**: Timing synced to music beats or sound effects

## 4. Emotion & Information Density as Shot Language Drivers

Shot language doesn't exist in a vacuum - it responds to where the audience is emotionally and how much new information they're processing. Think of two loosely coupled curves running through the video:

- **Emotional intensity**: How much the audience should *feel* at a given moment (calm -> tension -> catharsis).
- **Information density**: How much new content (visual, textual, auditory) is landing at once (single focal point -> dense multi-element frames).

These aren't rigid axes to plot on a grid. They're lenses for asking: "What does the audience need from this shot right now?"

### 4.1 General Tendencies

When emotion runs high and information is sparse (a held emotional beat), shots naturally gravitate toward closer framing, slower movement, and longer duration - give the feeling room to land. When information is dense but emotion is neutral (a feature walkthrough), medium framing and functional camera work keep things clear without overstaying.

The interesting creative choices happen at the extremes and contradictions:
- **Peak emotion + dense information** (e.g., a climactic product reveal): rapid framing shifts and dynamic camera can carry both, but only if the information is visual - overloading an emotional close-up with too many simultaneous elements kills both.
- **Low emotion + low information** (a breathing-room moment): wide shots, stillness, negative space. These aren't wasted time - they're the pauses between sentences that make the next beat land harder.

### 4.2 Guiding Intuitions

- **Think about the emotional arc before choosing framing.** A close-up at a calm observational moment can feel intrusive; a wide shot at an emotional peak can feel distant. Let the story's temperature guide the lens.
- **Information density has a bigger say in duration than emotion does.** High-info shots need enough time for absorption regardless of mood; low-info emotional peaks should linger, not rush.
- **Avoid jarring curve jumps.** Going from quiet stillness to maximum intensity in a single cut can work as a deliberate shock, but unintentional jumps feel like cognitive whiplash. When both curves need to shift, consider moving one axis at a time.
- **Breathing room is composition, not filler.** Silence, negative space, and static frames are the video equivalent of punctuation - they let what just happened resonate and prime the audience for what's next.
- **When emotion and information conflict, lean toward emotion.** Simplify the information delivery and let the visual carry the weight.

### 4.3 Quantitative Breathing-Room Reference

Breathing room is a qualitative concept, but having approximate ranges prevents two common failure modes: cutting too tight (everything feels rushed) and lingering too long (momentum dies). Use these as starting-point intuitions for **creative planning and prompt-writing**, not rigid rules - context always wins.

> **Applicability note**: Kling 3.0 does not execute sub-second timing instructions. These values guide the **agent's shot-duration allocation** when writing prompts - e.g., knowing that an inter-sequence break needs ~1.5-2s means you budget a 2s visual-only beat between narrated sequences in the storyboard. The model responds to the overall pacing described in the prompt; it won't hit 300ms pauses on the nose, but prompts built with these budgets produce better-paced results than prompts that pack content wall-to-wall.

| Breathing-Room Type | Approximate Range | How It Informs Prompt Writing |
|---|---|---|
| **Intra-shot slack** (space around VO within a shot) | 0.5-1s buffer | Budget shot duration >= VO duration + 0.5-1s. Prevents cramped pacing. |
| **Inter-shot pause** (transitioning between narrated shots) | 0.5-1s | Describe a brief visual beat ("holds on the product for a moment") between narrated shots. |
| **Inter-sequence breathing** (paragraph break between sequences) | 1.5-2s | Include a visual-only shot or held wide shot at sequence boundaries. This is the "paragraph break." |
| **Post-climax settling** | 2-3s | After a climactic moment, write a dedicated settling shot ("camera lingers on the reaction"). |
| **Pre-hook silence** | 0.5-1s | Before a reveal, describe a pause beat ("a beat of stillness, then-"). |

These values assume standard pacing (~2.5-4s/shot average). For fast-cut styles (<2s/shot), compress proportionally; for slow contemplative styles (>5s/shot), expand.

## 5. Creative Planning Application Guidance

**Describe editing style qualitatively**, e.g.:
- "Fast-cut style with rapid shot changes, creating an energetic, dynamic rhythm"
- "Fast cuts in the first half to grab attention, slowing down in the second half to deepen emotion"

**Describe the rhythm curve**, e.g.:
- "Slow-then-fast progressive curve, from atmosphere-building to call to action"
- "Distinctly undulating wave curve, rhythmic contrast enhancing emotional layers"

**Avoid**: Specifying cut-point timestamps, exact shot durations, editing timelines, frame-rate parameters
**Focus**: Overall style positioning, rhythm curve type and emotional trajectory, transitions matching the theme

## 6. Montage: Every Cut Needs a Why

**Principle:** "Fast montage" describes energy, not a plan. A hard cut without a link feels like channel-surfing.

**Pick one motive per cut** (from §3): `action_match` | `cause_effect` | `match_cut` | `rhythmic_beat` | `saturation_point` | `scene_reset` (sparingly — real time/place jump only).

**Planning (montage sequences only):** One plain sentence per beat — why we leave this shot. Example: *"Cut on muzzle flash → soldier ducks (cause_effect)."* No frame-accurate EDL; models follow pacing, not sub-second marks.

**Gate:**
- Three or more hard cuts in a row with no stated link → replan.
- Brief says only "fast cuts / montage" with no beat logic → insufficient.

**Use fully when:** battle/sports highlights, multi-location cutdowns, launch sizzle, parallel storylines, music-led chorus (pair `rhythmic_beat` with beat/SFX in audio plan).

**Skip when:** single talking-head ≤15s, one unbroken action (serial continuation), slow hero/atmosphere, user wants one continuous shot, or lipsync/`audio_list` owns the clock — cuts serve speech, not the reverse.

**Assembly:** If handoff marks a montage block, each junction needs a planned motive. Unmotivated hard cuts → fix upstream or ask; do not "fix" with random dissolves.

## 7. Parallel Continuity Toolkit (intent-first, ≥2 segments)

See script-skill `references/editing-rhythm-design.md` §7. Assembly checks `exit_anchor` vs `entry_anchor` at junctions; bridge before dissolve.

## 8. Pre-Planned Frame Chain (assembly QA)

When `frame_chain_mode: pre_planned`, junction QA includes whether the cut matches the planned `END_Sn` still. Failure order: regen segment with same stills → tail-frame repair (if user allows) → bridge → replan.
