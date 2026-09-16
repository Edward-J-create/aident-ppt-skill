# Motion Slides / 视频用 HTML 版式

Use this mode for simple, visual, editable HTML scenes intended for later video editing. English is the default; Chinese has the same layout coverage with its own type roles. The primary deliverable is an editable scene library, not a finished animation style or MP4.

用于后续视频制作的简洁 HTML 镜头素材。默认英文，中文提供相同模板与独立字体层级。所有文案、Logo、图片、标签、结果与数字均可替换。默认内容完整可见，不附带入场动画；时间预览仅切换镜头，后续动画由外部工具制作。

## Generate

```bash
node "$SKILL_DIR/scripts/generate-deck.mjs" \
  --input "$SKILL_DIR/examples/motion/starter.en.json" \
  --out /absolute/path/motion-en

# Chinese: use examples/motion/starter.zh.json.
# Full 20-page component catalog: examples/motion/deck.en.json or deck.zh.json.
# Add --single-file to ALSO generate deck.single.html.
```

Set `meta.mode: "motion"`, or use `--mode motion` if the JSON omits the mode. Never combine `motion-*` slides and ordinary presentation layouts in one input. If the user requests both, generate two decks using the appropriate mode.

For a new explainer/demo use the bilingual starter, which includes Logo, Input, Joint relationship, synthesis and list shots. It is a starting vocabulary, not a compulsory sequence or a license to invent relationships. Replace all copy and identity slots, delete irrelevant shots, and choose the actual reading path before generating. Do not use the business Presentation minimal example as the Motion default.

## Read by task

| Task | Canonical reference |
|---|---|
| Plan shots by meaning, not PPT outline | [scene-planning.md](scene-planning.md) |
| Pick a layout and density | [layouts.md](layouts.md) |
| Arrange tags, widths, peer alignment and emphasis | [synthesis-composition.md](synthesis-composition.md) |
| Populate content and swap images/brands | [content.md](content.md), [deck.schema.json](deck.schema.json) |
| Timing, tag colors, linear/hub edges, Send states, Logo pairs | [editable-components.md](editable-components.md) |
| Light/Dark themes, brand-title, parallel workflows, result panels | [themes-and-combinations.md](themes-and-combinations.md) |
| Exact typography, spacing, color, opacity | [motion.json](../../assets/tokens/motion.json) |
| Component variants and slots | `assets/components/motion-registry.json` |
| GSAP / Hyperframes / Remotion handoff | [animation-handoff.md](animation-handoff.md) |
| Browser, crop, scroll, font checks | [quality.md](quality.md) |

## Mode-specific rules

Every registered Motion layout and variant supports the shared theme/palette/background system—not just opening shots. Set `meta.theme` / `meta.palette` for deck defaults and override either independently on a slide. `background` is slide-only. Support does not mean random mixing: read the [default style routing](scene-planning.md#choose-the-default-style-deliberately) and [coverage and precedence](themes-and-combinations.md#layout-coverage-and-precedence--全版式覆盖与优先级). Changing colors preserves layout and still requires suitable logo assets.

1. Canvas is 1920×1080. The foreground safe width is 1700px, x=110. Responsive preview scales the entire canvas uniformly and centers it.
2. Centered inner headings are intentional in Motion Slides. The business-presentation rule “only cover titles are centered” does not apply to this mode.
3. Titles use Outfit 100/110%, tracking −2% in English; Smiley Sans 100/120% in Chinese. Statement pages use 116px. Body uses packaged Noto Sans / Noto Sans SC. Never require SF Pro or MiSans installation.
4. No default website header, source footer, pagination, or full-width Callout inside the captured canvas. Keep evidence and narration in notes. The small list badge is its own component, not the presentation Callout.
5. `motion-list` retains every off-canvas row. Only the 1920×1080 camera clips; no internal fixed-height window, edge mask or scroll range. Suggested choreography: items appear top-to-bottom; the complete scene (identity + list) moves upward and may exit the camera entirely. External tools choose distance and timing.
6. Keep foreground text live. Never flatten text, logos, tags, cards, or connectors into a full-slide PNG. Backgrounds alone can be rasterized; use packaged Lossless WebP.
7. Separate animation targets from layout constraints. Keep list scene, identity, list track, and individual items independently addressable. Keep connectors behind and separate from connected nodes. Joint curves/stems retain original dimensions: move content-hugging cards to endpoints, never stretch lines to fill a gap.
8. Ask whether to keep Aident, replace the Logo, or use no Logo during intake. Unspecified means packaged Aident, not an empty slot; explicit no-Logo hides it. Single/pair brand shots use the complete `assets/motion/lockup.svg`; compact list/diagram identities use `assets/motion/mark.svg`. Never split one identity into symbol × lettering or reconstruct lettering with a font. Never interrupt a Skill-maintenance request to ask for the maintainer's Logo. Preserve intrinsic ratio. Example marks do not imply partnerships or customers.
9. Do not add complex motion presets merely to fill the library. Deliver clear static composition and precise editable targets. Animation tools can own choreography and video export later.
10. Run `scripts/preflight.mjs`; it automatically selects the Motion Slides QA rules. Geometry pass is not aesthetic approval: inspect screenshots and resolve visual-review advisories. For synthesis, choose a coherent Fill/center, Fill/left or Hug system; no automatic column-based size ramp.

## Deliverables

- `index.html`: editable, offline presentation and lightweight scrubber.
- `deck.resolved.json`: all populated content and relative asset paths.
- `timeline.json`: advisory shot order, durations and notes; no automatic content animation or calculated scroll range.
- `animation-handoff.json`: layer selectors, canvas, asset inventory, font manifest, scroll contract.
- `assets/runtime/deck.css` and `deck.js`: readable layout CSS and optional standalone player.
- Referenced images/icons/backgrounds only, plus required fonts and licenses.
- Optional `deck.single.html`; the folder remains the preferred editing handoff.

Do not describe HTML as a native Remotion composition, a Hyperframes project, a GSAP timeline, or an editable NLE project. Those are downstream integrations. [animation-handoff.md](animation-handoff.md) defines how to adapt the editable output.
