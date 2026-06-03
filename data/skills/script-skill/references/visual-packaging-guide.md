# Content

## 1. Overlay Types

### Static Text
Text-based information overlays (plain text / with background box / with outline). Used for product feature callouts, key information emphasis, data display.

### Animated Graphics
Icons, arrows, geometric shapes, data charts, decorative elements. Used for visualizing abstract concepts, guiding attention, showing data comparisons, reinforcing rhythm.

### Brand Elements
Logo, product name, slogan, brand-proprietary graphics. Used for establishing brand recognition, reinforcing brand memory, conveying brand tone.

## 2. Packaging Style Positioning

| Style | Visual Traits | Color Tendency | Suitable For |
|-------|--------------|---------------|-------------|
| **Clean & Modern** | Generous whitespace, clean lines | Monochrome / limited palette, high contrast | Tech, premium brands |
| **Ornate & Refined** | Rich detail, decorative | Gold, dark tones, gradients | Luxury, art |
| **Tech / Futuristic** | Geometric shapes, light effects, digital | Blue / cyan / neon / metallic | Tech, innovation, gaming |
| **Warm & Approachable** | Rounded, soft, handwritten fonts | Warm tones, soft palette | Lifestyle, parenting, food |
| **Vibrant & Youthful** | Bright, dynamic, playful graphics | High saturation, color clashing | Sports, entertainment, fashion |
| **Retro / Nostalgic** | Vintage fonts, textures, film grain | Faded, vintage palette | Nostalgia themes, cultural content |

## 3. Packaging Content Creation Principles

### Text Content
- Information hierarchy: Main title (core message) -> Subtitle (supplementary) -> Data (details)
- Concise and impactful - use keywords, not full sentences
- Numbers and facts over adjectives
- Text concepts must stay **render-feasible**: avoid building a packaging idea around decorative Unicode, emoji-as-typography, rare glyphs, or other special-character tricks unless the downstream renderer is confirmed to support them reliably.
- Do not design hierarchy by assuming two fonts can be mixed inside one subtitle/text line. When typographic contrast matters, express it through structure, size, weight, color, spacing, placement, timing, or separate text elements.
- Font choice must follow language coverage before mood. If the packaging copy is Chinese, Arabic, bilingual, or otherwise script-specific, the concept should already assume a font family that covers that writing system. Do not write a script/design direction that only works if the team accidentally picks the wrong language font.

### Animated Graphics
- Define function: Directional guidance / Data visualization / Decorative reinforcement / Concept visualization
- Descriptions should include: Graphic type + Visual effect + Motion characteristics + Purpose

### Brand Placement
- **Opening**: Establish recognition at the start of the video
- **Closing**: Reinforce memory at the end of the video
- **Persistent**: Light watermark presence throughout
- **Key-moment**: Appears during core value delivery

## 4. Packaging & Picture Relationship

### Position Strategy
- Don't obstruct the visual subject; adjust dynamically based on composition
- Common positions: Lower third (callout) / Top center (title) / Corner (watermark) / Center (emphasis)
- **Platform safe area overrides visual centering**: On TikTok / Reels / Shorts, lower-third text must be raised above bottom UI, and top-center titles must be pulled down from the top edge.
- Safe area should be judged on the **whole text block**, not only the baseline: include likely wrapping, outline, box, and background plate when deciding whether the design still has enough breathing room.

### Timing
- **Simultaneous**: Appears with the visuals, reinforcing information
- **Delayed**: Visuals appear first, then overlay - creates layering
- **Persistent**: Present for an extended period, building recognition

### Motion Relationship
- **Static overlay**: Element stays still, picture moves
- **Following motion**: Element tracks the subject
- **Independent animation**: Element has its own animation rhythm
- **Responsive**: Element changes with picture content

### Text Motion Intent

At script-design time, choose the *intent* of text motion, not the implementation syntax. Downstream assembly decides whether that intent becomes plain subtitles, light keyframed text, or an ASS subtitle asset.

- **Informational captions**: subtitles or dialogue captions whose job is comprehension. They should usually be stable, phrase-level, and low-presence. Premium product films, cinematic explainers, SaaS launches, medical/finance/education, and other trust-oriented pieces should avoid typewriter, word-pop, karaoke, or other word-level effects unless the user explicitly asks for them.
- **Visual packaging text**: titles, chapter words, CTA, hook phrases, selling-point keywords, lyrics, or rhythm-driven slogans. These can carry stronger motion when text is part of the visual rhythm or brand attitude.
- **Information density check**: if the frame already contains dense UI, particles, fast camera motion, heavy VO, or strong SFX/BGM, keep text motion quiet so the audience has one clear reading path.
- **Tone check**: premium / cinematic / elegant / calm / institutional -> restrained fade, hold, or gentle drift; energetic / creator / music / trailer / sale -> more expressive word-level motion may fit.

### In-Frame Packaging
Some packaging text is visually a "layer," but operationally it belongs **inside the generated frame**, not in post.

Typical examples:
- poster-style headline text inside the shot
- selling-point text designed as a card or placard in scene space
- text emerging from behind the product or character
- text tracking the subject or attached to the product edge
- floating typography integrated with scene perspective and depth

These should be treated as **Layer 1 in-frame packaging** and controlled through key frame references, because recreating the same perspective, occlusion, and tracking relationships in post is often much more expensive.

## 5. Creative Planning Application Guidance

**Describe packaging style qualitatively**, e.g.:
- "Clean and modern - minimal lines and elegant typography, whitespace-dominant"
- "Vibrant and youthful - bright colors and animated graphics, appearing in sync with the music rhythm"

**Describe packaging content**: Product feature callout list, brand element appearance format, graphic element types and purposes

**Describe the role**, e.g.:
- "Primarily for information delivery - supplementing product feature explanations"
- "Reinforcing brand recognition - establishing memory at opening and closing"
- "Subtitles are informational and should stay restrained, while the CTA title can carry a subtle premium reveal"
- "Hook words are part of the visual rhythm and can use expressive word-level motion"

**Avoid**: Specifying position coordinates, exact dimensions, animation durations, technical implementation details
**Also avoid**: packaging directions that only work if the renderer supports unsupported special characters or mixed-font composition inside one text line/track
**Focus**: Overall packaging style and visual feel, element types and content, relationship to picture and appearance logic

## 6. Two-Layer Production Routing

Each packaging element must be routed to the appropriate production layer:

| Layer | What belongs | How it's produced | Text accuracy |
|-------|-------------|-------------------|---------------|
| **Layer 1 - AI Generation** | Brand compositions, artistic typography / stylized lettering, decorative stickers, graphic overlays, end cards, visual style frames, in-frame packaging text, environment-layer text carriers | Pre-rendered as key frame image -> passed to video model via `image_list` | Approximate (decorative intent > character accuracy) |
| **Layer 2 - Post-Production** | Information bars, selling point text, data callouts, prices, website links | Text overlay composited after video generation | Precise overlays require confirmed downstream support |

**Current tool limitation**: Dense precise overlay types (information bars, selling point text, data callouts, prices, website links) should be treated as unsupported unless a downstream edit path is explicitly confirmed.

**Typography feasibility limitation**: Treat one text/subtitle element as one effective font family unless downstream support says otherwise. Do not hand off a script that depends on intra-line font mixing or fragile glyph coverage to make the design work.
