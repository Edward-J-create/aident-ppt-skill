# Motion content contract

Choose `meta.mode: "motion"`. Default `language` is `en`; choose `zh` for Chinese. Every visible string is an input field or a localized player control. No user brand or commercial content is baked into the background. This schema is separate from the business-presentation schema.

## Minimal input

```json
{
  "meta": {"mode":"motion", "language":"en", "title":"A clear story", "fps":30},
  "slides": [
    {"id":"opening", "type":"motion-title", "title":"Make the next step clear", "highlight":"clear"},
    {"id":"method", "type":"motion-cards", "title":"Two useful moves", "items":[
      {"label":"01", "title":"Collect inputs", "body":"Gather the material needed to make the decision."},
      {"label":"02", "title":"Choose a step", "body":"Turn the evidence into one action with a clear owner."}
    ]}
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
| `meta.logo` | optional image or `{light,dark}`; default identity for list scenes only |
| `meta.brandName` | optional descriptive metadata; never replaces a missing supplied logo with a hardcoded brand |
| `slide.id` | stable unique kebab-case; preserve it when editing copy |
| `slide.type` | one of the motion-registry layout types |
| `slide.variant` | layout-specific named variant |
| `slide.title` / `kicker` | visible heading / optional section label on compatible layouts |
| `slide.background` | `content`, `title`, `elements`; defaults are layout-specific |
| `slide.duration` | optional suggested shot length, 2–180 seconds |
| `slide.notes` | `{title,purpose,talk:[],transition}`; not painted on the canvas |

## Replace images and logos

```json
{"src":"./brand/wordmark.svg", "alt":"Your company", "fit":"contain", "position":"50% 50%"}
```

A plain local path is shorthand for an image object. Paths resolve relative to the input JSON. Absolute local paths also work. Packaged `assets/...` references are resolved from the Skill when no matching local file exists. Missing files fail generation; remote URLs must be downloaded locally first for offline capture. PNG, JPG/JPEG, WebP and SVG are accepted. Logos always use contain and preserve their intrinsic ratio, regardless of supplied fit.

Supported replacement slots:

- Single/pair brand page: `logos: [image]` or `[image,image]`; optional `separator`.
- List page: `image` overrides `meta.logo`; each `items[].image` is independently replaceable.
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
| input | `prompt`; compact may include `label/image`; `showSend` default true; `showCursor` default false |
| list | `items[].title`; optional `image`, row `body/badge/image/checked/tone`; checked variant applies check by default |
| synthesis | `title`, 3 `groups` of 1–4 tag objects, 1–3 `outputs`; tag `title/tone/size` |
| hub | `title`, `hub` title and/or image, 3/4 `items`; satellite title and/or image plus optional `label` |
| image | `title`, `image`; optional `body` on split, optional `kicker` |
| metric | `title`, `value`; optional `label/body/kicker` |

Do not put a property on a layout that has no visible slot for it. For example, `body` belongs to split-image copy, not a Logo-only scene. There is no callout/source/header property in this mode. Keep source attribution or evidence in notes unless it is itself the subject of visible user-provided copy.

## List sequencing and scroll

```json
{
  "id":"results", "type":"motion-list", "variant":"checked", "duration":16,
  "image":{"src":"./brand/mark.svg","alt":"Your brand"},
  "scroll":{
    "enabled":true, "reveal":"sequential",
    "itemOrder":"top-to-bottom", "itemDirection":"fade",
    "direction":"up", "start":2, "end":14
  },
  "items":[
    {"title":"Define the outcome","body":"Start with one visible result.","badge":"Ready"},
    {"title":"Collect source material","body":"Keep the original evidence available.","badge":"Collected"}
  ]
}
```

The two-item excerpt above fits without scrolling. Long lists keep all rows in the same track. Defaults: top-to-bottom appearance; fade per item; whole track moves upward. `itemDirection: "up"` or `"down"` describes only the small optional per-item entrance translation; it never changes list order or whole-track direction. `itemOrder` changes appearance order only when the user explicitly requests it.

`scroll.start/end` are seconds local to this slide. End must be greater than start and at least .3 seconds before slide end. When the content is shorter than the window, scroll distance is zero. With scroll disabled, only the clipped initial window is shown; do not use that for final long-list delivery unless the external animator owns the scroll.

`motion` is an optional preview setting: `{enter,stagger,hold,exit,travel,preset}`. Seconds are seconds, travel is pixels; presets are `rise`, `fade`, `none`. These are editorial timing hints and minimal preview behavior. The `exit` field reserves transition room; it does not apply a built-in exit effect. External animation tools may disregard these hints and author their own timeline.

## Output editing workflow

1. Prefer editing the source JSON and regenerating for copy, logos, images, and counts.
2. For direct motion authoring, use the generated folder. Edit its HTML/CSS or adapt it into the chosen animation project.
3. Stable slide/component selectors are in `animation-handoff.json`. Text/image leaf selectors are unique in that build. Inserting/reordering content can renumber leaf selectors, so regenerate the handoff after structural edits.
4. Wait for fonts/images, call `AIDENT_MOTION.layout()`, and rerun preflight after changing text or images.
5. Preserve font licenses and relative assets when delivering an editable folder to an editor.
