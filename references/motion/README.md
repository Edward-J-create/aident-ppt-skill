# Motion Slides / 视频用 HTML 版式

Use this mode for simple, visual, editable HTML scenes intended for later video editing. English is the default; Chinese has the same layout coverage with its own type roles. The primary deliverable is an editable scene library, not a finished animation style or MP4.

用于后续视频制作的简洁 HTML 版式。默认英文，中文提供相同的模板与独立字体层级。所有文案、Logo、图片、标签、结果与数字均来自内容 JSON；内置轻量播放器可关闭，由外部动画工具接管。

## Generate

```bash
node "$SKILL_DIR/scripts/generate-deck.mjs" \
  --input "$SKILL_DIR/examples/motion/deck.en.json" \
  --out /absolute/path/motion-en

# Chinese: use examples/motion/deck.zh.json.
# Add --single-file to ALSO generate deck.single.html.
```

Set `meta.mode: "motion"`, or use `--mode motion` if the JSON omits the mode. Never combine `motion-*` slides and ordinary presentation layouts in one input. If the user requests both, generate two decks using the appropriate mode.

## Read by task

| Task | Canonical reference |
|---|---|
| Pick a layout and density | [layouts.md](layouts.md) |
| Populate content and swap images/brands | [content.md](content.md), [deck.schema.json](deck.schema.json) |
| Exact typography, spacing, color, opacity | [motion.json](../../assets/tokens/motion.json) |
| Component variants and slots | `assets/components/motion-registry.json` |
| GSAP / Hyperframes / Remotion handoff | [animation-handoff.md](animation-handoff.md) |
| Browser, crop, scroll, font checks | [quality.md](quality.md) |

## Mode-specific rules

1. Canvas is 1920×1080. The foreground safe width is 1700px, x=110. Responsive preview scales the entire canvas uniformly and centers it.
2. Centered inner headings are intentional in Motion Slides. The business-presentation rule “only cover titles are centered” does not apply to this mode.
3. Titles use Outfit 100/110%, tracking −2% in English; Smiley Sans 100/120% in Chinese. Statement pages use 116px. Body uses packaged Noto Sans / Noto Sans SC. Never require SF Pro or MiSans installation.
4. No default website header, source footer, pagination, or full-width Callout inside the captured canvas. Keep evidence and narration in notes. The small list badge is its own component, not the presentation Callout.
5. `motion-list` intentionally contains off-canvas rows inside a clipped scrolling window. Items appear in top-to-bottom order; the entire list scrolls upward. Do not delete those rows, squeeze them into the canvas, or flag their clipped track as slide overflow.
6. Keep foreground text live. Never flatten text, logos, tags, cards, or connectors into a full-slide PNG. Backgrounds alone can be rasterized; use packaged Lossless WebP.
7. Separate animation targets from layout constraints. Keep list window, list track, and individual items independent. Keep connectors behind and separate from the connected nodes. Joint curves/stems retain their original dimensions: move content-hugging cards to the endpoints, never stretch lines to fill a gap.
8. Preserve logo ratio. All example marks can be replaced. Image placeholders are not proof of customers, partnerships, product features, or measured outcomes.
9. Do not add complex motion presets merely to fill the library. Deliver clear static composition and precise editable targets. Animation tools can own choreography and video export later.
10. Run `scripts/preflight.mjs`; it automatically selects the Motion Slides QA rules.

## Deliverables

- `index.html`: editable, offline presentation and lightweight scrubber.
- `deck.resolved.json`: all populated content and relative asset paths.
- `timeline.json`: suggested shot order, durations, notes, optional preview timing.
- `animation-handoff.json`: layer selectors, canvas, asset inventory, font manifest, scroll contract.
- `assets/runtime/deck.css` and `deck.js`: readable layout CSS and optional standalone player.
- Referenced images/icons/backgrounds only, plus required fonts and licenses.
- Optional `deck.single.html`; the folder remains the preferred editing handoff.

Do not describe HTML as a native Remotion composition, a Hyperframes project, a GSAP timeline, or an editable NLE project. Those are downstream integrations. [animation-handoff.md](animation-handoff.md) defines how to adapt the editable output.
