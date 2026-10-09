# Partner-launch scene composition

Use these registered combinations when a launch needs coverage, ordered invocation, a readable result and a paired-brand ending. They are optional vocabulary, not a compulsory storyboard. Bilingual source examples: `examples/motion/partner-launch.en.json` / `.zh.json`. All example app slots are generic placeholders, not verified provider coverage.

## Hero value with platform images

A title-free `motion-metric` / `hero-number` accepts `platforms`: 2–18 entries containing a local `image` and optional short `label`. `platformColumns` accepts 2–9; default `ceil(count / 2)` produces two rows. At most two rows are supported. The metric remains the focal value; do not add a redundant headline. For 14 platforms use 7 columns; for 15–18 use 8–9. Do not invent platforms to meet a count. Verify the metric and platform roster independently; provider-wide coverage does not prove a specific integration exposes every destination.

The value, explanation, grid, each platform group and every image/label are separately indexed in the handoff. Source/provenance belongs in notes. Longer rosters need a separate scene or list, not smaller logos.

## Real app artwork and visible size

Use the approved original artwork and variant: a monochrome glyph is not interchangeable with a colored app icon when the user requests the latter. Preserve gradients, paths, aspect ratio and brand colors. Do not apply theme inversion.

The runtime scales small intrinsic assets **up as well as down** to the icon role: list tools 44px, satellite 46px, card 60px, platform grid 64px, within their documented width bounds. Equal HTML boxes do not ensure equal visible artwork: inspect internal whitespace on replacement images.

For padded artwork, prepare a separate asset once:

```bash
RUNTIME_NODE_MODULES=/path/to/node_modules node scripts/normalize-motion-image.mjs \
  --input /path/original.svg --out /path/normalized.svg
# Raster input -> separate lossless .png; Sharp is needed only for this preparation step.
```

The helper measures alpha, removes transparent outer margins and adds 2% padding. SVG changes only root viewport attributes; original paths, gradients and colors survive. Raster retains original pixels. It cannot recognize whitespace painted as an opaque background, verify authenticity or make optically different silhouettes equivalent. Keep the original; inspect the result before using it. Do not mechanically trim deliberate lockup spacing.

Every Motion logo/icon image also accepts `opticalScale` (0.5–1.5, default 1). This uniformly adjusts that image's role bounds without stretching, recoloring or affecting its partner's scale. Use it deliberately for a pair whose visible sizes differ, e.g. `logos[1].opticalScale: 0.78`. It is content data retained on regeneration; do not add a brand-name or slide-index CSS override. Enlarged images must still pass containment and screenshot review.

## Branching invocation with three tiers

Use `motion-tree` / `branching` for **one root → one/two intermediate nodes → two–four leaves per intermediate node**. This composition supports 2–8 leaves total, including 1→1→2/3/4 and 1→2→4/6/8. Each node has one optional local `image`, short `title` and optional `label`. The source contains `root` and `branches`; each branch contains `children`. Every node requires its own explicit unique `id`. Parentage comes from these nested arrays; cycles, ambiguous edges and extra tiers are not supported.

The existing `motion-hub` is a single center with 1–4 satellites. It cannot express this multi-tier relationship on its own. `motion-tree` reuses the Joint node surfaces, typography and theme paints, with independent live cubic connector paths routed between padded node boundaries. These are new registered tree connectors; the original exported Joint curves/stems remain untouched. Middle nodes center over their children; leaves retain one image each. This is not a vertical stack of wide sequential Cards.

Tree layout uses the 1700×640px content zone at y270 and tier centers y80/285/505, with a preferred 80px gap between leaf nodes. For wider leaves, the gap can reduce to 24px to fit the content zone; fonts retain their size. Nodes hug content; longer leaf copy wraps within its padded node without reducing font size. Leaf titles use 28px and shorter budgets (12 EN / 6 ZH); root/intermediate titles use 32px. Geometry QA checks padded text, parent/child endpoints, tier order and non-overlapping leaves. Longer copy needs another scene; no font shrinking or connector stretching is permitted.

The standard Joint node's title and optional label also stack inside a copy column rather than escaping its padded card. Animate node `-visual` children and connector path targets separately; move the whole diagram together. Call `layout()` after font/image/copy changes, before animation. It does not route lines every animation frame.

## Prominent result and compact CTA

`motion-synthesis.result.density: "prominent"` selects a 920px output panel, 32px values, 24px headers and 38px result title in an upper 320–940px content zone. `standard` preserves the existing 840px / 24px value treatment. Choose concise input tags and enough result-column width; both modes retain the original arrow dimensions. Inspect at the intended playback size, not only 1920×1080.

Brand + CTA defaults to a 56px gap. `label` stays optional: `ASK YOUR AGENT` is useful if requested, but is not mandatory. Keep the exact default Setup Prompt unless explicitly replaced. Each brand may set its own `opticalScale`; spacing and scale are reusable content/tokens.

## Explicit downstream animation requests

A slide can carry an `animation` object. These requests appear in `timeline.json` and handoff v4; static slides still show all content. The animator owns choreography, timing, final frame checks and audio.

| Field | Request | Applies to |
|---|---|---|
| `prompt` | `typewriter` | Input: update live text, retain full-prompt reservation |
| `metric` | `count-up` | Single numeric metric: retain prefix/suffix such as `14+` |
| `connectors` | `draw` | Hub/workflow/tree/synthesis: draw original SVG paths |
| `items` | `sequential` | Cards/comparison/list: reveal each full item |
| `results` | `sequential` | Synthesis result: reveal each row |

Record user-approved actions here instead of relying only on narration notes. The host must implement them and verify intermediate/final states on backward and forward seeks. Opacity-fading a complete prompt does not satisfy `typewriter`; fading an entire connector does not satisfy `draw`. Use token-based `setSendState`, not an invented success-green fill. Read [input-binding.md](input-binding.md) before adapting pointer/Send geometry. A drawing adapter must preserve original paths and each SVG's identity; inline IDs need unique prefixes.

Static preflight cannot prove final animation or BGM quality. Downstream QA must check requested motions, reading holds, click contact, final rows and full soundtrack coverage. When a user asks to retain or extend approved music, the video workflow should edit that recording and audition seams; changing PPT templates cannot repair a bad music edit.
