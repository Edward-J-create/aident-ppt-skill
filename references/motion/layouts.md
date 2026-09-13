# Motion layout and component catalog

All coordinates and dimensions are CSS pixels on a 1920×1080 canvas. Source-matched families are light-theme layouts. Dark variants are not inferred from the business deck. `motion-image` and `motion-metric` are explicitly documented extensions for user images and single-value scenes.

## Layout routing

| Type | Variants / count | Content | Geometry and fit |
|---|---|---|---|
| `motion-title` | statement | title, exact-substring highlight, optional kicker | 1700px safe width; centered vertically; 116px display; 2 lines maximum |
| `motion-brand` | single / pair | 1–2 logo images, editable separator | vertically/horizontally centered; logo height ≤144, width ≤760; pair gap 64 |
| `motion-cards` | 2 / 3 / 4 columns | optional label/image, title, body | x110, y429, width1700; gap30; shared height450; padding30; radius20 |
| `motion-comparison` | 2 | baseline, target | same card geometry; left muted surface; right translucent gradient |
| `motion-input` | multiline / compact | prompt, optional label/logo/cursor/send | centered; multiline width900 and hug height; compact hug width ≤1600; 24 padding; 77 send button |
| `motion-list` | plain / checked, 1–24 items | default/replaceable logo; row title/body/badge/image/check | scene x310,y200,w1300,height auto; logo height150 + gap67; track starts y417 with logo or y200 without; row min137/hug; gap20 |
| `motion-synthesis` | stages / many-to-few | 3 tag groups, 1–3 outputs | y380, 1700×550 zone; input panel hug; arrow in separate flex slot; output panel hug |
| `motion-hub` | three / four satellites | central title and/or logo; satellite labels/images | x110,y360,w1700,h570; separate curved SVG connectors; cards hug content |
| `motion-image` | split / hero | title, image; optional body for split | split: left text760 + gap100 + right image840×472.5 at y390; hero image1160×580 at x380,y360 |
| `motion-metric` | single | title, value, optional label/body | centered content1300px wide, y400; value200px Outfit; one verified or explicitly illustrative metric |

## Typography

| Role | English | Chinese | Notes |
|---|---|---|---|
| Main title | Outfit Regular 100, 110%, −2% | Smiley Sans 100, 120%, 0 | one line, centered |
| Statement | Outfit Regular 116, 110%, −2% | Smiley Sans 116, 120%, 0 | maximum two lines |
| Card title | Outfit Regular 54, 150%, −1% | Noto Sans SC Semibold 54, 150%, 0 | one line, left aligned |
| Body | Noto Sans Regular 22, 150%, −1% | Noto Sans SC Regular 22, 150%, 0 | hug height; maximum three lines in cards |
| Kicker | Noto Sans Regular 24, 150%, −1% | Noto Sans SC Regular 24, 150%, 0 | gradient spans hug text width |
| Card label | Noto Sans Semibold 18, 150%, −1% | Noto Sans SC Semibold 22, 150%, 0 | optional; one line |
| List row title | Noto Sans Regular 36, 150%, −1% | Noto Sans SC Regular 36, 150%, 0 | source-specific body-family title role |
| Prompt | Noto Sans Regular 42, 150%, −1% | Noto Sans SC Regular 42, 150%, 0 | multiline may wrap; compact stays one line |
| Tags | Outfit Regular 24 / 30 / 50, 150% | Noto Sans SC Regular 24 / 30 / 50, 150% | small / medium / large; hug both axes |
| Badge | Outfit Medium 24, 150% | Noto Sans SC Medium 24, 150% | small list pill, width hugs text |

150% means the font size times 1.5; a 54px card title has an 81px line box. Text height is auto; 450px is a card's coordinated container height, never a text-frame height. Do not horizontally scale text or silently switch fonts. Overflow requires shorter content or another count/layout.

## Copy budgets

| Field | English | Chinese |
|---|---:|---:|
| Page title | 44 characters | 17 characters |
| Statement, including highlight | 80 characters | 26 characters |
| 4-column card title | 16 characters | 6 characters |
| 3-column card title | 22 characters | 10 characters |
| 2-column card title | 28 characters | 10 characters |
| Card/list description | 100 characters | 48 characters |
| Kicker | 56 characters | 24 characters |
| List title | 48 characters | 22 characters |
| Badge | 16 characters | 8 characters |
| Compact prompt | 66 characters | 30 characters |
| Multiline prompt | 150 characters | 70 characters |
| Hub/satellite title | 22 characters | 10 characters |
| Tag | 24 characters | 8 characters |
| Output tag | 22 characters | 10 characters |

These are early character limits, not guarantees of pixel fit. Combined compact prompt + logo + label can exceed the width even when each field fits its individual budget. Browser QA is authoritative. Line breaks are allowed only in the two-line statement and multiline prompt/body roles. Preserve meaning when shortening; move supporting detail to notes when it is narration rather than screen content.

## Paint and surfaces

- Base canvas: `#F2F4F0`; primary text `#111114`; secondary `#5E6263`; accent `#008089`.
- Standard point/card: cyan `rgba(30,234,234,.06)`, border `rgba(0,128,137,.30)`.
- Muted comparison card: `rgba(17,17,20,.04)`, border `rgba(17,17,20,.20)`.
- Accent comparison card: green `#77FAB4` → cyan `#6DE4F9` at 49.038% → pink `#F3B6FF`, **20% stop alpha**, border accent at60%. This is not the presentation Callout's 16% fill.
- Output emphasis tag: same color direction at full fill; text stays primary.
- Badge: cyan at20%; primary accent text; pill radius; padding16.
- Semantic tag fills: neutral / info / success / warning / purple / accent from `motion.json`. Apply alpha only to fills; never fade an entire component to simulate paint opacity.
- `content` background: source-exported atmospheric layers composited at their original scale and positions; `title`: more visible diagonal atmosphere; `elements`: packaged right-weighted elements.
- Text remains outside background artwork. Texture stays a separate subtle overlay. All new raster resources use Lossless WebP with decoded-pixel verification.

## Scrolling list anatomy

```text
slide (1920×1080, sole camera clipping boundary)
  list-scene (width1300, height auto, overflow visible; whole-shot motion target)
    identity (default Aident / custom / explicitly hidden)
    list-track (height hugs ALL rows, overflow visible; independently editable)
      row-0 (title / description / badge / optional check)
      row-1
      ... row-N (may start below the canvas)
```

Suggested item appearance order is top-to-bottom; suggested whole-scene motion is negative Y (upward). The outer scene includes both Logo and track so the complete content can leave the camera. Track and rows remain separate targets for alternative editorial choices. There is no internal clipping window, edge fade, maximum scroll distance, or automatically calculated travel. Downstream animation tools choose framing and movement, including moving the final row completely out of the camera. Keep every row in the DOM with hug/auto height; do not squeeze rows into the initial frame.

Static HTML exposes all rows at full opacity, including those naturally below the camera. Off-camera content is not a missing asset. Neither seeking nor the advisory preview clock moves or hides it. Test editability by temporarily moving the outer scene to inspect later rows, not by adding a permanent scroll container.

## Logo and image slots

Every image is replaceable by a local PNG/JPEG/WebP/SVG, including all hub satellite logos and the input identity. Only a logo's height/maximum safe width constrains its rendered size. The runtime uses intrinsic dimensions to preserve the ratio, including wide or tall replacement logos. No forced square crop. The SVG's own viewBox whitespace is preserved; users should supply a tightly cropped logo file if they want no built-in whitespace.

Content images use explicit `fit: "contain" | "cover"` and `position: "50% 50%"`. Screenshot defaults use contain. Hero photographs can use cover when intentional; keep subject placement inside the slot. Split images stay on the right.

Curves and arrows are exact exported SVG assets, not font symbols or hand-redrawn glyphs. Joint curves retain their intrinsic dimensions (211.249 × 106.192px); the vertical stem retains 10 × 129px. Mirroring is allowed; stretching, skewing, or redrawing is not. Use `object-fit: contain`, never `fill`.

**Move cards to the connectors, not connectors to the cards.** `layout()` measures content-hugging cards after font/logo loading, positions the unchanged connectors around the hub, and docks each card edge to its connector's outside endpoint. Shorter text reduces the card's outward width without opening a gap at the connection. Longer text grows outward; it must not stretch the Joint. Call `layout()` after replacing HTML content and before beginning animation. If content exceeds the safe area, shorten it or choose another layout instead of distorting the connectors.
