# Themes and reusable scene combinations

Use this reference for dark video shots, compact brand/title openings, parallel workflows and result panels. These are maintained extensions of the Motion system, not claims that every extension appeared in the original design. All content and imagery remain replaceable. No new animation engine or entrance presets are installed.

## 1. Scene themes / 镜头主题

Set `meta.theme: "light" | "dark"` for the deck default; `slide.theme` overrides it. Omitted means Light, preserving existing decks. The same layout can use either theme. Do not duplicate an entire page family just to change its palette. Do not add ad hoc `#scene3` CSS patches.

| Role | Light | Dark |
|---|---|---|
| Primary text | `#111114` | `#FFFFFF` |
| Secondary text | `#5E6263` | `#D9E4ED` |
| Accent / connectors | `#008089` | `#1EEAEA` |
| Panel / Input / workflow node | `#FFFFFF` | white at 6% fill / 20% stroke |
| Neutral tag | gray on translucent light fill | `#D1D9DE` on `#303A43` |
| Info tag | blue | `#9CCCFF` on `#243D59` |
| Success tag | green | `#A0EBC0` on `#214838` |
| Warning tag | orange | `#FFD0A0` on `#513821` |
| Purple tag | purple | `#D6C3FF` on `#3D3157` |
| Accent tag | teal | `#9DEDF3` on `#20454B` |

Exact paints, gradients and Send states live in `assets/tokens/motion.json`, under `themes`. The single bright gradient output retains dark `onEmphasis` text in **both** themes: white text on that bright gradient would be unreadable. Semantic colors name categories, not row positions. Keep a category consistent across scenes; two or three purposeful categories usually suffice.

`background` keeps the same keys with theme-aware assets:

| Key | Light asset | Dark asset |
|---|---|---|
| `content` | motion-content-light.webp | dark-ink.webp |
| `title` | motion-title-light.webp | dark-aurora.webp |
| `elements` | light-elements-inner.webp | dark-elements-inner.webp |

Dark backgrounds reuse the packaged Lossless WebP assets; no compiled duplicates. Dark glyphs are mechanically extracted from the existing dark design-system icon assets, retaining paths and colors. Dark arrows/curves/stems retain **every original coordinate and dimension**; only their semantic paint changes. `normalize-motion-icons.mjs --check` verifies both. No CSS filter recoloring of brands.

Theme changes should signal a narrative beat, contrast or focus. They are not compulsory alternating cuts. There is no fixed quota. The authoring preference table in [scene planning](scene-planning.md#choose-the-default-style-deliberately) guides defaults without reducing technical layout coverage. Dense material may use the quiet `content` backdrop in either theme.

Dark component surfaces use white paint at 6% fill and 20% stroke; muted fill is 4%. Accent rows/cards keep the same 6% fill and raise the stroke to 40%. Text and the component itself remain opacity1. Comparison is intentionally separate: baseline 4% fill / 20% stroke and target 20% fill / 60% stroke. Do not use opaque white cards on dark backgrounds and do not lower the whole component opacity.

The stronger dark comparison target uses primary white for its body text as well as its heading, retaining readable contrast on the20% white fill over brand teal. Contrast checks composite actual ancestor paints rather than assuming every panel uses the ordinary6% surface. Image/gradient backgrounds still require visual review.

Dark List status badges and checks use the packaged brand cyan `#1EEAEA` with a 12% same-color fill. The dark check SVG is a mechanical recolor of the existing path; its geometry is unchanged. Do not substitute a film-specific green. Bright-lime Light scenes use white at 65% for panels, dark ink at 22% for strokes (40% emphasis), and dark text so cards and rows stay distinct from the field.

### Brand-color backgrounds / 品牌色背景

Dark is **not synonymous with gray**. Theme controls foreground contrast; palette controls color character; background controls surface treatment. Use `meta.palette` or `slide.palette` independently of `theme`:

| Palette | Light solid canvas | Dark solid canvas | Use |
|---|---|---|---|
| `neutral` (default) | original pale artwork | original ink artwork | Quiet baseline |
| `teal` | `#BCF3E9` | `#07525B` | Brand-tinted workflow, identity, statement |
| `cobalt` | `#CDD5FF` | `#14236F` | Solid deep-blue brand/information beat; one optional deep-blue gradient |
| `lime` | `#B9F64F` | `#244C2C` | Bright offer/metric or deep green information scene |

The saturated teal/lime/cobalt starting colors are reusable editorial options informed by the reviewed production example, **not mandatory corporate palette claims for every user**. Related lighter/darker component paints are maintained extensions. Choose a palette that suits the user's brand. Do not automatically equate any supplied logo with one preset. For a custom exact palette, a maintainer must add complete Light/Dark tokens and corresponding contrast tests rather than allowing an arbitrary hex to bypass quality checks.

- Non-neutral palettes default to `background: "brand"` (solid color).
- `background: "brand-gradient"` remains technically accepted for compatibility. Only Dark `cobalt` has a distinct recommended gradient (`#101B27 → #14236F`); other palettes resolve this field to their solid brand color and should not be selected merely for variety. The removed dark-green multi-color gradient must not return.
- Existing `content/title/elements` remain explicit background choices. To obtain a visibly brand-colored canvas, use `brand` or `brand-gradient`; an existing neutral background image will otherwise cover the palette's base fill.
- `brand` / `brand-gradient` require a non-neutral palette. `palette:"neutral"` restores the original neutral behavior even if a deck-level brand palette is set.
- Panel, Input, card, muted fill, stroke, table header/rule and secondary text follow the selected palette; semantic tag categories retain their readable, consistent theme colors. Bright gradient result tags still use dark text.
- Deep teal/blue/green use `theme:"dark"` and light text. A bright lime offer uses `theme:"light",palette:"lime"` and dark text. Never force white text onto a bright brand background merely because adjacent shots are Dark. Bright lime is preferentially routed to a large centered metric/keyword, not to a list or dense multi-card page; explicit exceptions remain supported.

```json
{"meta":{"mode":"motion","title":"Brand-colored scenes","language":"en","theme":"dark","palette":"teal"},
 "slides":[
  {"id":"statement","type":"motion-title","background":"brand-gradient","title":"Turn clarity into action"},
  {"id":"offer","type":"motion-metric","theme":"light","palette":"lime","value":"1","title":"One clear next step"}
 ]}
```

The original Light design is still the default for old input. Brand backgrounds are available to **all** registered families, not only cover/title. Availability is not a recommendation to mix them freely: openings/closings prefer Light or a solid brand color, Lists prefer a solid brand color, and lime prefers a large metric/keyword. First-frame, readability and asset-theme rules apply equally.

### Layout coverage and precedence / 全版式覆盖与优先级

The shared background system applies to `motion-title`, `motion-brand`, `motion-cards`, `motion-comparison`, `motion-input`, `motion-list`, `motion-synthesis`, `motion-hub`, `motion-workflow`, `motion-image` and `motion-metric`, including their registered variants (brand-title, parallel workflow rows and table/list results). There is no per-layout color whitelist. Image scenes retain their user image; a photograph covering part of the canvas does not recolor with the background.

Resolve `theme` and `palette` **independently**: slide field → matching meta field → `light` / `neutral`. `background` is slide-only; when omitted, a non-neutral palette chooses `brand`, otherwise the layout chooses its original background. Do not invent `meta.background`. To set one explicit treatment throughout a deck, populate `background` on each slide. `brand` / `brand-gradient` still require a non-neutral palette.

Selecting another background must preserve layout geometry, text roles, counts, optional fields and edit targets. Never switch a workflow into cards, force a Callout or move imagery just to obtain a color. Logo/theme suitability is an asset constraint, not a restriction on the page family. This contract is indexed in `motion-registry.json` → `components.theme` and exercised by the theme matrix tests.

## 2. Brand assets / 品牌资源

One image path can serve both themes **only if it is visibly suitable on both**. A logo, tool icon, node image or photograph can declare strict theme variants:

```json
{"src":"brand-light.svg","alt":"Your brand",
 "variants":{"light":"brand-light.svg","dark":"brand-dark.svg"}}
```

`src` is required as the normal image contract. Once `variants` is declared, the requested theme must exist; no silent fallback. Generation selects and packages only that scene's referenced variant. `meta.logo` also retains the existing `{light,dark}` list-identity syntax. The two entries in `logos:[left,right]` are independently replaceable and may each have their own variants.

The packaged complete `assets/motion/lockup.svg` is approved light-surface artwork, not a dark lockup. A dark scene using it is rejected with an actionable error. Options: keep that brand scene Light; supply a valid dark replacement; or explicitly select the approved standalone `assets/motion/mark.svg`. Never silently substitute a mark for a complete identity, extract the lettering, invert the asset, redraw it, or invent a white backing plaque. A custom file still needs visual review; successful loading is not proof of contrast.

Keep logos intrinsic-ratio, contain-fit and independent from the background. List `tools` slots have no automatic white boxes. Product imagery with intentional white UI should remain as supplied; do not confuse that content with a renderer-added plaque.

## 3. Brand + title / 品牌标题组合

`motion-title`, `variant: "brand-title"` accepts `logos` (one or two), `separator`, `title`, optional `highlight`, optional `kicker` and optional `body`. The whole stack centers vertically. Logo(s) appear **above** the statement, not beside the title or in a website header.

- Safe width1700, x110; statement116px with existing EN/ZH roles; maximum2 lines.
- Logo slot maximum420×80; preserve intrinsic ratio. Pair separators42px;32px gaps. Placeholder slots remain live editable text, never fake partners.
- Logo → optional kicker → title → optional body uses32px spacing; body36/150%, max1300 width. All block heights hug content.
- `kicker` is optional. Do not insert a small heading merely because a token exists.
- Both logos can be replaced; a single-logo opening is valid. No mandatory Logo × Logo shot.
- Default `motion-title` statement behavior remains unchanged. Ordinary `motion-brand` retains its existing single/pair bounds.

## 4. Parallel workflow rows / 多行流程

Use `motion-workflow`, `variant: "rows"`, `rows:[{id,items:[...]}]` to show1–3 comparable processes, each containing2–4 left-to-right nodes. This is separate from a hub and does not require a center.

```json
{"id":"parallel","type":"motion-workflow","variant":"rows",
 "theme":"dark","title":"Parallel work, one system",
 "rows":[
   {"id":"research","items":[{"id":"owner","title":"Research"},{"id":"task","title":"Find signals"},{"id":"result","title":"Brief"}]},
   {"id":"review","items":[{"id":"owner","title":"Review"},{"id":"task","title":"Check facts"},{"id":"result","title":"Decision"}]}
 ]}
```

Rows share the same column count, equal Fill widths and tallest node height across the group. Semantic columns should match, e.g. actor → task → tool → result. Labels, images and descriptions are optional; do not force all fields into every node. Body budget40 EN /16 ZH characters; node titles retain linear-workflow budgets. More fields consume more height: counts are supported ranges, not a guarantee arbitrary content fits.

Geometry: x110, y370, width1700, content zone≤610 high; row gap24. Node padding24, internal gap8. Node title30/150%; optional row image max72×36, intrinsic ratio. Every row has n−1 independent167×22.0919 arrows and24px clearance at either end. Add/remove columns in **all** rows and regenerate: arrow count and column widths follow. Do not stretch arrows to fill space. Different row topology should be separate scenes, not ragged columns or hidden dummy cards.

Node targets include row ID, e.g. `node-research-owner`; edge targets `connector-research-0`. `[data-motion="workflow-group"]` moves the whole diagram. A row target is `row-research`. Top-level `items/connections` are omitted for this variant: adjacent edges are generated per row. Original single-row explicit connections and1–4-satellite hub layouts remain supported. This is not an arbitrary graph/cycle router.

## 5. Dense tags and result panels / 信息标签与结果

Dense information still uses `motion-synthesis`, with1–4 groups ×1–4 tags and the [composition rules](synthesis-composition.md). Peers default to equal Fill cells, one font size and centered text; use unified left alignment for phrases. Rows/Hug are explicit alternatives, not random per-tag choices. Do not add all three size levels because they exist. A result table/list can replace output tags **within the same scene** without inventing a second redundant result shot.

- Set `outputs: []` and `result` for a result panel; omit `result` to use1–3 output tags.
- `result.type` defaults to `table`:2–4 `columns`,1–4 `rows`, every row matching column count. Optional `columnWidths` are positive relative weights; optional `accentColumn` is zero-based. No automatic accent column. Three-column legacy proportions default36/23/41; other counts share equal widths.
- `result.type: "list"`:1–4 concise strings in `items`; do not also provide table columns/rows. Max48 EN /20 ZH characters per item.
- Both variants accept required short `title`, optional `image`, optional `caption`. No invented source footer, callout, logo or column meaning.
- Result width840, padding24, internal gap16, radius20. Table cells14×12 padding; list rows14×16. Title28/150%, cells24/150%, header20/150%, caption18/150%. All text remains live and editable; one-line fit is checked at actual pixel width.
- The input panel remeasures available space beside the fixed original connector and result panel. For longer text choose fewer groups/columns, a smaller **semantic** tag size or another scene; never shrink the full scene or crop text to pass QA.

## 6. Animation handoff / 动画交接

`animation-handoff.json` version3 includes theme, layout, input and first-frame contracts. Node **outer shells** (`[data-layout-owner]`) own coordinates and constraints. Their **inner surfaces** (`[data-animation-target]`, named `node-…-visual`, `hub-visual`, `satellite-…-visual`) support opacity/scale/reveal without overwriting layout transforms. Keep a connected diagram together during translation. Moving one node independently does not automatically reroute its connectors. Call `layout()` once after fonts/images/content settle, before the animation timeline; not each frame.

Input separates live `[data-motion="prompt-text"]`, optional inline `[data-motion="caret"]`, optional mouse pointer `cursor` and independent Send. `showCaret: true` adds a static caret with no blink/preset; `AIDENT_MOTION.setPromptText(slideId,text)` updates live text and the caret follows its end. The mouse is not the typing caret. For a long typing animation, the downstream engine must reserve a stable Input/camera frame and validate line breaks; do not call a global layout on every keystroke.

All static content is visible at time0. A video animator must deliberately choose a readable first frame/poster rather than leaving a blank thumbnail. Entrance choreography, text timing, camera travel, audio/BGM continuity and final video QA belong to the downstream animation skill. Do not encode project-specific scene counts or music cuts into this layout library.

## 7. Verification

Run `node scripts/validate-motion-themes.mjs --browser` with the documented browser dependencies. It checks EN/ZH12-shot examples; all11 families in Light/Dark × neutral/teal/cobalt/lime;1–3 rows ×2–4 nodes; result2/3/4-column and list content; strict theme assets; unchanged logos/connector geometry; readable dark text and tags; input caret; independent node animation; offline single-file output. Run existing Motion controls/synthesis tests as regressions. Inspect screenshots: no automated pass substitutes for visual review.

Examples: `examples/motion/themes.en.json` and `themes.zh.json`. They are a component demonstration, not a required storyboard. Preview generation: `node scripts/build-motion-preview.mjs --themes` after theme browser QA. Previews remain Lossless WebP.
