# Synthesis composition / 标签组合排版规范

Use this reference for `motion-synthesis`. A size token is an available role, not a required ingredient. Neither `stages` nor `many-to-few` implies a size ramp. Choose by information hierarchy and composition; never allocate small/medium/large by column number.

## Peer-label systems / 同级标签

| Intent | Container contract | Typography and alignment |
|---|---|---|
| Short peer labels / 同级短标签（default） | `columns` + `fill`: every column shares a width measured from the widest tag, all tags fill it; equal row heights | One shared medium size (30px/150%), equal padding, centered text. Do not mix center/left within the group. |
| Longer labels / 描述型标签 | Same equal-width Fill grid, text height remains hug; shorten or change layout if it cannot fit | One shared size and consistent left padding; choose `align:left` for the entire composition, not one tag at a time. |
| Grouped horizontal rows / 分组横排 | `rows` + `fill`: each group fills the same panel width; cells within one row have equal width/height | Choose center or left once. Rows with different item counts have different cell widths: use only when rows are separate semantic groups. For all-tags-equal width, use columns or equal-count rows instead. |
| Compact keywords / 紧凑关键词组 | `wrap` + `hug`: tag backgrounds hug text; groups share panel edges and consistent spacing | One shared size/padding; centered label inside each chip, or uniformly left-aligned labels. Unequal widths are intentional here, not a broken Fill grid. |
| Primary/secondary roles / 主次关系 | Start with a regular grid; use a separate output or clearly distinct semantic role | Prefer tone first. Optional per-tag `size` overrides are allowed, usually two roles are enough. Explain mixed sizes in `notes.purpose`; no quota requires all three. |

The default is medium → medium, including the output. A larger output is an explicit editorial choice (`outputSize:large`), not a hidden default. Peers cannot be assigned different sizes just because their copy is short/long. Input and output are separate semantic groups, so a deliberate output emphasis is valid without enlarging input columns.

## Available controls

All are optional under `slide.composition`; resolved values are written to `deck.resolved.json` for reproducibility.

| Field | Values | Default / scope |
|---|---|---|
| `arrangement` | `columns`, `rows`, `wrap` | `columns`; preserve authored group/item order |
| `size` | `small`, `medium`, `large` | `medium`; all input peers inherit it |
| `outputSize` | same | `medium`; explicit result emphasis is optional |
| `tagWidth` | `fill`, `hug` | `fill`; wrap requires hug and resolves to hug when omitted |
| `align` | `center`, `left` | `center`; one consistent alignment throughout composition |
| `groupAlign` | `start`, `center` | `start`; vertical alignment of unequal column groups, not text alignment |
| `density` | `comfortable`, `compact` | `comfortable`; use compact for dense content, never to reduce fonts silently |

Per-tag `size` overrides the role default; per-tag `tone` controls semantic color. Tag fields are `id/title/tone/size` only: images, body copy and labels belong to other component families and must not be silently ignored.

```json
{
  "id":"evidence-to-action", "type":"motion-synthesis", "title":"Turn evidence into a decision",
  "composition":{"arrangement":"columns","size":"medium","tagWidth":"fill","align":"center"},
  "groups":[
    [{"title":"Source notes"},{"title":"Observed facts"}],
    [{"title":"Compare views"},{"title":"Check evidence"}]
  ],
  "outputs":[{"title":"Next action","tone":"accent"}],
  "notes":{"purpose":"Two equal-weight input groups use uniform centered cells; color distinguishes the result."}
}
```

## Geometry and sizing

- Input groups: 1–4; each group 1–4 tags. Outputs: 1–3. Do not invent a third group just to satisfy an example.
- Content zone: x110/y380, 1700×550. Panel and output heights hug content and share the connector's vertical center. Text never gets a fixed height.
- Comfortable panel padding32, group gap24, tag gap16. Compact uses padding24 and both gaps12. Panel edge/border is separate from tag padding.
- Small tags: 24px/150%, padding12, radius8; medium: 30px/150%, padding16, radius16; large: 50px/150%, padding16, radius24. A uniform medium one-line cell naturally measures77px high. Matched row containers may be taller when explicit semantic roles differ; text itself stays hug.
- Panel width is computed from actual loaded text, gaps and padding, not a copied sample's dimensions. Maximum input width1120; output width plus connector167 and two44px gaps are reserved. Shorter content contracts the composition; longer content must still fit the zone.
- Column Fill widths are equal across all groups. Corresponding row heights align across columns. Rows Fill widths are equal within each semantic row, and all rows share the panel's left/right edge. Wrap keeps tag widths intrinsic and balances line occupancy within the available width without reordering tags or adding extra lines just to fill space.
- Original connector is167×22.0919, independently editable. Do not distort the arrow to consume blank space. Keep the44px gaps between input/arrow/output.
- In columns, unequal group counts may leave empty cells. Do not add meaningless filler. For peer groups, review rows/wrap; retain columns if they encode an important left-to-right relationship. Do not silently reorder or flatten groups.

After text/font/image changes call `AIDENT_MOTION.layout()` before animation. It measures natural copy widths and recomputes grid geometry without changing wording, font size, opacity or animation transforms. Oversized text must fail geometry QA; choose another arrangement, reduce density appropriately, shorten copy or split the scene. Never scale text horizontally, crop it, or shrink it below tokens to force a pass.

## Color and visual review

Use neutral + one accent for unclassified peer labels. Multiple semantic colors are allowed when they encode actual categories; document that meaning rather than coloring every item for variety. An accent result can stand out without a50px font. Gradient text always hugs its glyph width; a deliberate gradient container follows its chosen Fill/Hug scope.

Preflight checks cell widths/heights, padded text containment, consistent alignment, panel bounds, connector spacing/ratio and centerlines. It reports visual-review advisories for mixed sizes, many colors or sparse grids. These are prompts for judgment, not universal bans.

**0 errors is geometry pass, not design approval.** Inspect a1920×1080 screenshot and a thumbnail: does the audience see the intended reading path, equal-weight peers, one clear result, and purposeful blank space? Review warnings and record why any intentional exception is appropriate before delivery.

## Inline result table
A synthesis may use `outputs: []` plus `result: {title,image?,columns,rows,caption}`. This represents the result phase within the same use case. Use three columns, 1–4 short rows, an explicit preview/provenance caption, and the existing immutable connector. The editable 840px table reserves space on the right; shorten source tags to fit the remaining input region. Targets `result-row-N` and `result-cell-N-M` support later row/cell animation; static slides show the complete result.
