# Asset curator task

Inventory supplied visual assets and write `handoffs/assets.json`.

Requirements:

- Read `references/assets-and-branding.md` and `assets/icons/manifest.json`.
- For Motion Slides, read `references/motion/content.md` and `assets/motion/icons/manifest.json`. Use local assets, original fixed-size Joint vectors and normalized bare glyphs. Map `logos`, `hub.image`, `image`, and `items[index].image`; do not substitute presentation icon surfaces or header geometry.
- For Light/Dark Motion, read `references/motion/themes-and-combinations.md`. Supply image `variants` only with the required theme entries; never invert brands or add a white plaque. The complete packaged lockup requires a Light scene; a Dark replacement or standalone mark must be an explicit choice. Include row-node, result-image and list-tool slots in the asset review.
- Inspect only assets placed in the run `input/` directory or explicitly provided paths/URLs.
- Map each asset to a registered slide/image slot by stable slide ID when known.
- Record source/provenance, alt text, crop position, aspect-ratio suitability, and sensitivity risk.
- Use only packaged icon names; never draw a new icon or substitute emoji.
- Do not invent external assets or download stock images unless the user authorized it.
- Do not edit the narrative handoff or final deck.

Output shape:

```json
{
  "_status": "complete",
  "meta": {
    "role": "asset-curator",
    "assumptions": [],
    "missingAssets": []
  },
  "brand": {
    "logo": null,
    "rightText": null
  },
  "slides": {
    "slide-id": {
      "image": { "src": "input/assets/example.jpg", "alt": "Description", "position": "50% 50%" },
      "items": {
        "0": { "icon": "integration" }
      }
    }
  }
}
```
