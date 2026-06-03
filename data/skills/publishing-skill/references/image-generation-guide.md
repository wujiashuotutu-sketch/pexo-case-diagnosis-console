---
id: image-generation-guide
description: Image generation strategy — model routing, usage scenarios, prompt rules, and common pitfalls. Centralized reference for all skills that call image_generate.
---

# Content

## I. Model Routing

Two providers; routing depends on the generation task.

| Provider | Strengths | Use When |
|---|---|---|
| **Gemini / Nano Banana 2** (`gemini-3.1-flash-image`) | Strong consistency, realistic rendering, stable iterative edits, good packaging/key-frame utility, reliable reference-driven workflows | **Default for most tasks** — reference-led image-to-image, realistic scenes, character sheets, packaging / key frames, extending an existing visual anchor, consistency-sensitive iteration |
| **Seedream** (`seedream-4-5-251128`) | Higher aesthetic quality, more delicate rendering, stronger finish, polished brand/product visuals | Hero visuals that need premium polish, mood-setting images, refined text-to-image when no reference exists, Chinese packaging / Chinese layout compositions that must feel brand-grade |

**Default choice**: **Gemini / Nano Banana 2** is the default for general image generation tasks — it offers the best balance of consistency, reference fidelity, and reliability. Route to **Seedream** only when the task specifically demands premium visual polish (hero product shots, brand-grade packaging, high-aesthetic mood frames) and consistency with existing references is secondary.

**Fallback**: If one provider fails, retry with the other. If **Gemini / Nano Banana 2** stays close to the reference but the result lacks polish, re-route to **Seedream**. If **Seedream** looks great but drifts too far from the supplied reference, re-route to **Gemini / Nano Banana 2**.

### Size Parameters

| Provider | Parameter | Supported Values | Notes |
|---|---|---|---|
| Seedream 4-5 | `size` | `"1920x1080"`, `"1080x1920"`, `"1024x1024"` | Pixel dimensions only. Do not use shorthand (`1k`, `2k`, `4k`) — rejected by API. |
| Gemini / Nano Banana 2 | `aspect_ratio` + `image_size` | aspect_ratio: `1:1`, `9:16`, `16:9`, etc. image_size: `"512"`, `"1K"`, `"2K"`, `"4K"` | Use aspect_ratio to control proportions, image_size for resolution / throughput. |

**Match the video's aspect ratio**: When generating reference images for video production, use the same aspect ratio as the target video (16:9, 9:16, or 1:1) so the reference frame composition aligns with the generated video. **Use the mapping table below — do not pass the video's aspect ratio string directly as the image tool's parameter.**

**Video aspect ratio → image generation parameter mapping:**

| Video aspect ratio | Seedream `size` | Gemini / Nano Banana 2 `aspect_ratio` |
|---|---|---|
| 16:9 | `"1920x1080"` | `"16:9"` |
| 9:16 | `"1080x1920"` | `"9:16"` |
| 1:1 | `"1024x1024"` | `"1:1"` |

**Hard rules:**
- **Seedream accepts pixel dimensions only** — never pass ratio strings like `"16:9"` or `"9:16"` as the `size` parameter. Always use the exact pixel values from the table above.
- **Gemini / Nano Banana 2 accepts ratio strings only** — never pass pixel dimensions like `"1920x1080"` as the `aspect_ratio` parameter.
- **No unsupported values** — do not invent sizes (e.g., `"1280x720"`, `"720x1280"`) or ratios (e.g., `"4:3"` for Seedream). Stick to the values listed in the table.

### Non-Standard Aspect Ratios

Image generation only supports three aspect ratios (16:9, 9:16, 1:1). When the user requests a non-standard ratio (e.g., 1.91:1 for PMAX display ads, 4:5 for Instagram, 2.35:1 for cinematic):

1. **Do not force the content into a supported ratio** — this causes letterboxing (black bars) or content distortion.
2. **Generate at the closest supported ratio that fully covers the target**, then crop to exact target dimensions using `execute_edit_video`:
   - Target wider than 16:9 (e.g., 1.91:1) → generate at 1:1, crop a horizontal strip
   - Target between 16:9 and 1:1 (e.g., 4:3) → generate at 1:1, crop accordingly
   - Target between 1:1 and 9:16 (e.g., 4:5) → generate at 9:16, crop accordingly
3. **Design the composition for the crop zone** — in the prompt, describe the content as filling the horizontal/vertical band that will survive the crop, so important elements are not cut off.
4. **Crop spec**: Use `execute_edit_video` with `output.format: "png"`, `output.fps: 1`, and a single video track clip with `crop` parameters to extract the target region, then `width`/`height` to scale to exact pixel dimensions.
5. **Inform the user once** (first occurrence only): briefly note that you're generating at a native ratio then precision-cropping to their exact spec.

## II. Usage Scenarios

### 1. Supplementary Character References

Generate when the user provides only one angle of a character but the story requires dynamic action.

- **Multi-angle turnaround**: Front, 3/4, side, back views in neutral pose. Pass as a single composite image.
- **Prompt**: Describe the character from the user's reference image, then request specific angles. Include "no visible brand logos, plain unbranded clothing."
- **Routing**: If the goal is to create the most refined and appealing reference sheet, prefer **Seedream**. If the user already provided a good anchor and the main goal is to preserve likeness while expanding angles, prefer **Gemini / Nano Banana 2**.
- **Priority**: Generate BEFORE video production, not during. These are inputs to the video pipeline.

### 2. Product Reference Images

Generate only when the user has NOT provided a product photo. If the user uploaded a product image, use it directly — never AI-regenerate it.

- **Product close-up**: Clean background, well-lit, showing the product clearly.
- **Product-in-context**: Product held by a hand or placed in a scene. **Must include realistic scale statement**: "palm-sized", "fits in one hand", "approximately Xcm tall" — AI models exaggerate product size for visual impact.
- **Routing**: Use **Seedream** when the goal is a premium, polished, brand-grade image. If a user-provided product image already exists and the task is to keep close consistency while extending or adapting it, **Gemini / Nano Banana 2** is also valid.
- **Priority**: product_ref > character_ref > style_ref > environment_ref.

### 3. Packaging Key Frames (Layer 1)

Pre-render on-screen text, brand compositions, and decorative typography as images. The video model cannot reliably render text from prompt descriptions alone.

- **Composition context**: The key frame should look like an actual frame of the final video — text positioned relative to the subject, correct aspect ratio, visual continuity with the sequence.
- **Text rendering**: For packaging / key-frame work, route by the dominant need. If the task is **Chinese packaging, Chinese layout, or a brand-facing packaging visual that should feel more polished and finished**, prefer **Seedream**. If the task is more reference-led and iteration-heavy, **Gemini / Nano Banana 2** is a good default.
- **User-provided image priority**: When the user has already provided an image containing the exact text/graphic to reproduce (product label, logo, bowl with printed text), **use that original image directly** — do not AI-regenerate it. AI re-rendering of precise text introduces character errors and style drift.

### 4. Style Reference Frames

Extract from concept preview videos (mid-point frame where visual tone is most established) or generate when no concept preview exists.

- **Extraction > Generation**: Always prefer extracting a frame from an existing video over generating a new style reference. Extraction preserves the exact look; generation introduces interpretation.
- **When generating**: Describe the desired color palette, lighting quality, texture/grain, and mood. Reference the user's style inputs if available. Prefer **Seedream** when this frame is meant to establish the main visual taste / mood anchor.
- **One style ref for all sequences**: The same style reference frame must appear in every production sequence's image_list to maintain visual consistency.
- **Style ref is not identity ref**: The style reference frame is only responsible for look. It must never be used as evidence that recurring characters or continuity-critical locations are "covered." Those require their own role-specific references.

### 5. Environment Reference Images

Generate when the story involves a specific location that has no user-provided reference.

- **Context in frame**: Include elements that establish the space (furniture, architecture, lighting fixtures) — not just a texture or color.
- **Lower priority**: Environment references can often be described in text when image slots are limited. Only generate when the environment is critical to the narrative.

### 6. Multi-Character Scene Images (Storyboard Panels, Key Frames)

Generate when the scene requires **multiple distinct characters with separate reference images** to appear together in a single image — storyboard panels, key frame compositions, or any scene where character identity consistency matters.

- **All character references must be input**: Pass every character's reference image to the same `image_generate` call. The model must "see" each character's actual appearance — text descriptions of referenced characters drift severely because the model has no visual anchor for the specific toy/person/character design.
- **Provider routing**: Route by priority. If the main goal is a more beautiful, delicate, and finished image, prefer **Seedream**. If the main goal is keeping the result tightly aligned to existing references across iterations, prefer **Gemini / Nano Banana 2**.
- **Prompt structure**: In the prompt, declare each input image's role explicitly: `"image 1 is Character A (Pochacco plush toy), image 2 is Character B (Labubu in Pochacco costume). Both characters appear together in the scene: [scene description]."` Describe only **pose, expression, and interaction** — do not re-describe appearance details visible in the reference images.
- **Anti-pattern — analyze then describe**: Do **not** use `analyze_file_content` to generate a text description of a reference image and then substitute that description for the image itself in a `text2image` call. This pattern loses all fine-grained visual detail (specific proportions, textures, color nuances, accessory details) and is the primary cause of "doesn't look like the reference" failures. The text description is useful for understanding the character internally — but the image itself must be passed to the generation model.
- **Control key frames are valid when they reduce drift**: For transformation / reveal tasks, a supplementary key frame can be the right move when it anchors a critical target state that is likely to drift without visual control — for example, a final worn look, an assembled product payoff, or another high-stakes completed state. Use this sparingly; it is a control device, not a default preview ritual.
- **Reference-led hard rule for control key frames**: If the target state still concerns a character / product / scene already covered by user uploads, generate the control key frame from those uploads via direct reference input. Do **not** recreate the same covered subject via prompt-only `text2image`.
- **Role discipline**: A control key frame for a completed state does not replace the original user uploads. Keep the original subject/product references and add the control key frame as a separate target-state anchor.
- **When the active tool path cannot carry all references cleanly**: Generate a **composite reference sheet** first — arrange the characters / subjects side by side in one image, then use that composite as the primary reference for scene generation. Do not silently drop lower-priority references just to fit a provider shortcut.
- **Consistency across storyboard panels**: When generating a series of storyboard panels for the same story, pass the **same set of character reference images** to every panel's generation call. Do not use different subsets of references across panels — this causes character appearance to vary between frames.

**Example — correct vs wrong for a jewelry reveal**

- **Correct**: The user uploads a model portrait and a product photo of the jewelry. The task is to show the jewelry materializing onto the model. If the final worn look is high-risk, generate **one** `completed_look_ref` using those two uploads as image inputs, then pass **all three** assets into the video generation call: `character_ref`, `product_ref`, `completed_look_ref`.
- **Wrong**: Analyze the model image and product image, rewrite them as text, then call `text2image` to invent a "model wearing the jewelry" frame. This drops the fine-grained visual identity and usually causes product/detail drift.

### 7. MG Animation / Info Graphics Key Frames (Text-Anchored Production)

Generate key frame images for every sequence in text-heavy video formats: MG (motion graphics) animation, news graphics, kinetic typography, data visualization, infographics.

- **Purpose**: Video generation models cannot reliably render readable text (especially non-Latin characters like Chinese, Japanese, Korean). Key frame images serve as visual anchors — the video model animates from/around them, preserving text legibility.
- **Composition**: Each key frame should look like an actual frame of the final video — correct aspect ratio, text positioned as it would appear on screen (large, centered, with appropriate visual hierarchy), background/graphic elements matching the overall style direction.
- **Text requirements**: Include the exact characters to be displayed. Describe the desired typographic feel (bold sans-serif, handwritten, modern condensed, etc.) but do not rely on the model to match a specific typeface. For **Chinese packaging / Chinese layout**, prefer **Seedream**. For reference-led packaging extension or stable iterative key-frame work, **Gemini / Nano Banana 2** is a good default. If the result needs a more polished hero-visual feel, re-run with **Seedream**.
- **Batch generation**: When the video has N sequences with text, generate all N key frames in a single batch (parallel image_generate calls). Present to user for text accuracy confirmation before proceeding to video generation.
- **Prompt pattern**: `"Motion graphics [style] key frame. [Background description]. [Text content in quotes] displayed prominently in [position], [typographic style], [color]. [Graphic elements]. [Aspect ratio]. Clean, sharp, high contrast — designed for video generation input."`
- **Common case**: News MG animation — each segment has a headline + supporting graphic (icon, illustration, data visualization). Generate one key frame per segment with the headline text and visual elements composed together.

## III. Prompt Rules for Image Generation

### Reference-First Economy (same principle as video prompts)

When the image generation call uses `image2image` mode (editing an existing image), the same anti-over-description rule applies: describe the **edit intent** (what to change, what style to apply), not the source image's visual content. The model sees the source image directly.

### Product Scale Anchoring

When generating images that include a product alongside a person, **always include a realistic scale statement** in the prompt. AI models exaggerate product size for visual impact, and this distortion cascades into video generation when the image becomes a reference.

- **Right**: `"a small palm-sized yogurt cup held naturally in one hand, the cup is approximately 8cm tall"`
- **Wrong**: `"holding a yogurt cup"` — model will likely make the cup oversized.

After generation, visually verify the product's scale relative to the person. If distorted, regenerate with stronger scale constraints.

### Brand Logo Avoidance

AI models frequently hallucinate recognizable brand logos (Nike, Adidas, Apple) on clothing, shoes, bags, and devices. Include in every character/scene prompt:

`"no visible brand logos, no trademark symbols, plain unbranded clothing and items"`

If a generated image contains visible brand logos, regenerate — do not use it as a reference.

### Prompt 中禁止写入技术参数

图片生成的 prompt 只描述画面内容。以下信息**必须通过 API 参数传入，禁止写在 prompt 文本中**——模型会把 prompt 里的任何文字当作画面内容来渲染：

- **比例 / 尺寸**：`9:16`、`16:9`、`1:1`、`1920x1080` 等 → 用 `aspect_ratio` 或 `size` 参数
- **分辨率 / 画质**：`4K`、`高清`、`HD` 等 → 用 `image_size` 参数
- **颜色代码**：`#000840`、`rgb(0,0,0)` 等 → 直接用自然语言描述颜色（如 "deep navy blue background"）。**用户 brief 中的 hex/RGB 色值同样适用此规则** — agent 可以用自身推理能力理解 hex 对应什么颜色，但必须翻译为自然语言后再写入 prompt，禁止把用户文本中的色值代码原样搬入。
- **任何内部 ID、序号、元数据** → 不应出现在 prompt 中

**错误示例**：`"A news broadcast graphic, 9:16 aspect ratio, #000840 dark background, AI简报 title"` → 模型会把 `9:16` 和 `#000840` 渲染为画面上的可见文字。

**正确示例**：`"A news broadcast graphic, deep navy blue background with lightning effects, title 'AI简报' in large bold white text centered"` + API 参数 `aspect_ratio: "9:16"`。

**调用前强制检查（每次 `image_generate` 前都要过一遍）**：
- **先看参数，再写 prompt**：先确定 provider，然后先填对 `size` / `aspect_ratio` / `image_size`，最后再写纯画面描述 prompt。
- **扫描 prompt 中的技术字符串**：如果 prompt 里出现 `9:16`、`16:9`、`1:1`、`1920x1080`、`1080x1920`、`4K`、`HD`、`#xxxxxx`、`rgb(...)`、内部 case id / asset id，必须删除或改写。
- **颜色只用自然语言**：不要写十六进制或 RGB；改写成 `deep navy blue`、`warm gold`、`muted jade green` 这类视觉描述。用户 brief 里的色值也要先翻译 — LLM 可以推理出 `#A2D2FF` 是天蓝色，把推理结果（而非原始代码）写进 prompt。
- **比例只走 provider 参数**：Seedream 用像素尺寸；Gemini / Nano Banana 2 用比例字符串。禁止把比例同时写在 prompt 和参数里。
- **把 prompt 当成会被印到图上的文案**：如果某段文字真的不该出现在成图里，就不要把它留在 prompt 中。
- **如果刚刚为了用户参考图调用过 `get_file_info`**：下一跳 `image_generate` 必须真的消费这些图；如果没有消费，而是改成 prompt-only `text2image`，立即停止并修正，这是参考链断裂。

**快速改写示例**：
- **Wrong**: `"9:16 poster, #000840 background, premium skincare ad"`
- **Right (Seedream)**: `prompt: "premium skincare ad, deep navy blue background, elegant studio lighting"` + `size: "1080x1920"`
- **Right (Gemini / Nano Banana 2)**: `prompt: "premium skincare ad, deep navy blue background, elegant studio lighting"` + `aspect_ratio: "9:16"`

### Text in Image Prompts

- **Decorative/artistic text** (Layer 1): Describe the text content, position, and style. For **Chinese packaging / Chinese layout visuals**, prefer **Seedream**. For reference-led packaging iteration and stable key-frame extension, **Gemini / Nano Banana 2** is a good default. Use **Seedream** when the same frame also needs stronger atmosphere, finer detail, or higher visual finish.
- **Precise text** (Layer 2): Do not attempt. If the user needs character-accurate text, inform them of the limitation.
- **Chinese/Japanese/Korean characters**: Specify the exact characters in the prompt. Minor rendering errors are expected — acceptable for decorative use, not for data.

## IV. Critical Rules

### User-Provided Images Are Ground Truth

When the user has uploaded an image of the product, character, text element, or any visual asset, **that original image is the definitive reference**. Do not:

- Pass it through `image2image` to "improve" or "clean up" — this introduces appearance drift.
- Regenerate it via `text2image` with a description — the description will never capture every detail, producing a subtly different version.
- Use it as input to generate a "better" version — every AI generation step adds cumulative visual deviation.

Only generate supplementary reference images for elements that have **no** user-provided visual reference. The user's original photo is always more accurate than any AI reconstruction.

### Generated References Are Inputs, Not Outputs

Supplementary reference images (character sheets, packaging frames, environment shots) are intermediate assets for the video generation pipeline — they are never shown to the user as deliverables. Generate them silently and use them in subsequent video generation calls.

### One Asset, One Role

Each generated reference image should serve a clear purpose. Do not generate a single image trying to capture product + character + environment + brand — the competing elements degrade each other. Generate separate reference images for each role when image slots allow.
