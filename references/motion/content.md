# Motion content contract

Choose `meta.mode: "motion"`. Default `language` is `en`; choose `zh` for Chinese. Every visible string is an input field or a localized player control. No user brand or commercial content is baked into the background. This schema is separate from the business-presentation schema.

## Minimal input

```json
{
  "meta": {"mode":"motion", "language":"en", "title":"A clear story", "fps":30},
  "slides": [
    {"id":"opening", "type":"motion-title", "title":"Make the next step clear", "highlight":"clear"},
    {"id":"question", "type":"motion-input", "variant":"multiline",
      "prompt":"Summarize the evidence and suggest one useful next step.",
      "notes":{"purpose":"Show the actual request, not a card describing an input."}}
  ]
}
```

The generator accepts only registered keys and validates counts and copy budgets. Use notes for narration or metadata that is not meant to appear on screen.

## Root and shared fields

| Field | Type / behavior |
|---|---|
| `meta.title` | required document title |
| `meta.mode` | `motion` |
| `meta.language` | `en` default / `zh` |
| `meta.fps` | 24,25,30,50,60; default30; downstream frame mapping |
| `meta.logo` | optional image or `{light,dark}`; list identity falls back to packaged `assets/motion/mark.svg` when omitted |
| `meta.showLogo` | list scenes only; defaults true; false only after explicit no-Logo choice |
| `meta.brandName` | optional descriptive metadata; never replaces a missing supplied logo with a hardcoded brand |
| `slide.id` | stable unique kebab-case; preserve it when editing copy |
| `slide.type` | one of the motion-registry layout types |
| `slide.variant` | layout-specific named variant |
| `slide.title` / `kicker` | visible heading / optional section label on compatible layouts |
| `slide.background` | `content`, `title`, `elements`; defaults are layout-specific |
| `slide.duration` | optional suggested shot length; at least one frame at meta.fps, at most180s; overrides shorter per-layout defaults |
| `slide.notes` | `{title,purpose,talk:[],transition}`; not painted on the canvas |

## Replace images and logos

```json
{"src":"./brand/wordmark.svg", "alt":"Your company", "fit":"contain", "position":"50% 50%"}
```

A plain local path is shorthand for an image object. Paths resolve relative to the input JSON. Absolute local paths also work. Packaged `assets/...` references are resolved from the Skill when no matching local file exists. Missing files fail generation; remote URLs must be downloaded locally first for offline capture. PNG, JPG/JPEG, WebP and SVG are accepted. Logos always use contain and preserve their intrinsic ratio, regardless of supplied fit.

Supported replacement slots:

- Single/pair brand page: `logos: [image]` or `[image,image]`; optional `separator`. Default Aident identity is the complete `assets/motion/lockup.svg`, not text-only lettering. A template slot may instead be `{placeholder:"YOUR LOGO",caption:"Replace with your brand"}`; this renders live text, not a fake partner image. Replace the entire entry with an image when supplied. Never pair one brand's symbol and wordmark as separate identities. Keep `mark.svg` for compact identity slots or an intentionally chosen graphic-only shot.
- List page: `image` overrides `meta.logo`, then packaged Aident. `showLogo:false` hides this scene's identity; it overrides `meta.showLogo`. Row `items[].image` stays independently replaceable and is not hidden by this flag.
- Card page: `items[].image` is an optional small visual, separate from title/body.
- Input pill: `image`, `label`, `prompt`.
- Joint/hub: `hub.image`, `hub.title`, `items[].image`, `items[].title`, `items[].label`.
- Image scene: `image.src`, `alt`, `fit`, `position`; `body` is the left-side copy in split mode.

Choosing an existing `assets/icons/light/*.svg` for Motion Slides extracts the existing design-system glyph without the old 60px surface. The packaged motion glyph keeps all original paths and uses a tight normalized 46px image box. This avoids shrinking the actual symbol inside a second card. User logo files are never cropped or treated as these design-system glyphs.

## Layout fields

| Type | Required and optional visible fields |
|---|---|
| title | `title`; optional `highlight` must exactly match part of title; optional `kicker` |
| brand | `logos`; optional `separator` default `×`; no heading |
| cards / comparison | `title`, `items[].title`; optional `kicker`, item `label/body/image/tone` |
| input | `prompt`; compact may include `label/image`; `showSend` default true; `showCursor` default false; `send:{state,ariaLabel}` optional |
| list | `items[].title`; optional `image/showLogo`, row `body/badge/image/checked/tone`; checked variant applies check by default |
| synthesis | `title`, 1–4 `groups` of 1–4 tag objects, 1–3 `outputs`; tag `id/title/tone/size`; optional `composition` controls arrangement, role sizes, Fill/Hug and alignment |
| hub | `title`, `hub` title and/or image, 1–4 `items`; satellite title and/or image plus optional `label`; optional explicit `connections` with slots |
| workflow | `title`, 2–4 ordered `items` with `title`, optional `label/body/image`; optional adjacent `connections:{id,from,to}[]`; no central hub |
| image | `title`, `image`; optional `body` on split, optional `kicker` |
| metric | `title`, `value`; optional `label/body/kicker` |

Do not put a property on a layout that has no visible slot for it. For example, `body` belongs to split-image copy, not a Logo-only scene. There is no callout/source/header property in this mode. Keep source attribution or evidence in notes unless it is itself the subject of visible user-provided copy.

For synthesis, follow [synthesis-composition.md](synthesis-composition.md). Default peers and outputs are medium, not24→30→50 by column. Use one composition-level `size`, `tagWidth` and `align` for peers; changing each tag's size alone does not repair irregular widths or alignment. Explicit mixed roles remain supported when justified by the content.

## List sequencing and scroll

```json
{
  "id":"results", "type":"motion-list", "variant":"checked", "duration":16,
  "image":{"src":"./brand/mark.svg","alt":"Your brand"},
  "scroll":{
    "itemOrder":"top-to-bottom", "direction":"up"
  },
  "items":[
    {"title":"Define the outcome","body":"Start with one visible result.","badge":"Ready"},
    {"title":"Collect source material","body":"Keep the original evidence available.","badge":"Collected"}
  ]
}
```

The excerpt shows two rows; longer lists keep ALL rows in the same auto-height track. The whole scene (Logo + track) may extend beyond the canvas, which is the sole camera boundary. No nested overflow-hidden/auto container, mask, fixed viewport height or scroll-distance calculation is permitted. Suggested order is top-to-bottom; suggested whole-scene travel is upward. All rows start fully visible in the DOM, though some are off-camera.

Legacy `scroll` keys (`enabled/start/end/reveal/itemDirection`) remain accepted for old content as advisory metadata only. They do not move, hide, crop or limit content. New examples omit preset ranges. Downstream tools choose travel, framing and timing; slide duration is an editable editorial suggestion, not a limit on motion design.

Legacy `motion: {enter,stagger,hold,exit,travel,preset}` is accepted only as advisory metadata (seconds/pixels; legacy preset names rise/fade/none). No defaults are injected and no effects are applied. Prefer plain-language ideas in `notes.transition`. New animation styles belong to the chosen animation engine, not to this renderer.

Before generating a user's deck, ask whether to keep default Aident, replace the Logo, or omit it. Unanswered means Aident; do not block or render an empty identity. The list fallback is automatic. For `motion-brand`, the author supplies `logos` explicitly using the chosen/default asset; for compact Input or a hub identity, populate the appropriate image slot when the storyboard calls for it. Do not substitute Aident for a missing explicit custom file: missing paths must fail with an actionable error.

## Output editing workflow

For exact timing, palette choices, explicit edge schemas, independent Logo-pair replacement and the Send state/click API, read [editable-components.md](editable-components.md). Source changes require regeneration; direct runtime state/color/transform editing belongs to the downstream animation author.

1. Prefer editing the source JSON and regenerating for copy, logos, images, and counts.
2. For direct motion authoring, use the generated folder. Edit its HTML/CSS or adapt it into the chosen animation project.
3. Stable slide/component selectors are in `animation-handoff.json`. Text/image leaf selectors are unique in that build. Inserting/reordering content can renumber leaf selectors, so regenerate the handoff after structural edits.
4. Wait for fonts/images, call `AIDENT_MOTION.layout()`, and rerun preflight after changing text or images.
5. Preserve font licenses and relative assets when delivering an editable folder to an editor.
