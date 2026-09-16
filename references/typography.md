# Typography

Use the exact roles below. Do not choose substitute typefaces by taste. Machine-readable values live in `assets/tokens/tokens.json`; font files and licenses are indexed in `assets/fonts/manifest.json`.

## Line-height rule

All documented line heights are ratios/percentages.

- 150% = `font-size × 1.5`.
- Example: 54px text at 150% has an 81px line box.
- Example: 20px text at 150% has a 30px line box.
- Never assign `line-height: 150px` to normal body or component text.
- Never use a 1px-high text frame. Divider shapes may intentionally be 1px high.

## English roles

| Role | Family | Weight/style | Size | Line height | Tracking |
|---|---|---:|---:|---:|---:|
| Cover display | Outfit | Regular 400 | 116 | 110% | -2% |
| Inner H1 | Outfit | Regular 400 | 100 | 110% | -2% |
| Metric XL | Outfit | Regular 400 | 84 | 110% | 0 |
| Point title XL | Outfit | Regular 400 | 54 | 150% | 0 |
| Point title L | Outfit | Regular 400 | 50 | 150% | 0 |
| Point title M | Outfit | Regular 400 | 44 | 150% | 0 |
| Step number | Instrument Serif | Italic 400 | 50 | 120% | 0 |
| Lead L | Noto Sans | Regular 400 | 36 | 150% | -1% |
| Lead M/subtitle | Noto Sans | Regular 400 | 30 | 150% | -1% |
| Body L | Noto Sans | Regular 400 | 26 | 150% | 0 |
| Body M | Noto Sans | Regular 400 | 22 | 150% | -1% |
| Body S | Noto Sans | Regular 400 | 20 | 150% | -1% |
| Kicker | Noto Sans | Regular 400 | 24 | 150% | -1% |
| Label | Noto Sans | Semibold 600 | 18 | 150% | 0 |
| Source | Noto Sans | Semibold 600 | 16 | 150% | -1% |
| Callout body | Outfit | Medium 500 | 20 | 150% | 0 |

Step-number color is a semantic component token rather than inherited body color: `#008089` on Light and `#1EEAEA` on Dark.

Point/card/step/metric titles use Outfit Regular, including small titles. Body, subtitle, labels, kicker, and source use bundled Noto Sans. This preserves the reference hierarchy without requiring the restricted SF Pro file.

## Chinese roles

| Role | Family | Weight/style | Size | Line height |
|---|---|---:|---:|---:|
| Cover display | Smiley Sans | Oblique 400 | 116 | 120% |
| Inner H1 | Smiley Sans | Oblique 400 | 100 | 120% |
| Metric XL | Noto Sans SC | Semibold 600 | 84 | 150% |
| Point title XL | Noto Sans SC | Semibold 600 | 54 | 150% |
| Point title L | Noto Sans SC | Semibold 600 | 50 | 150% |
| Point title M | Noto Sans SC | Semibold 600 | 44 | 150% |
| Step number | Smiley Sans | Oblique 400 | 40 | 150% |
| Body L | Noto Sans SC | Regular 400 | 26 | 150% |
| Body M | Noto Sans SC | Regular 400 | 22 | 150% |
| Body S | Noto Sans SC | Regular 400 | 20 | 150% |
| Kicker | Noto Sans SC | Regular 400 | 24 | 150% |
| Label | Noto Sans SC | Semibold 600 | 18 | 150% |
| Source | Noto Sans SC | Medium 500 | 16 | 150% |
| Callout metric | Noto Serif SC | Bold 700 | 40 | 150% |
| Callout body | Noto Serif SC | Bold 700 | 20 | 150% |

Chinese Step numbers use the same theme color contract as English: `#008089` on Light and `#1EEAEA` on Dark.

The Chinese hierarchy is not an English font substitution. Preserve the role order: Smiley Sans for large display/numerals, bundled Noto Sans SC for information hierarchy and body, and Noto Serif SC only for emphasized callouts.

## Font files and licensing

Bundled with the skill under licenses that permit redistribution:

- Outfit variable TTF;
- Instrument Serif Regular and Italic TTF;
- Noto Sans variable TTF;
- Noto Sans SC variable TTF;
- Smiley Sans Oblique TTF;
- Noto Serif CJK SC Bold OTF;
- each corresponding license file.

The source Figma/PDF reference used SF Pro and MiSans in some roles. They are not required at runtime. Noto Sans and Noto Sans SC are the documented open-license packaging substitutions. Run `scripts/check-fonts.mjs` before output; a missing bundled file is a release error.

The Skill repository retains the complete licensed font source set, but a generated folder HTML does not copy it wholesale. `generate-deck.mjs` reads the font manifest and materializes only the web faces/licenses needed by the selected language and components. English decks omit Chinese faces; Chinese decks omit Instrument Serif because their numerals use Smiley Sans. Chinese Callout pages include Noto Serif SC; decks without that component omit the large serif file. The generated `assets/fonts/manifest.json` is filtered to the copied families.

## Runtime fallbacks

English body fallback order:

```text
Noto Sans -> Arial -> sans-serif
```

Chinese body fallback order:

```text
Noto Sans SC -> sans-serif
```

Chinese callout fallback order:

```text
Noto Serif SC -> Songti SC -> SimSun -> serif
```

Fallback output must be visually rechecked because glyph width changes can invalidate one-line titles and text budgets.

## Copy-fit policy

First preserve meaning, then layout.

1. Shorten redundant words.
2. Move detail into the description.
3. Reduce item count or change layout.
4. Split the slide.
5. Allow the runtime one-line fitter to reduce only to its minimum.

Do not solve overflow by globally shrinking all type. Do not condense/scale text horizontally. Do not switch fonts to fit.

## One-line title budgets

The generator enforces character budgets as an early warning; actual width is confirmed in browser preflight.

English:

- 2 columns: up to 42 characters per small title.
- 3 columns: up to 30 characters.
- 4/6 columns: up to 24 characters.

Chinese:

- 2/3 columns: up to 14 characters.
- 4/6 columns: up to 10 characters.

These are maximums, not targets. Prefer 2–5 words in English and 4–8 characters in Chinese for compact components.

Page-title budgets for vertically constrained layouts:

| Layout | English maximum | Chinese maximum | Line rule |
|---|---:|---:|---|
| six-card | 30 characters | 12 characters | exactly one line |
| Team 3 items + 1700×340 mask | 30 characters | 12 characters | exactly one line |
| split-image-text + Callout | 30 characters | 14 characters | exactly one line |

These page-title budgets preserve the fixed media/component height and structural spacing. If the takeaway is longer, shorten it or choose another layout; do not shrink the image, flatten spacing, or overlap regions.

## Text-box behavior

- Gradient text: width hugs content; never use a full-width fixed box unless the intended gradient is defined for that width.
- Inner H1/subtitle: fixed safe width, auto height within the heading zone.
- Gradient H1/cover titles retain their specified line height, but add `padding-bottom:.12em; margin-bottom:-.12em` as paint-only descent bleed. Outfit's `g/j/p/q/y` can extend below a 110% line box; `background-clip:text` otherwise cuts off the bottom even with `overflow:visible`. The cancelling margin preserves baseline positions and subtitle spacing. Do not replace this with a fixed height, hidden overflow, or changed line-height token. Run `scripts/validate-title-paint.mjs --html <generated-presentation/index.html>` after title/font/CSS changes.
- Small titles: fixed column width, one line, no manual line break.
- Description: fixed column width, auto/hug height within its component budget.
- Callout: fixed 1700px outer width and hug/auto height; default body-only uses a 70px minimum, while labeled or Accent variants use an 88px minimum.
- Source: fixed width, one line, ellipsis in HTML if exceptionally long.

## Case and punctuation

- Kicker/label: short uppercase English or compact Chinese.
- Titles: sentence case in English; no forced all-caps.
- Avoid orphan punctuation and manual spaces used as alignment.
- Use real numerals and units; include a nonbreaking semantic unit only when the renderer supports it safely.
- Avoid emoji and symbol-font arrows. Workflow arrows are packaged component text/icons.
