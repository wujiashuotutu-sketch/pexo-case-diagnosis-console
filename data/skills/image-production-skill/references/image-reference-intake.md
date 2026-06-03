---
id: image-reference-intake
description: Reference asset intake rules for standalone image production: role labels, ground-truth handling, coverage checks, and multi-reference binding.
---

# Content

## I. What This File Owns

Use this reference when a still-image task includes uploaded images, existing generated images, screenshots, masks, products, people, logos, packaging, UI, or multiple references.

It answers:

1. What role does each reference asset play?
2. Which user-provided pixels are ground truth?
3. Which subjects are covered, partially covered, or uncovered?
4. How should multiple references be passed and bound in one image call?

## II. Reference Role Labels

Assign every asset one or more role labels:

| Role | Meaning |
|---|---|
| `product_ref` | Specific product or object identity. |
| `character_ref` | Specific person, character, face, body, wardrobe, or identity. |
| `style_ref` | Look, lighting, palette, texture, medium, mood. Does not preserve subject identity by itself. |
| `environment_ref` | Specific place, room, landscape, street, set, or spatial background. |
| `packaging_ref` | Package design, brand material, labels, logo placement, typography layout. |
| `ui_ref` | App screen, dashboard, webpage, device screen, chart, interface. |
| `layout_ref` | Composition, poster layout, crop, framing, hierarchy, spatial arrangement. |
| `mask_ref` | Region mask for a local edit. Use only with a route that supports masks. |
| `target_state_ref` | A desired final state or control key frame. Does not replace original subject references. |

One asset can carry multiple labels. Example: a phone screenshot may be both `ui_ref` and `layout_ref`.

## III. Ground Truth Rules

User-provided images are the source of truth for any covered product, person, logo, package, UI, text element, or scene.

Do not:

- Recreate a covered subject from prompt-only text.
- Use a user image merely as inspiration while omitting it from the generation call.
- Describe a logo, product, face, package, or UI from memory instead of passing the actual image.
- Replace a real uploaded product with a more generic AI version unless the user explicitly asks for redesign.

Allowed:

- Use the uploaded image directly.
- Use image-to-image or reference-led generation to adapt the uploaded image.
- Generate a supplementary `target_state_ref` when it fills a real gap, while still passing the original subject refs.

## IV. Coverage Check

For each subject the final image must preserve, classify coverage:

| Coverage | Meaning |
|---|---|
| `covered` | A clear reference image exists and should be passed to the tool. |
| `partial` | The subject appears but is small, occluded, low quality, wrong angle, or embedded in a busy scene. |
| `uncovered` | No visual reference exists; the subject must be inferred from text or requested from the user. |

Coverage tests:

- Product identity: would the generated image still know the product's shape, scale, colors, label, and material if the prompt text were removed?
- Person/character identity: would the model still know the face, hair, wardrobe, body type, and key identity traits?
- Logo/package/UI/text: are the actual glyphs or layout visible in a reference?
- Scene/environment: does the reference encode the actual spatial identity, not only a mood?

`style_ref` is not subject coverage. It anchors mood and look, not product/person/logo identity.

## V. Multi-Reference Binding

When the target image needs multiple references, pass all required references in the same `image_generate` call whenever the live schema supports it.

Prompt pattern:

```text
Image 1 is the product reference. Image 2 is the character reference. Image 3 is the layout reference. Create a single finished image where...
```

Rules:

- Bind each reference by position and role.
- Spend prompt text on target action, composition, scale, placement, and forbidden mutations.
- Do not re-describe the full appearance already visible in the references.
- Do not silently drop a reference and compensate with text.
- If the selected provider cannot carry all required refs, switch route or create a composite reference sheet first.

## VI. Text, Logo, UI, And Packaging

If exact text, UI, logo, label, chart, certificate, or package copy must appear, the safest source is a reference image containing those glyphs.

- Pass exact screenshots, logo files, package photos, or layout images when available.
- For decorative typography, AI rendering can be acceptable as best effort.
- For prices, phone numbers, URLs, compliance copy, dense UI, or exact data, warn that AI image rendering may distort details unless a deterministic graphic-rendering path exists.
- Do not bury exact text requirements in long prose; keep them explicit and visually contextual.

## VII. Reference Priority

When capacity is limited, prioritize:

1. `product_ref`, `character_ref`, `packaging_ref`, `ui_ref`
2. `layout_ref`, `target_state_ref`
3. `environment_ref`
4. `style_ref`

Reason: identity and exact content failures are usually more costly than mood/style drift.

