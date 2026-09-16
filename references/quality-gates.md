# Quality gates

Quality is a release gate, not a final glance. Validate content, structure, browser layout, PDF rendering, and PPTX rendering independently.

This page's visual rules apply to Presentation mode. For `meta.mode: "motion"`, use [motion/quality.md](motion/quality.md); its centered headings and intentional list clipping are not errors. Shared integrity, licensing and release checks still apply. PDF/PPTX checks apply only when requested or their adapters changed.

## Severity

### P0: blocks delivery

- overlapping text/components;
- content outside the slide;
- broken/missing image or logo;
- unreadable contrast;
- wrong language font hierarchy across the deck;
- `150px` line-height error;
- 1px-high text frame;
- inner page title centered;
- standalone callout slide;
- plain white/black slide without required background treatment;
- sensitive/unapproved commercial content;
- corrupted/unopenable HTML, PDF, or PPTX.

### P1: must fix before external delivery

- point/card/step/metric title wraps;
- dense six-card or Team page title wraps or exceeds EN 30 / ZH 12 characters;
- icon glyph is not true standardized size/centering;
- icon surface is square, unclipped, has the wrong theme radius/surface, or the SVG contains an exported Figma canvas background;
- wrong light/dark icon variant;
- header/logo/right text not replaceable;
- source shown when it should be absent or missing for a material claim;
- callout border added or accent gradient missing;
- callout padding/blur/hug behavior visibly wrong;
- text too small for presentation viewing;
- inconsistent card height or component alignment;
- decorative imagery weakens comprehension;
- repeated visual monotony across the deck.

### P2: polish

- slightly uneven copy lengths;
- suboptimal theme rhythm;
- minor crop improvement;
- note wording or transition refinement;
- optional reduction in file size.

## Content gate

Before rendering:

- audience and decision are clear;
- title sequence tells a coherent story;
- each slide title states a takeaway;
- no slide repeats another slide’s purpose;
- counts match registered layouts;
- labels are optional and intentionally used;
- callouts are optional and support, not replace, main content;
- numbers are verified or clearly illustrative;
- source footer exists where required;
- commercial names/claims are user-provided or approved;
- no unresolved TODO/TBD/Lorem placeholders in final delivery.

## Static generator checks

`generate-deck.mjs` rejects:

- unknown or misspelled root/meta/slide/item/component fields;
- unknown slide type/theme;
- duplicate/invalid IDs;
- missing title;
- inner centered title override;
- unsupported item count;
- excessive title length;
- unregistered icon;
- emoji in item text;
- excessive callout length;
- invalid callout tone;
- missing local asset.

Treat validation failures as content/layout feedback. Do not bypass the validator.

## HTML browser preflight

Run:

```bash
RUNTIME_NODE_MODULES="$RUNTIME_NODE_MODULES" node "$SKILL_DIR/scripts/preflight.mjs" \
  --html /absolute/path/index.html \
  --screenshots /absolute/path/qa/html
```

Checks include:

- slide count and unique IDs;
- no standalone callout slide;
- background and texture present;
- no unresolved placeholder title;
- no emoji;
- no fixed 150px line-height;
- all images load;
- every visible icon is a centered 60×60 component (48×48 only in dense six-card layouts), uses its registered theme radius/surface, clips overflow, and loads from a clean intrinsic 60×60 SVG;
- every `data-one-line` element fits and remains one line;
- six-card, Team, and split-image-text-with-Callout page titles carry `data-one-line` and remain one line;
- brand header, slide heading, content zone, and source stay within slide;
- no overlap among major regions;
- slide scroll dimensions remain 1920×1080;
- the scaled deck remains centered and fully contained at 1280×720, 1366×768, 1440×900, and 1024×768, with no right/bottom clipping;
- bundled display fonts resolve;
- required local font files are present.
- folder output contains only referenced visual assets and required language/component font faces; README previews, font source archives, and unused backgrounds/icons must not leak into the generated deck.
- replacement header/cover logos retain their intrinsic aspect ratio within 1.5%.
- Accent Callout uses the registered three-stop gradient at 16% fill alpha, 20px blur, no stroke, full-opacity content, and an 88px minimum.
- Workflow renders a separate arrow row above every Step, including the final Step, and honors `showDividers: false`.

Successful result must say `0 errors`. Warnings need review; do not ignore them automatically.

## One-line auto-fit

The browser runtime reduces a one-line item only until its registered minimum:

- metric value minimum: 46px;
- item title minimum: 32px;
- other one-line text minimum: 14px.

This is a safety net, not a content strategy. If a title hits the minimum, consider shortening it or reducing columns. The preflight still fails if it cannot fit.

## Visual HTML review

Review montage for:

- theme/background rhythm;
- consistent heading position;
- repeated layouts not monotonous;
- callouts not overused;
- images placed as evidence;
- card heights/rows aligned;
- no abrupt density changes.

Also resize the browser through the registered landscape and 4:3 QA viewports. Grid/overview mode is not a substitute for a correctly fitted single-slide view: every normal slide must remain fully visible without switching modes.

DOM bounds alone do not detect glyph paint clipping. After changes to Presentation title CSS/fonts, run `npm run title:qa:en` and `npm run title:qa:zh` against newly generated examples. The pixel test compares gradient-painted glyph coverage to ordinary text across Light/Dark, cover/inner and single/multiline titles; its English negative fixture must reject missing descent bleed. Inspect `g/j/p/q/y` at full size. Keep the established line-height tokens; extend the paint area rather than changing typography or cropping overflow.

Inspect at full size:

- cover;
- densest 6-item slide;
- workflow;
- for Workflow, verify the arrow row is visibly above the Step row by 32px, no arrow is nested inside a Step, and number colors are `#008089` on Light / `#1EEAEA` on Dark;
- comparison;
- every image-heavy slide;
- every slide with a long title/callout/source;
- Chinese slides with mixed numerals/Latin text.

## Font gate

Run:

```bash
node "$SKILL_DIR/scripts/check-fonts.mjs"
```

Confirm bundled font files are present and local-required families are installed. Then check final rendering because presence does not guarantee the target application selected the font.

For PowerPoint, inspect text after opening/rendering. Font substitution may change wrapping even when HTML is correct.

## PDF gate

1. Export from the latest verified HTML.
2. Confirm page count and 16:9 page size.
3. Render every page with Poppler.
4. Inspect montage and full-size dense pages.
5. Check backgrounds, gradient text, SVG icons, images, sources, and Chinese glyphs.
6. Confirm no navigation/presenter UI is printed.
7. Confirm no clipping rectangles or hairlines surround titles, kickers, metrics, Callout emphasis, or header-right text; PDF uses the registered print-safe solid fallback for these gradient text roles.

Poppler Type 3 glyph warnings can occur with browser-generated SVG/text clipping; inspect the rendered glyphs. Treat any visible missing/boxed glyph as P0.

## PPTX gate

Run this gate only when PPTX was requested. HTML remains the primary visual standard. Font substitution or application-specific glyph metrics may require a final human adjustment in PowerPoint; such variance must be documented, but it must never be "fixed" by degrading the validated HTML layout.

1. Export from the same latest resolved JSON.
2. Render every slide.
3. Run the presentation overflow checker.
4. Run the packaged layout validator on the exported layout JSON:

```bash
node "$SKILL_DIR/scripts/validate-pptx-layout.mjs" \
  --layouts /absolute/path/output/qa/pptx-preview
```

It rejects shapes outside the slide and wrapped Point/Card/Metric/Step titles, Step labels/numbers, Callout leads, and Sources.
5. Inspect montage and full-size dense slides.
6. Confirm dark backgrounds remain dark and the dynamic WebP→PNG background matches the canonical source; a duplicated/opaque texture over the background is a P0 export bug.
7. Confirm text remains editable and speaker notes exist.
8. Confirm logos/icons/images are present and not stretched. Browser preflight compares every header/cover logo's rendered aspect ratio with its intrinsic ratio; any change above 1.5% is an error.
   For PPTX, inspect the package or a non-SVG-aware viewer to confirm the logo is backed by a real PNG rather than a transparent fallback.
9. Confirm source footer is not hidden behind callout/content.
10. Open in PowerPoint/Keynote when available for application-specific review.

## Image gate

- correct slot/ratio;
- subject visible after crop;
- no stretched image;
- sufficient resolution for the target slot;
- meaningful alt text in HTML;
- attribution/source when required;
- no sensitive data or unauthorized brand/customer material;
- no delivery placeholder unless explicitly accepted.

## Component gate

Header:

- logo optional and replaceable;
- logo keeps its intrinsic ratio; header height is 40px and cover identity height is 56px unless proportionally reduced for the safe width;
- right text optional and replaceable;
- correct theme asset;
- stays inside 1700px safe width.

Points/cards/steps/metrics:

- all left aligned;
- small title one line;
- labels optional;
- description uses Noto Sans/Noto Sans SC;
- icons true size and centered;
- Light icon boxes use a white 10px-radius clipped surface; Dark icon boxes use white at 8% opacity with a 12px-radius clipped surface; dense 48px variants use 8px/9.6px radii;
- equal visual height within a row.

Callout:

- never standalone;
- optional on all compatible layouts;
- default/accent variant correct;
- accent gradient is `#A0A9FE → #2EEEEE (47.9%) → #93FCB8`; Paint opacity is 16%, never 100%;
- 16% applies to the gradient fill/stops only; the Callout container, dot, and text remain fully opaque;
- no stroke;
- correct blur/surface;
- hug/min height and padding correct;
- text does not collide;
- labeled and body-only variants both render without an empty lead column;
- the 12px dot exists in every default/accent and light/dark variant;
- dot, optional metric, and body use a 12px item gap;
- default/body-only height is 70px and labeled/accent height is 88px, both hug content.

Team:

- exactly three content items above one 1700×340 radial-mask image;
- no Callout, Source footer, caption/title/body row, or second text block below the image;
- image provenance is recorded in speaker notes;
- page title remains one line within EN 30 / ZH 12 characters.

Dense six-card:

- page title remains one line within EN 30 / ZH 12 characters;
- every card description stays inside its card without artificial fixed-height whitespace;
- the two rows remain aligned and readable with the registered compact spacing.

Source:

- optional;
- present for material claims;
- one line and readable;
- light uses `#919596`; dark uses white at 55% opacity;
- not overlapping callout.

## Asset integrity gate

Run:

```bash
node "$SKILL_DIR/scripts/validate-assets.mjs"
```

This regenerates SHA-256/size metadata. Review unexpected changes. Missing/zero-byte files block delivery.

Verify:

- 8 registered Lossless WebP background variants and no committed compiled PPTX duplicates;
- 3 Lossless WebP texture/source images;
- 4 Lossless WebP Presentation README/Hero/Showcase previews plus 3 bilingual Motion montage sets (catalog, themes, metrics/CTA); preview manifest lists every file with current dimensions and source;
- 2 additional Motion atmospheric backgrounds, original Joint/control vectors, and 10 normalized Motion glyphs;
- Foundation preview keeps every base-color and gradient swatch plus its label inside the white Color tokens panel; the preview renderer's overlap/overflow guard passes;
- 4 logos;
- 10 icons × 2 themes;
- `node scripts/normalize-icons.mjs --check` passes for all 20 component-only SVGs and finds no Figma canvas/background nodes;
- bundled font files and licenses;
- token/component/source manifests;
- runtime CSS/JS/template.

`validate-assets.mjs` rejects PNG files in the canonical background, texture, and preview directories, rejects lossy WebP bitstreams, and rejects a populated `assets/backgrounds/compiled/` directory.

## Skill package gate

Before publishing:

- frontmatter name/description valid;
- `node scripts/validate-system.mjs` passes, proving critical token/registry/CSS/HTML/PPTX contracts and local documentation links are synchronized;
- all referenced files exist;
- no TODO markers in `SKILL.md` or references;
- no runtime dependency on Figma URL/API;
- example EN and ZH JSON validates;
- JS syntax checks pass;
- `node scripts/validate-presenter.mjs --html <final-html> --require-notes` passes for formal presentation decks;
- HTML preflight passes for EN and ZH;
- PDF/PPTX samples render correctly when requested or when their adapters changed;
- asset manifest current;
- scratch/output directories excluded or removed.

## Release checklist

- [ ] Narrative and claims reviewed.
- [ ] Language/font roles correct.
- [ ] All slide backgrounds styled.
- [ ] Inner titles left; cover centered.
- [ ] Small titles one line.
- [ ] No overlap/overflow.
- [ ] Optional labels behave correctly.
- [ ] Callout variants and placement correct.
- [ ] Header/source optionality correct.
- [ ] Logo and images replace correctly.
- [ ] Icons come from the packaged registry.
- [ ] HTML preflight 0 errors.
- [ ] PDF pages rendered and inspected when requested or the adapter changed.
- [ ] PPTX rendered, inspected, and overflow-tested when requested or the adapter changed.
- [ ] Asset hashes current.
- [ ] Skill validator passes.
