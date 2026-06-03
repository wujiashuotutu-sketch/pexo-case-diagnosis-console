---
id: image-generation-guide
description: Image generation strategy - routing, reference discipline, prompt rules, and the minimal live schema contract for image_generate.
---

# Content

## I. What This File Owns

This reference is the strategy layer for image_generate. It answers:

1. Which image route fits the creative goal?
2. When must user assets be passed as real references instead of described in text?
3. Which live schema fields are easy to get wrong?
4. What prompt hygiene prevents visible technical artifacts?

It is not a full API manual. Use the live tool schema as source of truth whenever a field is unclear.

## II. Routing Strategy

Image tasks usually fall into three families:

| Task family | Primary route | Use when |
|---|---|---|
| Design-expression | GPT Image 2 | The image must understand intent, organize information, handle typography/layout, refine packaging, or produce a polished commercial composition. |
| Reference-consistency | Gemini / Nano Banana 2 | The image must preserve a user-provided product, person, character, scene, or composition while extending or adapting it. |
| Style-domain | Seedream | The user explicitly wants anime, animation, CG, illustration, concept art, or another stylized visual language as the core goal. |

### Routing Principles

Do not choose the route by asking only whether the task is text-to-image or image-to-image. Choose by failure cost:

- If wrong text, weak hierarchy, poor instruction following, or weak layout is the biggest risk -> prefer **GPT Image 2**.
- If subject drift, product drift, unstable identity, or unsafe reference extension is the biggest risk -> prefer **Gemini / Nano Banana 2**.
- If insufficient stylization in an explicitly stylized visual domain is the biggest risk -> prefer **Seedream**.

### Default Biases

- High-information commercial visuals, posters, KVs, packaging, infographics, text-heavy frames, and exact layout tasks -> **GPT Image 2**.
- Most general reference-led production tasks -> **Gemini / Nano Banana 2**.
- Photorealistic product references, product beauty shots, ecommerce stills, and realistic product-in-context frames -> **Gemini / Nano Banana 2** by default.
- Explicit anime / animation / CG / illustration / concept-art requests -> **Seedream**.
- Do not route ordinary photorealistic product work to Seedream just because the user wants it to be beautiful.

### Fallbacks

- If GPT Image 2 edit fails on a reference-led full-frame transformation, retry with Gemini / Nano Banana 2.
- If Gemini / Nano Banana 2 preserves identity but feels flat, polish with GPT Image 2 when the need is structure/design, or Seedream when the need is explicit stylization.
- If Seedream looks attractive but loses subject fidelity, fall back to Gemini / Nano Banana 2.

## III. Live Schema Contract

Keep this section short. It exists to prevent wrong calls, not to duplicate every tool field.

### Top-Level Routing

- GPT Image 2 is called through provider: "fal", model: "openai/gpt-image-2".
- GPT Image 2 text-to-image uses mode: "text2image" and provider_param key fal_gptimage2_text2image.
- GPT Image 2 image-to-image uses mode: "image2image" and provider_param key fal_gptimage2_image2image.
- Gemini uses provider: "gemini", model: "gemini-3.1-flash-image-preview".
- Seedream uses provider: "seedream", model: "seedream-4-5-251128" for current default routing.

### Fields That Matter

| Field | Rule |
|---|---|
| aspect_ratio | Supported by current image routes. Use one of "1:1", "4:3", "3:4", "16:9", "9:16". Match the target video ratio when creating video references. |
| image_size | Use only when the live schema exposes it. GPT Image 2 via FAL supports "2K" / "2k" only. Gemini and Seedream support "2K", "4K", "2k", "4k". Do not satisfy a user-requested 4K output by silently sending 2K. |
| files | Required for current image-to-image routes. Always pass an array, even for a single source image. Do not use legacy single-image fields such as file, image, or image_url. |
| mask_url | Optional only for GPT Image 2 image-to-image. Use it for true region-local edits where the mask dimensions match the source. Do not use a mask when the whole composition should be reconsidered. |

### Parameter Hygiene

- Pass size and ratio through parameters, never in prompt text.
- Do not send raw pixel strings, explicit {width,height}, legacy size, or auto unless the live schema explicitly supports them.
- Default to one output image for production references unless the user explicitly asks for alternatives.

## IV. Usage Scenarios

### 1. Supplementary Character References

Generate when the user provides only one angle of a recurring character but the story needs dynamic action or non-frontal views.

- Multi-angle turnaround: front, 3/4, side, and back views in a neutral pose, preferably as one composite image.
- If preserving likeness is the priority, prefer Gemini / Nano Banana 2.
- If the final sheet needs cleaner structure, labels, wardrobe changes, or design organization, use GPT Image 2 edit.
- Use Seedream only when the requested character reference is explicitly anime / CG / illustration styled.
- Include: no visible brand logos, no trademark symbols, plain unbranded clothing and items.

### 2. Product Reference Images

Generate only when the user has not provided a product photo. If the user uploaded a product image, use it directly.

- Product close-up: clean background, well-lit, showing the product clearly.
- Product-in-context: include a realistic scale statement such as palm-sized, fits in one hand, or approximately 8cm tall.
- Stable product-preserving extension from a real reference -> Gemini / Nano Banana 2.
- Design-heavy commercial visual, packaging composition, or exact text-led refinement -> GPT Image 2.
- Explicit stylized product rendering -> Seedream.

### 3. Packaging Key Frames And Text-Heavy Frames

Use image generation for Layer 1 design text: packaging, signs, title boards, infographics, decorative typography, and key visual layouts.

- The key frame should look like an actual frame of the final video: correct ratio, text placement, subject relationship, and visual continuity.
- Prefer GPT Image 2 when text accuracy, composition logic, and hierarchy matter.
- Use Gemini / Nano Banana 2 when the frame must stay tightly anchored to an existing user-provided layout or packaging image.
- Use Seedream only for explicitly stylized anime / illustration / CG typography visuals.
- If the user provided the exact text/graphic/image to reproduce, use that original image directly or edit from it. Do not regenerate it from scratch.

### 4. Style And Environment References

Generate when a sequence needs a strong mood, spatial identity, or reusable visual anchor.

- Style reference: color palette, lighting quality, texture, grain, mood.
- Environment reference: real spatial cues such as furniture, architecture, lighting fixtures, street layout, or interface context.
- Gemini / Nano Banana 2 is usually safest for adapting from user photos.
- GPT Image 2 is better when the environment also needs signage, hierarchy, UI, information layout, or stronger design intent.
- Seedream is for explicitly stylized environments.

### 5. Multi-Reference Scene Images

Generate when multiple distinct references must appear together in one image: multi-character scene, product + person, packaging + environment, or storyboard/key-frame composite.

- Every referenced asset must be passed through files in the same order used by the prompt.
- Prompt should bind roles by order: image 1 is the product reference, image 2 is the character reference....
- Describe pose, expression, interaction, placement, scale, and constraints. Do not re-describe full appearance already visible in the references.
- If the active path cannot carry all required references, switch to a composite reference sheet or another supported route. Never silently drop references and pretend they were passed through prompt text.
- A control key frame may anchor a high-risk target state, but it does not replace the original user uploads. Keep original character_ref / product_ref alongside target_state_ref or completed_look_ref.

## V. Prompt Rules

### Reference-First Economy

When the image generation call uses references, describe the edit or transformation intent, not the full visual content of the source image. The model already sees the source.

Use text for:

- role binding,
- target action or composition,
- scale,
- visibility requirements,
- spatial relationship,
- forbidden mutations.

Avoid long prose restatements of visible identity traits; over-description can cause the model to synthesize a new subject from text instead of preserving the reference.

### Prompt Hygiene

Image prompts should describe only visual content. The following must be parameters or removed:

- Aspect ratios, pixel sizes, presets, 2K, 4K, HD, 1920x1080.
- Hex / RGB / CMYK values. Convert them to natural-language color descriptions.
- Internal ids, case ids, sequence numbers, asset ids, filenames unless required by the tool's material syntax.
- Technical field names such as aspect_ratio, image_size, files, mask_url.

Mandatory pre-call check before every image_generate:

1. Choose route and parameters first.
2. Confirm real references are passed in files when the task refers to uploaded or generated images.
3. Strip technical strings and color codes from prompt text.
4. Read the prompt as if every token might be rendered into the image.

Quick examples:

- Wrong: 9:16 poster, #000840 background, premium skincare ad
- Right: prompt: "premium skincare ad, deep navy blue background, elegant studio lighting" plus aspect_ratio: "9:16"
- Wrong: 1920x1080 hero visual, 2K quality
- Right: prompt: "cinematic horizontal hero visual, crisp commercial lighting" plus aspect_ratio: "16:9"

### Text In Image Prompts

- Decorative / artistic text (Layer 1): valid for image generation when it is part of the visual design.
- Precise post text (Layer 2): subtitles, short titles, CTA lines, lower-thirds, simple captions, and timed overlays belong to assembly as controlled text/subtitle layers.
- Reference-stage refusal gate: when the requested text is clearly a subtitle, narration caption, motivational sentence, or spoken line rather than a true design element, do not burn it into a reference image.
- Chinese / Japanese / Korean characters: specify the exact characters when they are real design text. Minor rendering errors are acceptable only for decorative use, not data or compliance content.

## VI. Hard Rules

### User-Provided Images Are Ground Truth

When the user uploaded an image of the product, character, text element, package, logo, or scene, that image is the definitive reference. Do not:

- Pass it through prompt-only regeneration.
- Recreate it via text-to-image with a description.
- Use it as inspiration while silently discarding the actual pixels.

If the job is to change the uploaded image, use a true edit/reference-led route. If the job is to preserve it while extending safely, prefer Gemini / Nano Banana 2.

### Generated References Are Inputs

Supplementary reference images are intermediate assets for video production. They are not user-facing deliverables unless the workflow explicitly asks for review.

### One Asset, One Role

Each generated reference should serve a clear role. Avoid one overloaded image that tries to solve product + character + environment + brand + text all at once. Generate separate references when slots allow.

### Seedream Is Not The Generic Beauty Default

Do not route to Seedream merely because the user wants the result to be beautiful. Use it when beauty is requested through an explicit style language: anime, animation, CG, illustration, concept art, or similar stylized domains. Ordinary commercial beauty + structure usually belongs to GPT Image 2 or Gemini / Nano Banana 2 depending on whether design expression or reference consistency matters more.
