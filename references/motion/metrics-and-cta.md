# Metrics and closing actions / 大数字与行动尾页

Use these registered variants for numerical proof or a real next-step action. They are ordinary generator outputs, not CSS patches keyed to one slide ID. Examples: [English](../../examples/motion/promotional.en.json), [中文](../../examples/motion/promotional.zh.json).

## Choose the intended relation

| Content | Type / variant | Do not substitute |
|---|---|---|
| One value with context | `motion-metric` / `single` | Do not concatenate two independent measures into one `value`. A genuine ratio can remain one value. |
| One very large number | `motion-metric` / `hero-number` | Not an ordinary small Card title. |
| One short keyword | `motion-metric` / `hero-word` | Uses the language's display font, including Chinese; not a numeral-only font. |
| Two independent equal-weight measures | `motion-metric` / `cards` | Not `single` with `20M+ / 75+`, and not ordinary cards with 54px titles. |
| Identity plus an action | `motion-brand` / `cta` | Not `brand-title` + body copy or a Logo-only shot. |
| Identity only / a genuine headline | `motion-brand` single/pair / `motion-title` brand-title | CTA is not mandatory on every closing; respect the user's approved ending. |

When revising a deck, preserve the approved visual relation and optional elements. Before changing a template, compare the shot plan to the available variants. If a requested layout is unsupported, disclose the gap rather than silently collapsing the content or inventing a new title/body composition. Put narration and claims' sources in notes. Do not use post-generation scene-ID CSS or DOM injection as the sole source of a reusable layout.

## Paired metric cards

```json
{
  "id": "coverage", "type": "motion-metric", "variant": "cards",
  "title": "Two signals, one clear picture",
  "theme": "dark", "palette": "cobalt", "background": "brand",
  "items": [
    {"label":"ILLUSTRATIVE", "value":"20M+", "body":"Replace with the first verified measure."},
    {"label":"ILLUSTRATIVE", "value":"75+", "body":"Describe the second independent measure."}
  ]
}
```

- Exactly two entries. Each requires its own `value`; `label` and `body` are optional. No requirement to use every text role. All strings are replaceable; examples make no factual claim.
- Page title and optional kicker retain normal centered Motion heading tokens. Cards start at y429, x110, total width1700, gap30; each fills835px. Equal height, min330, Hug content; padding44 vertical/48 horizontal; gap16; radius20. Text is left aligned.
- Values: Outfit Regular132 /100%, tracking−4.5%, primary text color. Equal role and weight in both cards. Numeric glyphs use Outfit in both languages; Chinese units use the bundled body fallback.
- Descriptions: Noto Sans / Noto Sans SC26 /140%, EN tracking−1%, ZH0; Hug height, no forced text height. Labels retain the existing bilingual label token.
- Both cards use the same normal surface token. Dark = white6% fill/20% stroke, never solid white. Lime Light = white65% fill; label/value/body remain opaque. No automatic gradient or target/baseline emphasis on equal peer metrics.
- Shared CSS subgrid rows preserve both value baselines when one optional label is omitted or descriptions use different line counts. If neither card has a label/body, its row is absent; no invisible copy is invented. Retain this shared-row behavior when adapting to another renderer.
- Early budgets: value1–8 characters; label28 EN/14 ZH; body80 EN/36 ZH. Pixel fit is authoritative. Shorten or restructure overflow; never merge the two values or shrink them independently.
- Independent stable targets: `metrics`, `metric-card-0/1`, `metric-value-0/1`, and optional `metric-label-0/1`, `metric-body-0/1`.

## Hero value variants

`hero-number`: value up to6 characters; Outfit Medium360 /100%, tracking−6%. `hero-word`: up to12 EN/6 ZH characters, Outfit200 /110% tracking−2% or Smiley Sans200 /120% tracking0. Content starts y365, width1300 centered; support text32 /150%. They share the ordinary optional label/body fields. Long words/numbers must pass browser fit; budgets do not guarantee glyph-width fit. Existing `single` remains200 /110% for compatibility.

Lime is a preferred emphasis beat for a single large number or word, not the default for all data cards. Paired metrics normally use Light neutral or a calm solid Dark/brand background. Every registered palette remains an explicit option.

## Logo + CTA

**End cards use Light/neutral only. Neither Dark nor bright lime is used for endings, with or without CTA.** Explicitly set `theme:"light", palette:"neutral"` so a Dark or lime deck default cannot leak into the ending. The bilingual authoring gallery excludes Dark Logo-only and colored CTA endings. Renderer color compatibility remains a non-closing capability, not an ending recommendation.

```json
{
  "id":"next-step", "type":"motion-brand", "variant":"cta",
  "theme":"light", "palette":"neutral",
  "logos":[
    {"src":"./brand.svg","alt":"Your brand"},
    {"src":"./partner.svg","alt":"Approved partner"}
  ],
  "separator":"×",
  "label":"ASK YOUR AGENT",
  "cta":{"text":"Visit your getting-started page","href":"https://example.com/start","showArrow":true}
}
```

Use1 or2 independently replaceable logos, with the same intrinsic-ratio limits as single/pair identity shots (777×147 /597×113.062). No fabricated second brand; omit it or use an explicit template placeholder. Complete Aident lockup remains Light-only; Dark requires a suitable user asset or an explicitly chosen standalone mark. Do not silently swap identities or split lettering from the mark.

The centered vertical stack contains the Logo group, a110px gap, then an optional small label and the CTA with16px gap. It hugs its real content; omitting label/arrow/partner does not leave a phantom row. No large heading, body paragraph, page header, source footer or implicit Callout. `title`, `body` and `kicker` are rejected for this variant.

| CTA part | Canonical rule |
|---|---|
| Label | Noto Sans / Noto Sans SC20 /140%; EN tracking+8%, ZH0; secondary color; optional |
| Button text | Outfit / Noto Sans SC30 /140%, tracking0; editable, one line |
| Container | Hug width/height; min400×82; padding18 vertical/34 horizontal; radius16; text–arrow gap24 |
| Arrow | Independent30px currentColor SVG pointing upper-right (↗), reusing the packaged upward Send arrow with its own45° rotation token; Input arrow is unchanged. Optional `showArrow:false` |
| Light paint | `#007E86` fill, white text,20% dark-teal stroke; subtle packaged shadow |
| Dark paint (non-closing component compatibility only) | Brand cyan `#1EEAEA` fill, ink `#101B27` text; no gradient, shadow or visible stroke |

`cta.text` is required (64 EN/32 ZH characters max; browser fit required). Optional `cta.href` accepts an explicit HTTP(S), mailto, or fragment link. With it the component is an anchor; without it, an inert `type="button"` for downstream animation. No form submission, tracking or automatic navigation occurs during rendering. User-supplied target URLs are not fetched by the generator.

Named targets: `brand-cta` (whole scene), `logo-0`, optional `logo-1`, `separator`, `cta-group`, optional `cta-label`, `cta`, `cta-text`, optional `cta-arrow`/`cta-icon`. These are indexed in `animation-handoff.json`; CTA text is a text leaf, not flattened into a button bitmap. Animators can change button color/scale, pointer and click timing; the preview player never resets those states. An href is content, not an animation command.

## QA and reproducibility

Run `npm run motion:promotional:qa`. It tests both languages, all8 theme/palette combinations, omitted optional text, native link/button variants, logo replacement, independent values, regeneration stability, external states and single-file output. Run the full theme/control/synthesis suites for cross-layout changes.

Preflight checks text against padded Card/CTA bounds, heading/content separation, two-line statements, and every handoff selector against actual DOM. Missing or stale index entries fail even if the button looks correct. Visually review full-resolution captures for typography and balance; a passing count is not aesthetic approval.
