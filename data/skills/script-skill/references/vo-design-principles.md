# Content

## Contents

- **0. Scope Boundary** - what this reference covers vs what it doesn't
- **1. VO Content Creation Principles** - writing and rhythm rules
- **2. VO-to-Picture Relationship** - sync modes and timing
- **3. VO-First Production Order** - VO drives the timeline, not the other way around
- **4. Cross-Segment VO Handling** - multi-sequence voice consistency
- **5. Creative Planning Application Guidance** - how VO design feeds into creative scripts
- **6. Voice Catalog And Selection Rules** - voice ID selection and matching


## 0. Scope Boundary

This guide is for **off-screen voiceover / narration only**.

- If the speaker is an on-screen character talking within the scene, use `dialogue-monologue-design-kb.md`
- If the layer is music, ambience, or action-tied sound, use `audio-design-guide.md`

Voiceover is **normally** a post-production audio layer. This statement applies only after you have decided the voice is genuinely off-screen. Do not use this guide to convert a visible speaker into B-roll. For a self-contained single-shot visible spoken performance, use the dialogue / generation voice strategy instead; direct co-generation may be appropriate when no exact voice identity or supplied audio must be preserved. For mixed cross-shot speech where the same perceived speaker has both visible speech and off-screen narration, use a shared voice-source plan: visible lines through `audio_list`, off-screen lines as matching post VO.

## 1. VO Content Creation Principles

### Content Structure
- **Opening (Hook)**: Question / conflict / counter-intuition - grab attention instantly
- **Development (Build)**: Tell the story, present scenarios, build emotional connection
- **Closing (Closure)**: Summary / elevation / call to action / brand philosophy - deliver a sense of completion

### Language Style
| Style | Traits | Suitable For |
|-------|--------|-------------|
| **Concise & Direct** | Short sentences, no decoration, straight to the point | Product features, call to action, fast pace |
| **Poetic & Lyrical** | Rich rhetoric, deep imagery | Brand stories, emotional content, atmosphere |
| **Conversational** | "You," "we" - like talking to the audience | Approachable brands, lifestyle, social |
| **Professional Narrative** | Objective, rational, information-dense | Tutorials, specialized fields, tech products |

### Creation Guidelines
- **Emotion markers**: Annotate mood at key sentence endings `[firm]` `[tender]` `[excited]`
- **Semantic completeness**: Each segment expresses a complete thought - avoid unnatural breaks
- **Length adaptation**: Consider visual duration; typically 2-4 short sentences per segment
- **Closing completeness**: The final VO must convey a sense of closure
- **Render-safe wording by default**: Write VO/subtitle copy using stable everyday characters and punctuation first. For Chinese-language subtitles, prefer standard everyday punctuation marks and plain Arabic numerals. Avoid decorative Unicode, emoji, uncommon symbols, mixed-width punctuation tricks, and special pause markers when a normal comma, period, or colon already expresses the same meaning.
- **Replace risky punctuation at the writing stage**: Do not generate subtitle-facing copy that depends on glyph-sensitive punctuation such as repeated em dashes, ellipsis variants used for styling, fancy quotes, arrows, or ornamental separators. Rewrite for the same spoken effect with safer forms instead (for example: `The key is -- small, repeated steps` -> `The key is: small, repeated steps`).
- **Design for speech and render together**: If a punctuation choice is mainly visual styling rather than spoken meaning, remove it upstream in the script instead of relying on downstream subtitle normalization. The clean script should already be safe to feed both TTS and final subtitle render.

## 2. VO-to-Picture Relationship

### Synchronization
VO describes what's happening on screen. Direct, clear, easy to understand. Suited for product demos, tutorials.

### Complementary
VO provides information the visuals can't convey (story / philosophy / data); visuals show the scene. Suited for brand stories, product context.

### Independent Layer
VO and visuals form two parallel narrative lines - contrast or connection creates deeper meaning. Suited for artistic, metaphorical expression.

### Emotional Guide
VO is minimal, primarily guiding the emotional tone; visuals carry the main information. Suited for mood/atmosphere videos, music-driven content.

## 3. VO-First Production Order

For videos with voiceover/narration, the VO audio is the timeline anchor. **VO duration is non-compressible; visual duration can be adjusted.** The timeline's primary axis is determined by whichever element is immutable.

### Pre-VO Speech Check

Before generating or placing off-screen VO onto existing video segments, first verify whether those segments already contain speech.

1. Run `audio_produce` with `provider=elevenlabs`, `mode=speech2text`, `model=scribe_v2` on any source video/audio asset that may already contain dialogue, presenter speech, or narration.
2. Use the returned `transcript_file` as the authoritative source for:
   - whether spoken words already exist
   - what those words are
   - where they occur on the timeline
3. If the host clip already contains the same spoken content, do **not** stack a second VO layer on top. Resolve the conflict first: keep embedded speech, replace the shot, or explicitly convert the shot into muted B-roll.
4. If speech analysis fails and the VO decision depends on it, fail closed. Do not guess from prompt intent alone.

### VO-First Timeline Steps

1. **Generate the VO audio first** (`audio_produce`), obtain the audio file, and read its actual duration via `video-editor__ffprobe` or an explicit duration field from the producing tool. `get_file_info` is only sufficient if it explicitly returns duration; file size and signed URLs are not timing data.
2. **Use the VO audio duration as the baseline** to determine the start and end times for each narration line.
3. **Plan the timeline based on VO duration** - video segment `out_ms`, `start_ms`, transition timing, and BGM duration all align to the VO rhythm, not the other way around.
4. **Validate the rendered result** with `video-editor__ffprobe`. The final video stream must not extend materially beyond the required VO/BGM audio stream unless an intentional silent outro was planned.

### Overflow Handling Priority

When actual TTS duration is longer than the available visual window, resolve in this order:

1. **Shorten and regenerate the VO text** so the full regenerated asset fits naturally.
2. **Extend or retime the visual plan** if the user allows a longer video or if the target duration has slack.
3. **Split the narration across a longer structure** when the information density is too high for one segment.
4. **Ask the user to choose** only when the hard duration and the required spoken content cannot both be preserved.

Do not solve VO overflow by trimming the generated audio with `source.out_ms`, fading out before the sentence ends, using only the first N seconds of the VO, or speeding up an already-rendered asset. A VO asset may be edited only when the user explicitly asks to remove spoken content, or when you regenerate a complete shorter take.

### Source-Window Integrity Check

Before final assembly, compare the full VO asset duration with the edit-spec source window:

`full_vo_duration <= source.out_ms - source.in_ms`

If the source window is shorter than the VO asset and the omitted interval contains speech, the edit is blocked. The visual timeline still needs bounded audio, but bounded audio means "make a fitting complete VO," not "cut off the narration tail."

### Final Stream Coverage Check

After rendering a VO-led video, probe the delivered MP4:

```text
video_stream.duration
audio_stream.duration
format.duration
```

If `video_stream.duration - audio_stream.duration > 0.5s`, delivery is blocked unless the creative plan explicitly includes a silent visual outro. A file having an audio stream does not prove the narration covers the ending.

If transition math or a diagnostic render changes the real visual duration, update the VO/BGM plan from the probed duration. Do not keep an old `source.out_ms` that was calculated from a contradicted estimate.

## 4. Cross-Segment VO Handling

- **First segment**: Write the full VO content
- **Subsequent segments**: Mark with `"(continued)"` to indicate continuation
- Split at natural sentence boundaries or emotion/theme transition points

## 5. Creative Planning Application Guidance

**Describe VO style qualitatively**, e.g.:
- "Young female voice, warm and friendly tone, conversational feel like talking to a friend"
- "Mature male voice, professional and authoritative tone, conveying trustworthiness"

**Describe VO's role**, e.g.:
- "VO drives narrative progression, pushing the story forward"
- "VO serves as an emotional layer, amplifying the mood of the visuals"
- "VO and visuals complement each other - visuals show the scene, VO tells the philosophy"

**Output VO content**: Segmented copy aligned with the narrative outline, annotated with timing, tone shifts, and emotional beats

**Avoid**: Specifying timestamps, exact speech-rate parameters, technical voice-direction notes
**Focus**: VO's overall style and emotional tone, relationship to visuals, specific copy creation, narrative role positioning

## 6. Voice Catalog And Selection Rules

When `audio_produce` is used in post-production, use only approved `voice_id` values from this catalog. Do not invent, remember, or reuse external voice IDs.

### 6.1 Two Different Decisions: Tool Fallback vs Agent Scheduling

There are two separate voice-selection decisions:

1. **Tool default fallback** - used only when the active `audio_produce` schema supports default resolution from `language_code`. This layer should stay simple: one broad source-language default per supported language.
2. **Agent scheduling** - used during creative planning when the brief gives gender, accent, tone, role, or scenario. This layer may choose a better voice than the broad default, but still only from the approved catalog.

Tool fallback must not do creative scheduling. Agent scheduling must not use unlisted voice IDs.

### 6.2 Tool Default Fallback Compatibility

When the user has no voice requirement beyond language:

- If the active `audio_produce` schema allows language-only default resolution, pass `language_code` and let the tool resolve its configured default voice.
- If the active `audio_produce` schema requires `voice_id`, choose the matching broad default from the shortcuts below and pass that approved catalog `voice_id`.
- If no default exists for the requested language, surface the limitation instead of inventing or silently substituting an external voice.

### 6.3 Agent Scheduling Order

When the Agent actively chooses a voice, apply this order:

1. **Language first** - prefer a source-language voice whose `lang` or coverage includes the requested `language_code`.
2. **Hard user constraints** - match explicit gender, age, accent, or "same voice/reference voice" requirements. If the catalog cannot satisfy a hard constraint, say so instead of silently substituting.
3. **Scenario/tone** - choose based on use case: UGC, brand ad, explainer, documentary, high-energy short, luxury, character, etc.
4. **Broad default** - if the brief has no useful voice preference, use the language default route described above.
5. **No external fallback** - never use a `voice_id` that is not in the catalog.

If a user asks for "same voice", "use this uploaded voice", "voice clone", or visible lip-sync, do not treat ordinary TTS catalog selection as enough. Route to the reference-voice / dubbing / audio-conditioned visible-speech path, or state the limitation.

### 6.4 Approved Voice Catalog

Match by language, gender, accent, and scenario. This table includes both the original catalog voices and the expanded approved voices.

| Key | Name | Voice ID | Lang | Gender | Accent / Coverage | Style | Recommended Use |
|---|---|---|---|---|---|---|---|
| shan_shan | Shan Shan | `ByhETIclHirOlWnWKhHc` | zh | female | Beijing Mandarin | youthful, energetic | social short video, lively narration |
| james_gao | James Gao | `4VZIsMPtgggwNg7OXbPY` | zh | male | standard Mandarin | steady, friendly | product intro, narrative voiceover |
| kevin_tu | Kevin Tu | `BrbEfHMQu0fyclQR7lfh` | zh | male | Taiwan Mandarin | natural, steady | news, documentary |
| anna_su | Anna Su | `9lHjugDhwqoxA5MhX0az` | zh | female | Taiwan Mandarin | casual, bright | podcast, social media |
| haoran | Haoran | `pU9NaAwkoR3v0Mrg3uKz` | zh | male | Beijing Mandarin | deep, magnetic | advertising, brand promo |
| siqi_liu | Siqi Liu | `W8lBaQb9YIoddhxfQNLP` | zh | male | Beijing Mandarin | warm, soft | brand story, emotional narrative |
| evan | Evan | `kbrsaic1zriFXx1pgRYN` | zh | male | Taiwan Mandarin | healing, gentle | wellness, slow content |
| lee_ting_ting | Lee Ting Ting | `gU2KtIu9OZWy3KqiqNj6` | zh | female | Taiwan Mandarin | sweet, gentle | lifestyle, soft narration |
| xiaoxi | Xiaoxi | `9DMBSOAnMDPiFAsz1ZGK` | zh | female | standard Mandarin | friendly, sweet | podcast, dialogue-adjacent voiceover |
| ling | Ling | `Z8Aisvg1z70p27kGvkZZ` | zh | female | Taiwan Mandarin | calm, knowledgeable | education, enterprise training |
| lao_dao | Lao Dao | `2I36mEahS1u7ZnTKUoaB` | zh | male | Beijing Mandarin | professional broadcaster | formal report, feature program |
| danyu_zhao | Danyu Zhao | `BWN0mOtkGHghA3CYFzFK` | zh | male | Beijing Mandarin | clear, approachable | storytelling, tutorial explainer |
| zi_yue | Zi Yue | `5qr5FEpvZGzmVOPBS55W` | zh | female | standard Mandarin | gentle, delicate | emotional narrative, poetry |
| sage | Sage | `APSIkVZudNbPAwyPoeVO` | zh | female | standard Mandarin | warm, healing | meditation narration, brand story |
| sarah | Sarah | `EXAVITQu4vr4xnSDxMaL` | en | female | American | mature, confident | brand ad narration |
| george | George | `JBFqnCBsd6RMkjVDRZzb` | en | male | British | warm storytelling | brand story, documentary |
| eric | Eric | `cjVigY5qzO86Huf0OWal` | en | male | American | smooth, trustworthy | product ad, commercial narration |
| bella | Bella | `hpp4J3VqNfWAUOO0d1Us` | en | female | American | professional, bright | product intro, corporate promo |
| lily | Lily | `pFZP5JQG7iQjIQuC4Bku` | en | female | British | silky, elegant | luxury, premium brand |
| daniel | Daniel | `onwK4e9ZLuTAKqWW03F9` | en | male | British | steady announcer | news, formal explanation |
| brian | Brian | `nPczCjzI2devNBz1zQrb` | en | male | American | deep, powerful | trailer, grand promo |
| jessica | Jessica | `cgSgspJ2msm6clMCkdW9` | en | female | American | lively, warm | light content, lifestyle |
| liam | Liam | `TX3LPaxmHKxFdv7VOQHJ` | en | male | American | high energy | short video, social media |
| bill | Bill | `pqHfZKP75CvOlQylNhV4` | en | male | American | stable, authoritative | finance, automotive, premium ads |
| river | River | `SAz9YHcvj6GT2YYXdXww` | en | neutral | American | neutral, cool | tech product, minimal style |
| callum | Callum | `N2lVS1w4EtoT3dr4eOWO` | en | male | American | husky, mysterious | character short drama, villain role |
| otani | Otani | `3JDquces8E8bkmvbh6Bc` | ja | male | standard | calm, professional | narrative narration, ad voiceover |
| kenzo | Kenzo | `b34JylakFZPlGS0BnwyY` | ja | male | standard | soft, quiet | tutorial explainer, narration |
| sakura | Sakura | `EGPLqH9Wz2tNLu58EJVR` | ja | female | standard | clear, cool | product explainer, narration |
| imoko | Imoko | `BEpnUAbmbxOaW1cCYscA` | ja | female | Kanto | soft, warm | warm family story, lifestyle |
| hamida | Hamida | `JjTirzdD7T3GMLkwdd3a` | ar | male | Arabic | commercial, clear | ads, explainer, formal narration |
| ghizlane | Ghizlane | `u0TsaWvt0v8migutHM3M` | ar | female | Arabic | warm, lifestyle | social, lifestyle, brand ad |
| alejandro_duran | Alejandro Duran | `sKgg4MPUDBy69X7iv3fA` | es | male | Spanish / LatAm | commercial | ads, narration, explainer |
| cristina_campos | Cristina Campos | `CaJslL1xziwefCeTNzHv` | es | female | Spanish / LatAm | social, warm | UGC, lifestyle, short video |
| anika | Anika | `90ipbRoKi4CpHXvKVtl0` | en | female | Indian English | UGC influencer | South Asian English UGC, service ads |
| adam_hype | Adam (Hype) | `IRHApOXLvnW57QJPQH2P` | en | male | English | high energy | meme, brainrot, drill-sergeant, hype shorts |
| stacy | Stacy | `hkfHEbBvdQFNX4uWHqRF` | zh | female | Mandarin Chinese | natural UGC | product seeding, lifestyle, conversational VO |
| raju | Raju | `zT03pEAEi0VHKciJODfn` | hi / ur | male | South Asian | explainer | Hindi/Urdu explainer, education, product VO |
| nicolas | Nicolas | `aQROLel5sQbj1vuIVi6B` | fr | male | French | commercial, documentary | brand story, explainer, documentary |
| audrey | Audrey | `McVZB9hVxVSk3Equu8EH` | fr | female | French | elegant brand | brand ad, lifestyle, premium |
| karo_yang | Karo Yang | `5mZxJZhSmJTjL7GoYfYI` | zh | male | Mandarin Chinese | natural explainer | tutorial, product explainer, knowledge |
| martin_li | Martin Li | `WuLq5z7nEcrhppO0ZQJw` | zh | male | Mandarin Chinese | deep, narrative | documentary, premium brand, emotional story |
| coco_li | Coco Li | `Ca5bKgudqKJzq8YRFoAz` | zh | female | Shanghai Mandarin | relaxed | fashion, podcast, chill narration |
| zara | Zara | `jqcCZkN6Knx8BJ5TBdYR` | multi | female | British / multilingual | brand, global | explicit multilingual/cross-language only |
| christopher | Christopher | `G17SuINrv2H9FC6nvetn` | multi | male | British / multilingual | narrative, global | explicit multilingual/cross-language only |
| amelia | Amelia | `ZF6FPAbjXT4488VcRRnw` | en | female | British | upbeat | social, energetic brand, short video |
| mark | Mark | `UgBBYS2sOqTuMpoF3BR0` | en | male | American | casual | podcast, conversational, social |
| zicai | Zicai | `DVE92KG0Yd4X7RoMqy8J` | zh | male | Mandarin Chinese | variety, energetic | entertainment, variety VO, short video |
| anna_kim | Anna Kim | `uyVNoMrnUku1dZyVEXwD` | ko | female | Seoul Korean | brand narration | Korean ads, brand VO, formal explainer |
| nikolay | Nikolay | `3EuKHIEZbSzrHGNmdYsx` | ru | male | Russian | commercial | Russian ads, social, commercial VO |
| marina | Marina | `ymDCYd8puC7gYjxIamPt` | ru | female | Russian | brand narrative | Russian brand story, narration |
| otto | Otto | `FTNCalFNG5bRnkkaP5Ug` | de | male | German | commercial | German brand story, explainer |
| lea | Lea | `7eVMgwCnXydb3CikjV7a` | de | female | German | brand narrative | German brand ad, narration |
| matheus | Matheus | `36rVQA1AOIPwpA3Hg1tC` | pt | male | Brazilian Portuguese | narrative, social | Portuguese narration, social VO |
| keren | Keren | `33B4UnXyTNbgLmdEDh5P` | pt | female | Brazilian Portuguese | social | Portuguese social, short video |
| doga | Doga | `IuRRIAcbQK5AQk1XevPj` | tr | male | Turkish | social, ad | Turkish social, ads |
| gokce_deniz | Gokce Deniz | `oPC5I9GKjMReiaM29gjY` | tr | female | Turkish | dialogue, lifestyle | Turkish dialogue, lifestyle, social |
| david_zh | David | `M336tBVZHWWiWb4R54ui` | zh | male | standard Mandarin | deep, soothing, sincere | narrative story, warm explainer |
| stella_gu | Stella Gu | `BqljjWyTnrioXPCNkCd4` | zh | female | Beijing Mandarin | cold, calm | serious conversational VO |
| julia_zh | Julia | `tOuLUAIdXShmWH7PEUrU` | zh | female | standard Mandarin | young, smooth, neutral | conversational, social |
| jin_zh | Jin | `vZZLclMx4wouUtKBRfZn` | zh | male | standard Mandarin | clear, warm, casual | daily narration, product VO |
| aman | Aman | `Z5oklYidFFuqcVQNGzYK` | zh | male | Beijing Mandarin | soft, whisper | ASMR, gentle narration |
| zhile | Zhile | `bdt3B5N3GXM2nOc0SUW7` | zh | male | Beijing Mandarin | casual | natural story, young male VO |
| nina | Nina | `El018FmI047NtSsCfyrY` | zh | female | Chinese | sweet, warm | conversational, soft social |
| lin | Lin | `UFDAUkGzdLAEJlINT3Fx` | zh | male | standard Mandarin | warm, friendly | conversational, customer style |
| aliby | Aliby | `qwKjxMVO8wNg6qaKKH1k` | zh | male | Beijing Mandarin | gentle | social media, relaxed narration |
| amy_zh | Amy | `bhJUNIXWQQ94l8eI2VUf` | zh | female | Beijing Mandarin | friendly, natural | conversational, UGC |
| niraj_zh | Niraj | `zgqefOY5FPQ3bB7OZTVR` | zh | male | standard Mandarin | smooth, deep | narrative story, premium explainer |
| giovanni_zh | Giovanni Rossi | `fzDFBB4mgvMlL36gPXcz` | zh | male | standard Mandarin | deep, sympathetic | narrative story |
| kanika_zh | Kanika | `H6QPv2pQZDcGqLwDTIJQ` | zh | female | standard Mandarin | soft, professional | narrative, training, explainer |
| liuping | LiuPing | `pTOe8BQRdydOEIgv0wFL` | zh | male | Beijing Mandarin | clear, professional | tutorial, knowledge, education |
| adrian_zh | Adrian | `agczkAUlHLowaNnL72Cc` | zh | male | standard Mandarin | neutral narration | Chinese Mandarin narration |
| ethan_zh | Ethan Zhang | `brChkoggsUHF1stW6omH` | zh | male | Beijing Mandarin | deep, smooth | premium explainer, high-end narrative |
| helen_sun | Helen Sun | `Iqi0ix5WGtiSXX9VDZB4` | zh | female | standard Mandarin | formal, clear | enterprise training, formal explainer |
| steven_gor | Steven Gor | `M0TrFmFeBJS9H4xzdk8Z` | zh | male | standard Mandarin | low, calm | knowledge, soothing explainer |
| yun | Yun | `YxbjaPemDJV2xlfvkiIG` | zh | female | standard Mandarin | elegant, gentle | soft narration, brand story |
| maya_zh | Maya | `GgmlugwQ4LYXBbEXENWm` | zh | female | standard Mandarin | young, calm | narrative, calm explainer |
| robert_multi | Robert | `BtWabtumIemAotTjP5sk` | multi | male | American / multilingual | calm, professional | explicit multilingual informative content |
| shaun_multi | Shaun | `RKCbSROXui75bk1SVpy8` | multi | male | British / multilingual | clean, reliable | explicit multilingual explainer |
| shelley_multi | Shelley | `4CrZuIW9am7gYAxgo2Af` | multi | female | British / multilingual | clear, confident | explicit multilingual explainer |

### 6.5 Quick Routing Shortcuts

- **Tool default only**: `zh -> stacy`, `en -> jessica`, `ja -> sakura`, `ar -> hamida`, `es -> alejandro_duran`, `hi/ur -> raju`, `fr -> nicolas`, `ko -> anna_kim`, `ru -> nikolay`, `de -> otto`, `pt -> matheus`, `tr -> doga`.
- **Chinese UGC / natural conversational**: `stacy`, `amy_zh`, `julia_zh`, `jin_zh`, `lin`.
- **Chinese explainer / education**: `karo_yang`, `liuping`, `adrian_zh`, `helen_sun`, `steven_gor`.
- **Chinese premium / documentary**: `martin_li`, `ethan_zh`, `david_zh`, `niraj_zh`.
- **Arabic**: default male `hamida`; female/lifestyle `ghizlane`.
- **Spanish**: default male `alejandro_duran`; female/social `cristina_campos`.
- **South Asian**: default `raju`; Indian English UGC female `anika` when the brief asks for Indian-accented English.
- **French**: default male `nicolas`; premium/lifestyle female `audrey`.
- **High-energy meme / shouted short**: `adam_hype`; do not use external Adam IDs.
- **Multilingual**: `zara`, `christopher`, `robert_multi`, `shaun_multi`, `shelley_multi` only when explicitly requested or when the tool path marks a deliberate cross-language fallback.

### 6.6 Hard Rules

- Do not switch voices mid-video unless the creative brief explicitly calls for multiple speakers.
- When a multi-sequence video uses post voiceover, keep the same `voice_id` across all VO segments unless there is an intentional speaker change.
- If the user explicitly asks for a specific accent, prioritize accent match over generic style fit.
- If the user provides a voice reference requirement that the current tool path cannot satisfy, surface that limitation instead of silently substituting an arbitrary voice.
- **Only use `voice_id` values from the approved catalog above.** Do not invent or reuse voice IDs from memory, prior sessions, analytics logs, public examples, or external providers. If no catalog voice fits, choose the closest approved source-language voice and state the approximation; never use an unlisted ID.
- Tool default fallback is not creative scheduling. If the active tool path has no configured default for a language, reject or surface the limitation rather than silently using English or multilingual voices.
