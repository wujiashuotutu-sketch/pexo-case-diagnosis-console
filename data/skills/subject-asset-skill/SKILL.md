---
name: subject-asset-skill
description: "Subject element decomposition, user asset organization, reference mapping, gap analysis, and supplementary reference generation. Establishes the complete visual asset foundation before generation begins. Use when a sequence breakdown exists (from script-skill) and user assets need to be organized, gaps identified, or supplementary references generated before generation-skill can execute. Especially important for multi-sequence parallel generation where cross-segment visual consistency depends on reference coverage."
---

# Usage

This skill owns the bridge between **production design** (script-skill) and **production execution** (generation-skill). Script-skill says what people, scenes, objects, products, UI/screens, brand elements, and text carriers must appear. This skill decides what reference assets are needed for those elements, creates or selects the anchors, and maps each anchor into the exact sequence payloads needed for consistent generation - especially in parallel multi-sequence production.

**Input**:
- Sequence breakdown from script-skill (sequences, shots, timing, visual/audio design)
- Subject Element Brief from script-skill (all required people, scenes/locations, objects/props, products, brand elements, UI/screens, and text carriers, with appearances and continuity requirements)
- User-uploaded reference assets (images, videos, audio)
- Concept preview artifacts from brainstorm-skill (if any)
- Production model and strategy from script-skill

**Output**:
- **Subject Element Registry** - structured inventory of every visual/audio subject in the video
- **Subject Anchor Plan** - which reference assets must exist for each element (`character_ref`, `prop_ref`, `scene_ref`, `product_ref`, `style_ref`, `ui_ref`, key-frame refs), and how those anchors preserve identity/scale/layout across sequences
- **Per-sequence reference plan** - which assets go into each sequence's image/video/audio list
- **Supplementary reference assets** - generated images/key frames to fill coverage gaps
- **Production-ready asset map** - the complete asset package that generation-skill executes from

## Consistency Anchor Output

When relevant, output not only subject references, but also consistency anchors for downstream production:

- `identity_anchor`
- `style_anchor`
- `lighting_color_anchor`
- `wardrobe_material_anchor`
- `continuity_sensitive_traits`

If only identity is anchored but style, lighting, or material continuity remains weak, state that limitation explicitly so downstream skills do not over-assume consistency coverage.

**Skip condition**: When user assets already cover all key elements and the creative story is simple (single subject, single environment, <=10s), this skill can be streamlined to a quick inventory confirmation rather than a full decomposition.

---

# Core Workflow

## Step 1 - User Asset Intake & Organization

When the user uploads reference materials (images, videos, audio), **autonomously** assess and organize them.

### Asset Classification Rules

For each uploaded asset, determine **what subject element it represents**, not just what it "looks like." Cross-reference across all uploads:

- If 3 images all contain the same product but with different models -> the **product** is the common reference subject; the models are context (unless the user explicitly says "use this model").
- If the user uploads a mood board image -> it's a **style/mood anchor**, not a character or product reference.
- If the user uploads a video -> determine whether it's a **motion/style reference** (borrow camera work, pacing) or a **subject reference** (the character/product in the video matters).
- **Assign each asset a clear role label**: `product_ref`, `character_ref`, `style_ref`, `environment_ref`, `motion_ref`, `packaging_ref`, `ui_ref`. One asset can serve multiple roles.

### Capacity Constraints

- **Over-length video (>10s)**: Input video must be <=10s. Identify the most representative <=10s clip and trim. If the long video conveys multiple distinct elements, note multiple useful clips or extract key frames.
- **Multiple videos**: Kling accepts only 1 video per call, **must be <=10s**. Decide which is most relevant for the current generation; extract key frames from others to use as reference images.
- **Too many images**: Rank by role priority (product_ref > character_ref > style_ref > environment_ref). Keep within the tool's capacity limits per scenario; drop lowest-priority items silently.
  - **Seedance limits**: <=9 images in `image_list`, <=3 videos in `video_list` (total <=15s), <=3 audios in `audio_list` (total <=15s, requires at least 1 image or video).
  - **Kling limits**: <=7 images (no ref video) or <=4 images (with ref video). Only 1 reference video per call, **must be <=10s**.
- **Audio assets**: **Seedance** supports audio references (`audio_list`). When the user provides BGM, sound effects, or audio references, annotate them for generation-skill to pass as `audio_list`. **Kling** cannot accept audio input - extract characteristics and note them in the handoff for post-assembly.
- **Dubbing / language-replacement intake**: When the task is to replace or translate speech in an existing video, analyze and label the original audio for one or more explicit downstream purposes: `transcript_source`, `pronunciation_reference`, `voice_identity_reference`, or `non_reusable_content_sample`. If the user wants the target-language speech to sound like the same speaker, mark as `voice_identity_reference`.
- **Ambiguous assets**: Infer from context - cross-reference with other uploads and the user's description. Act like a professional editor receiving raw material - curate it, don't ask the client to sort it.

### Reference Video Assessment

When reference video is provided:
1. **Assess** - determine whether it has audio or is silent, duration (<=10s), visual rhythm (cut points, shot lengths), and user intent.
2. **Extract sound elements** - if has audio: extract mood, pacing, tone, rhythm, style, key moments; if silent: document "reference video silent", derive pacing/rhythm from the image track.
3. **Formalize as Sound Reference Context** - a structured artifact passed as context into the post-production phase. Include in the handoff so it's available for post-assembly audio decisions.

## Step 2 - Subject Element Decomposition

Start from script-skill's **Subject Element Brief** and user assets to build a **Subject Element Registry** - a structured inventory of every distinct visual/audio subject that must appear in the final video and where it comes from. Do not invent missing subjects, and do not silently drop script-declared people, scenes, objects, products, UI/screens, or text carriers.

### When to Perform

This step scales with the gap between what the user provides and what the video requires:

- **User assets already cover key elements** (e.g., user uploaded product photos, character images, environment references that together cover the main visual subjects): **Streamline** - do a quick mental inventory to confirm coverage, note any gaps briefly, and move on. No need to produce a formal structured registry.
- **User assets are sparse or absent** (e.g., pure text request, only one product photo but the story involves characters and environments): **Full decomposition required** - walk through all four steps below and produce a structured registry.
- **Rule of thumb**: If the creative story requires subject elements that have **no visual reference from any source**, those elements will drift across sequences during generation. The registry exists to catch this before it happens.
- **Mandatory recurring-person trigger**: If the story contains the same visible human/character in more than one sequence, this skill must run even when the user provided no assets. Create a `Subject Coverage Manifest`; if there is no existing `character_ref`, generate or derive one before generation-skill starts. A text description alone is not coverage for a recurring face/person.

### Step 2a - Normalize Script-Declared Subject Elements

Walk through the Subject Element Brief and normalize every distinct subject that needs visual representation:

- **Product / hero object**: The primary item being featured. **Physical scale matters**: note the product's real-world size relative to a person (palm-sized, handheld, tabletop, etc.). This scale must be preserved throughout - AI models tend to exaggerate product size for visual prominence.
- **Characters / models**: Each distinct person or character that appears. Note their role (protagonist, background, hands-only).
- **Environment / setting**: Key locations or backdrops (kitchen, city street, studio).
- **Brand elements**: Logo, packaging, typography, color scheme.
- **Props / secondary objects**: Items that interact with the product or characters (gift box, table setting, vehicle).
- **Style / mood anchors**: Visual tone, color palette, lighting direction, texture.

Preserve relationship anchors from the script. If the brief says the same presenter owns a talking-head line and later appears in B-roll, the registry must keep one `subject_id` across both appearances. If the same room/window/tablet/product returns, keep one `subject_id` and mark which traits must remain stable.

### Step 2b - Map User Assets to Subject Elements

For each uploaded asset, determine what subject element it represents:

- If the user uploads 3 images that all contain the same product but with different models -> the product is the common reference subject.
- If the user uploads a mood board image -> it's a style/mood anchor.
- If the user uploads a video -> motion/style reference or subject reference.

### Step 2c - Gap Analysis

Compare the Subject Element Registry against available assets. For each subject element:

- **Covered**: A user asset or concept preview key frame provides a clear visual reference. Mark which specific asset covers it.
- **Partially covered**: An asset contains the element but not in isolation (e.g., product visible in a lifestyle shot but small/occluded). May need extraction or supplementary generation.
- **Not covered**: The creative story requires this element but no asset exists. Must be either described in text or proactively generated as a supplementary reference.

#### Coverage Tests

- **Recurring characters**: For any character appearing in more than one sequence, ask: "If I remove the prompt text and only hand the model the visual references, would it still know who this person is in every sequence?" If no -> **not covered**.
- **Talking-head plus B-roll is still recurring identity**: If a presenter speaks in one sequence and appears as hands, side profile, seated worker, or closing smile in another sequence, all those appearances map to the same `character_ref`. Do not treat B-roll as exempt merely because the face is partial or the shot is action-focused.
- **Recurring locations**: For any location reused across sequences, a style image only counts as covered when it encodes the reusable spatial identity of the place. Generic mood frames are usually only partial.
- **Style reference != subject coverage**: A `style_ref` image can anchor look (lighting, color, texture, mood), but it does **not** count as coverage for recurring characters, specific real-person analogs, relationship scenes, or reusable locations.
- **Storyboard / key frame coverage**: The same coverage requirements apply when generating storyboard panels, not only for video generation. Having the user's image in your context (via `analyze_file_content`) does not mean the generation model has it - the image must be explicitly passed as a tool input parameter.

### Step 2d - Subject Anchor Plan

For uncovered or partially covered elements, decide which anchor assets are required and how they will preserve consistency:

- **Concept preview coverage**: When concept previews were produced, intentionally extract key frames that include uncovered subject elements. The preview is not just for user confirmation; it's a reference generation opportunity.
- **Supplementary generation**: Proactively generate supplementary reference images before handing off to generation-skill:
  - Character sheet (multi-angle turnaround: front, 3/4, side, back)
  - Product close-up against neutral background
  - Packaging layout frame
  - Environment establishing shot
  - Interaction key frame (for relationship scenes)
- **Anchor type selection**:
  - recurring visible person -> `character_ref` or character sheet
  - hands/partial-body B-roll belonging to the same person -> same `character_ref`, not a new generic hands description
  - recurring object/prop -> `prop_ref` or `product_ref`
  - recurring room/location -> `scene_ref` or environment key frame
  - UI/screen that must be readable -> `ui_ref` / key-frame image with exact content
  - visual style only -> `style_ref` (never counts as person/product/scene identity)
- **Text fallback**: For elements that are stylistic or atmospheric and don't need a pixel-level reference, describe them in the creative script.
- **Bootstrap trap avoidance**: Do not solve a missing-reference problem by generating one broad "hero still" and reusing it as `style_ref` for every sequence. That only bootstraps overall look, not identity or story-world continuity.

## Step 3 - Supplementary Reference Generation

When the gap analysis reveals missing references, generate them **before** handoff to generation-skill.

### Auto-Supplement Rules

- **Characters in close-up or mid-shot** (face visible): Require visual references. Pure text-to-video cannot maintain face consistency.
- **People interacting with objects** (hands touching phones, passing items): Require visual references for hand-object contact accuracy.
- **Specific UI/interface elements**: Require reference images for legibility.
- **Multi-angle character references for action scenes**: When the story involves dynamic full-body actions (running, jumping, dancing) or non-frontal angles (side, back, overhead), a single front-facing portrait is insufficient. If the user provides only one angle, **proactively ask for a character sheet** or **generate one** - a multi-angle turnaround (front, 3/4, side, back) in neutral pose.
- **Narrative real-person / multi-character scenes**: When the story centers on a recognizable real person, a real-person analog, or a recurring relationship between characters, generate dedicated reference assets for every recurring principal character. If a later sequence depends on a specific relationship beat (meeting, confrontation, handshake), also prepare environment/context reference.
- **Product scale anchoring**: When generating supplementary reference images that include the product alongside a person, **always describe realistic scale** in the prompt (e.g., "a small palm-sized yogurt cup held naturally in one hand" rather than just "holding a yogurt cup").

### Generation Rules

- Follow `references/image-generation-guide.md` for model routing and prompt rules.
- **Provider routing by goal**: Use **Seedream** when the goal is a higher-quality, more delicate, more visually finished image - whether from pure text or by upgrading a user-provided image. Use **Gemini / Nano Banana 2** when the goal is consistency, realism, reference-driven extension, or packaging / key-frame iteration. Route by what matters most in this asset, not simply by whether the call is text-to-image or image-to-image.
- **Chinese packaging / layout rule**: If the asset is a **Chinese packaging visual**, **Chinese layout image**, or a Chinese text-heavy brand-facing frame that should look polished and presentation-ready, bias toward **Seedream**. If the same packaging asset is mainly being extended from an existing reference with consistency as the top priority, **Gemini / Nano Banana 2** remains valid.
- **User upload consistency anchor**: When the user has uploaded reference images, these are the **single source of visual truth**:
  - **Permitted**: Directly use user uploads. Use `image2image` with a user upload as source.
  - **Permitted**: Generate a supplementary control key frame when it fills a real coverage gap or stabilizes a high-risk target state (for example, a completed worn look, an assembled final product state, or another critical payoff frame not directly covered by the user uploads), but the generation must still be **reference-led** from the user uploads.
  - **Prohibited**: Use `text2image` to regenerate content that a user upload already covers - text descriptions cannot capture the full visual identity.
  - **Prohibited**: Call `get_file_info` for user uploads and then issue a prompt-only `text2image` call for the same covered subject/product. If the user upload is relevant enough to refresh, it is relevant enough to pass into the generation call.
- **Brand logo avoidance**: When generating character or scene references, include negative constraint: "no visible brand logos, no trademark symbols, plain unbranded clothing/items."
- **File info refresh**: Before issuing generation calls that reference uploaded assets, call `get_file_info` for all referenced assets so the tool sees fresh `file` info. Do not rely on stale cached file data.
 - **Control key-frame economy**: Supplementary key frames are targeted control assets, not a default ritual. Generate them only when they materially reduce drift risk for a critical beat. Prefer **0-1** such assets per single-sequence video unless multiple distinct high-risk target states truly need separate anchors.

## Step 4 - Per-Sequence Reference Mapping

Using the Subject Element Registry, build a **per-sequence reference plan** - which assets go into each sequence's image list, and what role each plays.

### Mapping Rules

- For each sequence, identify which subject elements from the registry appear in that sequence's narrative.
- Assign concrete assets: user uploads, concept preview key frames, supplementary generated images. Each asset gets a positional index (`image 1`, `image 2`, ...) that will be referenced in the prompt.
- **Every image in the image list must be explicitly referenced in the prompt** - declare its role and what the model should extract from it. No orphaned references.
- **Gap filling**: If the registry shows an element as "uncovered" or "text description," write a detailed textual description. Spend character budget on uncovered elements; save budget on covered elements by pointing to reference images.
- **When image slots are limited**, prioritize: product_ref > character_ref > style_ref > environment_ref > packaging_ref. Combine roles when possible.
- **Scene reference coverage** (when user provides multiple scene/environment reference images): The plan must **use every user-provided scene reference image** - no image may be silently dropped. N scene references do NOT require N sequences; a single sequence can contain multiple scene transitions via prompt.

### Packaging Key Frame Preparation

For each Layer 1 packaging element identified by script-skill:
- **User-provided image priority**: When the user has provided an image containing the exact text/graphic to reproduce, use that original image directly as the key frame - do not re-generate via AI.
- **Generate key frame images** for elements not covered by user assets: use image generation tools suited for text rendering.
- Assign each key frame to its target sequence's image list.
 - **Role separation**: A generated key frame that depicts the final combined state does not replace the original user uploads. Keep the original `character_ref` / `product_ref` in the sequence plan and assign the generated key frame a distinct role such as `target_state_ref` or `completed_look_ref`.

## Step 5 - Production Handoff

Package the complete asset foundation for generation-skill:

- **Subject Element Registry** (when a structured registry was produced):
  ```
  --- SUBJECT ELEMENT REGISTRY ---
  Element: [name]
  Role: [product_ref / character_ref / style_ref / environment_ref / motion_ref / packaging_ref / ui_ref]
  Coverage: [covered / partial / uncovered]
  Source: [user asset #N / concept preview key frame / supplementary image / text description]
  Used in sequences: [which sequences need this element]
  ---
  ```
  When user assets provided sufficient coverage and the formal registry was streamlined, pass the assets directly with brief role annotations.

- **Subject Anchor Plan** - one row per script-declared element that needs anchoring:
  ```
  subject_anchor_plan:
    - subject_id: presenter_01
      element_role: character
      anchor_asset_type: character_ref
      source: generated_reference | user_upload | extracted_keyframe
      ref_asset: asset://...
      visible_in_sequences: [seq1, seq2, seq3]
      must_include_in_payload: [seq1, seq2, seq3]
      continuity_traits: [face_identity, wardrobe, body_build]
  ```
- **Per-sequence reference plan** - for each sequence: ordered image list with role labels, positional index, and what the model should extract.
- **Subject Coverage Manifest** - for each recurring visual subject: `subject_id`, `role`, `identity_anchor`, `visible_in_sequences`, `required_ref_type`, `ref_asset`, and per-sequence payload expectation. If `ref_asset` is empty for a recurring visible person/product, generation handoff is BLOCKED until the reference is created or the story is explicitly replanned.
- **Supplementary reference assets** - all generated images with their role labels.
- **Audio reference annotations** - when Seedance is the production model and user provided audio, note which files go into `audio_list`.
- **Sound Reference Context** - when reference video was provided, the structured audio reference artifact for post-assembly.
- **For dubbing tasks**: Voice Reference Handoff stating source audio purpose labels.
- **Parallel readiness assessment** - explicit confirmation that every cross-sequence subject has visual coverage, or flag remaining gaps.
- **frame_chain_manifest** (when `frame_chain_mode: pre_planned`) - map keyed by `frame_chain_plan.chain_nodes[].id` and every id listed in any `per_sequence_slots[].slot_node_ids` (including `CHAR_*`, `STYLE_*`, `MID_*`). Values are `asset://` URLs. Generation-skill resolves `image_list[i]` from `slot_node_ids[i]` via this map.

---

## Step 4b - Frame Chain Asset Production (when `frame_chain_mode: pre_planned`)

Run after shared subject refs exist and before generation-skill Phase B. **Requires `frame_chain_plan` from script-skill Step 6c** — if missing, stop and return to script-skill; do not invent `chain_nodes` in subject-asset or generation.

1. Read nested `frame_chain_plan` only (not a duplicate top-level `in_segment_still_density`): `chain_nodes`, `per_sequence_slots`, `in_segment_still_density`.
2. **One `image_generate` batch** (GPT Image 2 preferred):
   - Produce assets for every unique id in `chain_nodes` and all `slot_node_ids` (shared `CHAR_*` / `STYLE_*` once).
   - Chain `END_Sn` nodes: image2image from prior `END_S(n-1)` or character sheet.
   - If `frame_chain_plan.in_segment_still_density: high`, add `MID_*` ids referenced in `slot_node_ids` — never remove entry/exit node ids from slot lists.
3. Emit **`frame_chain_manifest`** (exact field name); verify each `per_sequence_slots[].slot_node_ids` id exists in the map.
4. **Do not** plan tail-frame extraction from video as the primary junction source in this step.

If handoff sets `junction_link_mode: tail_extract_junction` instead, skip full chain batch unless stills are needed for non-junction refs; document that generation may serialize affected junctions.

---

# Parallel Readiness Gate

Before generation-skill can use parallel mode, this skill must verify:

- **Style**: A `style_ref` image exists for every sequence - concept preview key frame is the primary source.
- **Characters**: If the same person appears across sequences, a `character_ref` image exists.
- **Product**: If the product appears across sequences, a `product_ref` image exists.
- **Environment**: If scenes share a location, an `environment_ref` exists or visual drift is acceptable.
- **Identity-critical narrative**: If the story depends on viewers recognizing a specific recurring person or relationship beat, every recurring principal character has dedicated `character_ref` coverage, and continuity-critical locations have explicit visual anchors.
- **Style is not subject coverage**: `style_ref` counts only for look. It does **not** count as character identity, environment identity, or interaction coverage.

If any cross-sequence element lacks a visual reference -> generate the missing reference image. Only flag serial fallback as a last resort.

# Late Reference Invalidation

If a supplementary reference is generated after any sequence asset already exists, scan the existing asset lineage before handoff:

- Identify which already-generated sequences contain the newly anchored subject.
- Any sequence that contains that subject but was generated without the new reference is now stale.
- Handoff to generation-skill must mark those stale sequences for regeneration with the reference, not reuse them in final assembly.

Example: if `presenter_ref` is generated after `seq2_broll` and `seq3_closing` were already generated from text-only prompts, and those sequences show the presenter, both sequences must be regenerated with `presenter_ref` before assembly.

---

# What This Skill Does Not Do

- **Creative direction or narrative development** - brainstorm-skill.
- **Sequence breakdown, shot design, production model routing** - script-skill.
- **Video generation execution** (calling `video_generate`, `audio_produce`) - generation-skill.
- **Timeline assembly and post-production** - assembly-skill.
- **Modifying existing videos** - modification-skill.
- **Cover selection, publish packaging** - publishing-skill.
- **Model names in user-facing output** - internal, per system prompt Ground Rules.

Scope test: this skill owns *what assets exist, what's missing, and how to fill the gaps*. Upstream (script-skill) owns *the production plan*. Downstream (generation-skill) owns *execution*.

# Tools

Tools are provided at runtime. This skill uses: `image_generate` for supplementary reference generation (character sheets, environment references, packaging key frames), `analyze_file_content` for asset assessment, and `get_file_info` for file info refresh.
