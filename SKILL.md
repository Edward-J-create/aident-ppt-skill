---
name: aident-ppt-skill
description: Create polished bilingual 16:9 presentation decks or simpler Motion Slides in the packaged Aident PPT visual language from a user-supplied outline. Use for HTML/web presentations, editable HTML scenes for later video animation, single-file HTML, optional PPTX/PDF, presenter view, reusable slide content, or a multi-agent deck workflow. Motion Slides preserve editable layers for GSAP, Hyperframes, or Remotion adaptation. All copy, logos, and images are replaceable. Self-contained at runtime.
---

# Aident PPT Skill

Turn an outline into a coherent, source-faithful deck. Treat the packaged assets, tokens, components, and layout rules as the runtime source of truth. Figma and the source PDFs are provenance and QA references only; do not require them to generate a deck.

## Select the output mode first

- **Presentation** (default): business presentation layouts, inner titles left aligned, optional presenter/PDF/PPTX outputs. Follow the workflow below.
- **Motion Slides**: simple visual HTML scenes for later video/animation editing. Set `meta.mode: "motion"` or `--mode motion`, then read `references/motion/README.md`. English is the default; Chinese has the same template coverage. All text, logos, images and component content are replaceable. This mode has its own centered headings, typography roles, camera-only list clipping, tokens, registry, schema and browser preflight.

For Motion Slides, first read `references/motion/scene-planning.md`, then `references/motion/layouts.md` and `references/motion/content.md`. Choose shots by their meaning: prompt → Input, identity → Logo, relationships → Joint, transformation → synthesis; cards are not a universal fallback. Ask whether to replace the Logo as part of intake; if unspecified use the packaged Aident Logo, and hide only when explicitly requested. Generate through `scripts/generate-deck.mjs` and run `scripts/preflight.mjs`. Deliver editable HTML plus `deck.resolved.json`, `timeline.json`, and `animation-handoff.json`. All scene content is visible by default; there are no built-in entrance presets. Timing is advisory. For lists, suggest top-to-bottom item appearance and whole-scene upward motion, retaining every off-canvas row. Only the slide camera clips: no internal list window, edge mask or preset scroll distance. GSAP, Hyperframes or Remotion owns animation later; use `references/motion/animation-handoff.md` for that handoff.

For a new Motion explainer/demo, start from `examples/motion/starter.en.json` or `starter.zh.json`: editable Logo, Input, Joint, synthesis and list shots. Adapt/delete shots to match actual content; do not start from the business `deck.minimal.json` or treat the 20-page component catalog as a storyboard. Before generation, document each shot's purpose and required visual relation in notes; if prompt/identity/relationship material was turned into generic cards, reconsider the choice. For tag layouts read `references/motion/synthesis-composition.md`: peer Fill cells use one size, equal widths/heights and a single center/left alignment; Hug is a separate intentional composition. No column-index size ramp. Inspect screenshots and visual-review warnings even when preflight reports 0 errors.

The presentation-specific rules/workflow below do not override Motion Slides' explicit differences. Keep one mode per deck; use separate outputs when both are requested. Shared asset licensing, logo ratio, data-driven content and lossless packaging requirements apply to both. Motion brand shots default to the complete `assets/motion/lockup.svg`; compact list/diagram identities use `assets/motion/mark.svg`. Never split a brand into symbol × lettering or use extracted lettering as a complete identity. Source styling does not freeze example counts: preserve the registered variable tag/group and workflow-node combinations.

For Motion timing, semantic tag palettes, Input/Send states, independent Logo-pair replacement and diagram connections, read `references/motion/editable-components.md`. For downstream Input animation, also follow its Cursor-to-Send targeting and Typing caret lifecycle sections: the static mouse pose is not a click endpoint; typing must update live text and explicitly control caret visibility. A left-to-right process uses `motion-workflow` (2–4 nodes); a central relationship uses `motion-hub` (1–4 satellites). Never force a linear process into a center-based diagram. Durations are short, overridable editorial suggestions; the external animator owns final timing and state transitions.

For Light/Dark Motion, brand-above-title openings, parallel workflow rows, result tables/lists and safe animation layers, read `references/motion/themes-and-combinations.md`. Set `meta.theme` and optional per-slide `theme`; default remains Light. Reuse components with theme tokens, not scene-specific color patches. Declared image `variants` maps must contain the selected theme. Never invert logos or add unrequested white plaques; the packaged full lockup is light-surface artwork. Parallel workflows support1–3 aligned rows of2–4 nodes; result panels support2–4 columns or short lists. Use optional fields only when they communicate meaning. Node shells own layout; animate named `-visual` children for reveals. Input caret, mouse pointer and Send are distinct. Run `scripts/validate-motion-themes.mjs --browser` and inspect both-language screenshots.

Dark does not mean gray only. `meta.palette` / `slide.palette` select `neutral`, `teal`, `cobalt` or `lime`; non-neutral palettes default to a solid brand-color backdrop. Theme controls contrast independently: deep brand colors use Dark/light text, bright lime uses Light/dark text. Every registered layout supports every palette, but defaults are intentionally biased: bright lime mainly for a large centered metric/keyword, Lists mainly for a solid brand color, openings mainly Light or solid brand color, closings Light/neutral only, and ordinary information scenes mainly calm neutral or solid brand colors. Do not rotate palettes for variety. Explicit lower-priority combinations remain valid when the content justifies them. The only distinct optional brand gradient is the deep-blue `#101B27 → #14236F`; other `brand-gradient` inputs retain compatibility but resolve to their solid palette. See `references/motion/scene-planning.md` and the brand-color section of `references/motion/themes-and-combinations.md`.

Theme and palette are shared capabilities of **every registered Motion layout and variant**, including brand-title, workflow rows and synthesis result panels—not cover-only options. Resolve each field independently: slide override → deck meta default → Light/neutral. Choose the layout for its information structure, then select the background; changing color must not change node counts, alignment, spacing or optional content. `background` is a per-slide field, not a supported `meta` field. All families share its choices; brand backgrounds require a non-neutral palette and theme-suitable logos/images.

Neutral Dark Motion defaults to solid ink `#101B27` (`background:"solid"`), distinct from brand teal and deep blue. Do not cover an exact ink background with the legacy gray/aurora images. Explicit artwork backgrounds remain optional.

For Dark Motion tags, use translucent white peers and brand-cyan emphasis, including nested and standalone outputs. Do not inherit Light semantic-color chips or rainbow output gradients. Legacy tone names remain compatible but resolve to the quiet Dark treatment; see `references/motion/themes-and-combinations.md`. README previews must demonstrate these rules, not the exhaustive palette test matrix.

For two independent measures use `motion-metric` / `cards`, with a large value in each equal-weight Card; never merge them into a single slash-delimited value. For an approved Logo + CTA ending use `motion-brand` / `cta`, with1–2 logos, optional small label and a separate button, not `brand-title` with large headline/body. Single hero-number/hero-word variants are also registered. Read `references/motion/metrics-and-cta.md` for fields, geometry, bilingual tokens, editable targets and examples. Preserve approved shot relations when regenerating; if a requested geometry is unsupported, disclose the gap instead of substituting it silently. Never rely on a post-generation scene-specific patch as the reusable template.

Motion closing/end cards use `theme:"light", palette:"neutral"` explicitly, overriding deck-level color defaults. Do not use Dark or bright-lime endings, whether Logo-only, Logo + CTA, or a closing statement. Remove those ending samples from the authoring gallery. Shared color support remains available for non-closing scenes; it does not authorize routing every palette to an ending.

## Presentation mode: non-negotiable outcomes

- Build at exactly 1920×1080, 16:9.
- Scale and center the fixed canvas responsively in ordinary, audience, and embed views. The full slide must remain visible at 1280×720, 1366×768, 1440×900, and 1024×768; never crop the right or bottom edge.
- Center the title only on `cover`. Left-align every inner-page title.
- Give every slide a packaged light or dark background treatment. `elements-cover` is cover-only; `elements-inner` and `atmosphere` are inner-page treatments. Never output plain unstyled white or black.
- Use Outfit + Noto Sans + Instrument Serif for English and Smiley Sans + Noto Sans SC + Noto Serif SC for Chinese according to `references/typography.md`.
- Use percentage line-height tokens. `150%` means 1.5× the font size; it never means `150px`.
- Keep point, step, card, and metric titles on one line. Shorten the text, change the count/layout, or let the runtime fitter reduce it only within the documented minimum.
- Keep dense six-card and Team page titles on one line: no more than 30 English characters or 12 Chinese characters. A split-image-text page with a callout uses 30 English or 14 Chinese characters.
- Keep Workflow arrows in their own row above the entire Step row, with one visible arrow above every Step including the final Step. The arrow row ends 32px before the Step row begins; Step numbers use `#008089` on Light and `#1EEAEA` on Dark.
- Never allow text, cards, callouts, images, headers, or source footers to overlap or leave the slide.
- Never create a standalone callout slide. A callout is an optional supporting component attached below any compatible content layout.
- Render `callout.tone: "accent"` from the packaged `gradients.calloutAccent` token exactly: `#A0A9FE → #2EEEEE (47.9%) → #93FCB8` at **16% fill/Paint opacity**, with 20px background blur and no stroke. In HTML/PPTX, express the 16% on the gradient-stop alpha only; never set the whole Callout element to 16% opacity, because that also fades its dot and text, and never promote the fill to 100% opacity.
- Allow both labeled callouts (`metric`/`label` + `body`) and body-only callouts. Do not invent a label when the Figma component or content does not need one.
- Make header/logo/right text and source footer optional. Make logo, URL/right text, and all content images replaceable. Accept a user-supplied local PNG, JPG/JPEG, WebP, or SVG logo through `meta.logo`; a single path can serve both themes, or `{light,dark}` can provide theme-specific marks.
- Preserve every replacement logo's intrinsic aspect ratio. Limit inner-header logos by 40px height and cover-identity logos by 56px height; never stretch a logo into a fixed-width box.
- Keep all visible copy data-driven and editable: slide headings; point/card/metric/step/comparison fields; values; bullets; callouts; sources; and speaker notes. Never bake copy into background images.
- Use only packaged design-system icons. Do not draw replacement icons and do not use emoji as icons.
- Render icons from clean component-only 60×60 SVGs with a true 32px design-system glyph. The Light surface is white with a 10px radius; the Dark surface is white at 8% opacity with a 12px radius. Clip the icon box to its radius. Dense 48px cards scale the radii to 8px Light / 9.6px Dark. Reject SVGs containing exported Figma canvas backgrounds.
- Keep canonical packaged raster assets as Lossless WebP. README previews, Showcase/Hero images, Atmosphere backgrounds, Elements backgrounds, and texture overlays must never use lossy WebP quality settings. SVG remains canonical for logos and icons.
- Use generic placeholders unless the user provides approved commercial copy, claims, customer names, metrics, or screenshots.
- Run the complete QA gate before delivery.
- Run `scripts/validate-system.mjs` when maintaining or publishing the Skill; it blocks token/registry/CSS/exporter drift in fragile contracts such as Callout opacity and Workflow arrows.

## Read only what the task needs

- Visual system, themes, gradients, backgrounds: `references/design-system.md`
- Type roles, exact sizes, line heights, and font licensing: `references/typography.md`
- Component anatomy, variants, and layout routing: `references/components-and-layouts.md`
- Per-layout counts, content budgets, background compatibility, and image slots: `references/layout-catalog.md`
- Input JSON fields and examples: `references/content-schema.md`
- Logo/image replacement and crop rules: `references/assets-and-branding.md`
- Image direction, generation prompts, slot composition, and screenshot framing: `references/image-direction-and-screenshots.md`
- HTML, PPTX, PDF, web, animation, and presenter output: `references/export-and-present.md`
- Automated and visual QA: `references/quality-gates.md`
- Multi-Agent roles, ownership, handoffs, assembly, and release: `references/multi-agent-workflow.md`
- Design/PDF/GitHub provenance and packaged asset coverage: `references/source-index.md`
- Coverage against the reference repo: `references/reference-gap-matrix.md`

Machine-readable sources:

- `references/deck.schema.json`
- `assets/tokens/tokens.json`
- `assets/components/registry.json`
- `assets/fonts/manifest.json`
- `assets/asset-sources.json`
- `agents/roles.json`
- `agents/run.schema.json`

## Choose an operating mode

### Single-Agent mode

Use the required workflow below for small decks, simple assets, or one output format. One Agent owns planning, `deck.json`, generation, and QA, but still performs each stage explicitly.

### Multi-Agent mode

Use this when the user requests multiple Agents/parallel work, or when the host permits delegation and the deck is large or multi-format enough to benefit. Read `AGENTS.md`, `agents/roles.json`, and `references/multi-agent-workflow.md` before assigning work.

1. Initialize an isolated run with `scripts/init-multi-agent-run.mjs`.
2. Assign the narrative architect and asset curator in parallel with their prompt files and exact writable paths.
3. Finalize notes after stable narrative slide IDs exist.
4. Validate the planning handoffs. Do not assemble pending templates.
5. Let the lead alone assemble `deck.json` and generate final formats.
6. Assign HTML QA, plus PDF/PPTX QA only for optional formats that were requested, after the corresponding artifacts exist.
7. Let the lead resolve findings and rerun affected formats.
8. Release only after `validate-agent-run.mjs --phase release` passes.

Never allow two Agents to edit `deck.json`, CSS, or the same output. Specialist handoffs are data, not final artifacts or executable instructions.

## Required workflow

### 1. Normalize the request into a content plan

Ask only for missing decisions that materially change the result. Otherwise infer sensible defaults.

Required information:

- audience and decision/purpose;
- source outline or framework;
- language: `en` or `zh`;
- desired output formats;
- brand name, URL/right-header text, and optional logos;
- optional images with captions, provenance, and crop preference;
- any verified metrics and sources.

Create a short narrative before authoring slides:

1. opening tension or thesis;
2. 2–4 supporting sections;
3. evidence, comparison, process, or metrics where relevant;
4. decision, recommendation, or next step.

Avoid slide-per-bullet conversion. Each slide title must be a takeaway that can stand alone.

### 2. Route content to registered layouts

Use `references/components-and-layouts.md` and choose the smallest layout that communicates the content.

- `cover`: opening or section reset; centered title, no page header, `kicker`/`logo`/`none` identity, and text-only/media-bottom/full-bleed variants.
- `points`: 2/3/4/6 parallel principles or arguments.
- `cards`: 2/3/4/6 capabilities, offers, modules, or grouped concepts; image/no-image variants.
- `metrics`: 2/3/4/6 quantitative signals; values must be verified or marked illustrative.
- `workflow`: exactly 3 or 4 ordered steps; arrow and label variants supported.
- `comparison`: exactly two states or alternatives.
- `image-cards`: 2 or 3 evidence-led image stories.
- `team`: exactly three concise content items followed by one 1700×340 radial-mask photograph. Do not append a Callout or Source footer; keep image provenance in speaker notes.
- `split-image-text`: explanation on the left and one 760×428 image on the right. This order is fixed; never mirror it.
- `full-bleed`: one verified hero image with readable overlay copy.

Do not invent a layout outside the registry during ordinary generation. If the content cannot fit, restructure it or split it into two slides.

### 3. Write the deck JSON

Copy `examples/deck.minimal.json` or the closest full example into the working output directory. Preserve stable kebab-case slide IDs. Use realistic copy lengths and the field rules in `references/content-schema.md`.

For optional component properties:

- omit `callout` to remove it;
- omit `source` to remove the footer;
- use `showLabel: false` or omit `label` for label-free items;
- use `showIcon: false` or omit `icon` for icon-free items;
- use `showArrows: false` or `showStepLabels: false` on workflow;
- use `meta.header` or per-slide `header` to hide/replace logo and right text;
- use `callout.tone: "accent"` for the soft gradient emphasis version; it has no stroke.
- do not reconstruct the Accent Callout gradient by eye. Consume `gradients.calloutAccent` / `components.callout.accentPaintOpacity`; the required Paint opacity is `0.16`, not `1`.
- use `coverIdentity: "kicker" | "logo" | "none"` on covers; cover identity is separate from the inner-page header.
- use `background: "elements-cover"` on a cover, `"elements-inner"` for a right-weighted inner background, or `"atmosphere"` for an atmospheric Light/Dark inner page.

### 4. Resolve fonts and assets

Run the font checker before generating:

```bash
node "$SKILL_DIR/scripts/check-fonts.mjs"
```

All default fonts are bundled under open licenses, including Noto Sans and Noto Sans SC as distributable replacements for the SF Pro and MiSans references. Generated HTML therefore does not depend on local system fonts. See `references/typography.md`.

Folder generation copies only the font faces/licenses required by the deck language and used components. It also copies only backgrounds, textures, icons, logos, and user images referenced by that deck. Do not restore whole-directory `assets/` copying.

Use relative local image paths in the JSON. The generator copies them into `assets/user/` and rewrites references. Remote HTTPS and data URLs are accepted for HTML, but local verified files are preferred for durable PPTX/PDF output.

When imagery or screenshots are part of the request, read `references/image-direction-and-screenshots.md`. Generate new imagery only when the user requests it; never invent product UI, customer evidence, claims, or embedded slide text inside an image.

### 5. Generate HTML/web output

```bash
node "$SKILL_DIR/scripts/generate-deck.mjs" \
  --input /absolute/path/deck.json \
  --out /absolute/path/output/deck
```

For a portable one-file webpage:

```bash
node "$SKILL_DIR/scripts/generate-deck.mjs" \
  --input /absolute/path/deck.json \
  --out /absolute/path/output/deck \
  --single-file
```

Folder output creates `index.html`; single-file output creates `deck.single.html`. Both include keyboard navigation, overview, animation, and presenter mode.

### 6. Run HTML preflight

Resolve bundled workspace dependencies and set `RUNTIME_NODE_MODULES` when Playwright is not installed in the project.

```bash
RUNTIME_NODE_MODULES="$RUNTIME_NODE_MODULES" node "$SKILL_DIR/scripts/preflight.mjs" \
  --html /absolute/path/output/deck/index.html \
  --screenshots /absolute/path/output/qa/html
```

Preflight must report 0 errors. It checks every slide at the native 1920×1080 canvas and verifies responsive centering/containment at the registered smaller browser viewports. Never waive overlap, slide overflow, viewport clipping, broken images, missing bundled fonts, standalone callouts, emoji icons, malformed icon boxes, or invalid line-height. `--allow-font-fallback` is only for an explicit user-approved fallback delivery.

### 7. Deliver HTML first; export optional formats only when requested

Folder HTML is the default and primary deliverable. Generate it first, run HTML preflight, and stop there unless the user asks for another format. Single-file HTML is optional for portable/offline delivery. Read `references/export-and-present.md` before authoring PPTX or PDF.

- Default: folder HTML from `scripts/generate-deck.mjs`.
- Optional portable web file: `--single-file`.
- Optional PDF, only on explicit request: `scripts/export-pdf.mjs`.
- Optional editable PPTX, only on explicit request: `scripts/export-pptx.mjs`.
- Web hosting: serve the generated folder with any static server.

The PPTX exporter uses editable native text and shapes, packaged images/icons, speaker notes, and canonical lossless WebP backgrounds. It converts referenced WebP files to cached PNG buffers in memory during export; duplicate compiled PNG backgrounds are not stored in the Skill. The HTML version remains the most faithful animation/presentation target.

Treat validated HTML as the visual source of truth. Do not weaken or distort the HTML layout to compensate for PowerPoint font substitution. PPTX is an optional editable convenience format: apply the packaged fitter and layout checks, but if the target PowerPoint installation cannot recognize a bundled font or uses different font metrics, disclose that limitation and allow final manual adjustment in PowerPoint.

### 8. Verify every final artifact

Follow `references/quality-gates.md`.

- Re-run HTML preflight after every meaningful copy/layout change.
- Run `scripts/validate-presenter.mjs` on the final HTML; add `--require-notes` for a formal presentation where every slide must have speaking guidance.
- If PDF was requested, render every PDF page to PNG and inspect it.
- If PPTX was requested, render every PPTX slide and run the slide overflow checker.
- Run `scripts/validate-pptx-layout.mjs --layouts <preview-dir>` after PPTX export; wrapped one-line component text or out-of-bounds shapes block delivery.
- Inspect montages for rhythm, then inspect dense or image-heavy slides at full size.
- Verify replacement logos/images, source text, themes, one-line titles, and speaker notes.

Do not deliver if any P0 or P1 issue remains.

## Runtime architecture

The skill intentionally separates content, visual truth, and output adapters:

```text
deck.json
  -> generate-deck.mjs
      -> folder HTML or single-file HTML
      -> resolved JSON + copied user assets
  -> export-pdf.mjs
      -> PDF
  -> export-pptx.mjs
      -> editable PPTX
```

Figma is not in this runtime path. Updating the design system is a separate maintenance workflow: inspect the source file, update packaged tokens/assets/components, encode canonical raster assets as Lossless WebP, verify decoded pixels against the source export, regenerate hashes, and rerun all QA.

## Maintenance workflow

When changing the skill itself:

1. Update the canonical JSON token or component registry first.
2. Update CSS, HTML renderer, and PPTX adapter together.
3. For icon updates, run `scripts/normalize-icons.mjs`, which preserves the packaged design-system glyph paths while removing Figma canvas export nodes; then run it again with `--check`.
4. If a background, texture, or README preview changes, encode it as Lossless WebP and verify identical dimensions and decoded RGBA pixels. Never commit a duplicate `assets/backgrounds/compiled/` directory.
5. Update asset provenance manifests.
6. Run `scripts/validate-assets.mjs` to enforce Lossless WebP policy, reject compiled duplicates, and regenerate hashes.
7. Generate both English and Chinese examples.
8. Run HTML QA; run PDF/PPTX QA only when those adapters changed or those formats are part of the release.
9. Run `scripts/validate-system.mjs`, then the Skill validator before publishing.
10. Run the multi-Agent smoke example through initialized, planning, assembled, and release validation.
11. Keep `README.md`, `README.en.md`, role prompts, and machine-readable contracts synchronized with behavior.

Never patch a single rendered sample as the only fix. Encode the rule in the reusable component or generator.
