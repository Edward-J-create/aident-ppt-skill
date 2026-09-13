# Timing, colors and independently editable components

Use this reference when customizing Motion duration, tag colors, workflow topology, Input/Send states or Logo pairs. Source JSON changes require regeneration. Direct HTML edits are for downstream animation authors; call `AIDENT_MOTION.layout()` after fonts/images/content settle and before animation, never every animation frame.

## Advisory timing / 建议时长

| Shot | Default seconds | Editorial guidance |
|---|---:|---|
| Logo single/pair | 2 | A signature may need only 1.5–2.5s; a explained partnership may need longer |
| Statement / metric | 3 | One short idea, not a paragraph |
| Input / image | 4 | Allow reading; typing and narration may require more |
| Cards / comparison / synthesis / hub / workflow | 5 | A starting suggestion for a simple relation, not a fixed duration for every density |
| List | 6 | Short-list fallback only; author a duration matching visible content and narration for long lists |

`slide.duration` overrides the default, accepts fractions, and must be at least one frame at `meta.fps`, at most180s. Defaults live in `motion-registry.json`; no mandatory entrance/exit/hold time is injected. Timing is a preview clock and editorial hint, not a cap on an external animation engine. Do not blindly shorten a narrated scene to match this table. Explicit old example durations remain valid.

## Semantic tag colors / 标签配色

Gray is a fallback, not a required art style. Set `tone` on each input/output tag; layout size/alignment remains unchanged.

| `tone` | Text | Fill |
|---|---|---|
| `neutral` | gray `#5E6263` | black4% |
| `info` | blue `#1381FF` | blue12% |
| `success` | green `#009A13` | green12% |
| `warning` | orange `#FF8000` | orange12% |
| `purple` | purple `#6155FF` | purple12% |
| `accent` | teal `#008089` | cyan12% on inputs; full packaged gradient on a single standalone output |

Useful choices: blue peers + accent result; blue sources + purple processing + green approved results; orange only for an actual caution. Same category uses the same color across scenes. Do not use different colors merely because tag lengths differ. Multiple output tags inside their panel use semantic fills, not an automatic full gradient. Custom branding can override `--tag-fill` and `--tag-color` in the generated CSS, retaining readable contrast and consistent categories; arbitrary color strings are not accepted as `tone` JSON values.

## Workflow nodes and edges / 节点和连线

Two distinct topologies are registered: `motion-hub` for **one center connected to1–4 satellites**, and `motion-workflow` for **2–4 ordered nodes from left to right without a center**. Choose based on the relationship, not visual habit. Neither is an arbitrary graph, cycle or nested workflow engine. Unsupported relationships must be split or handled by a purpose-built diagram implementation, not silently flattened into a hub.

### Left-to-right workflow / 无中心单向流程

```json
{"id":"process","type":"motion-workflow","title":"A clear sequence",
 "items":[{"id":"collect","title":"Collect"},{"id":"review","title":"Review"},{"id":"share","title":"Share"}]}
```

Item order is the reading/connection order. There are exactly `items.length-1` arrows; the final node has no outgoing arrow. Add/remove nodes in JSON and regenerate to update edge count and equal card widths. Optional explicit `connections` use `{id,from,to}` without a `slot` and must cover every adjacent pair in left-to-right order. Skipping nodes, duplicates, cycles and reversed edges are rejected. Each node supports optional `label/body/image`; do not add them just to fill the card.

Nodes are equal-width Fill (maximum440px), with shared tallest content height, padding24, gap12 inside, and left-aligned30px/150% titles. Text stays hug height. Layout uses x110,width1700, vertical center630; original arrows are167×22.0919 with24px clearance on both ends. Arrows are independent elements, not text characters or stretched Joint curves. Use short titles: four nodes allow12 EN /6 ZH characters; two/three allow22 EN /10 ZH, always subject to pixel-fit QA. If the content does not fit, shorten/split rather than shrinking fonts. Pair title limits are not a guarantee that a long single word fits.

Targets are `node-collect`, `node-review`, `node-share`, and `connector-0/1` (or explicit edge IDs). Edges expose `data-from/to`; nodes expose `data-node-id`. Reordering explicit item IDs keeps node selectors stable, but requires updating explicit edges. Node content changes reflow CSS automatically; moving animated nodes arbitrarily does not make arrows chase them every frame. The external animator must move related pieces together or explicitly update geometry without stretching the original arrow.

### Hub relationships / 中心关系图

Omit `variant` to infer count; explicit `one/two/three/four` must match `items.length`. Omit `connections` for defaults:

| Satellites | Slots in item order |
|---|---|
| 1 | bottom stem |
| 2 | top-left, top-right curves |
| 3 | top-left, top-right, bottom stem |
| 4 | top-left, top-right, bottom-left, bottom-right curves |

For reorder-stable animation bindings, give each item an `id` and each explicit connection an `id`:

```json
{
  "id":"context", "type":"motion-hub", "title":"Connect the context",
  "hub":{"title":"Decision"},
  "items":[{"id":"evidence","title":"Evidence"},{"id":"owner","title":"Owner"}],
  "connections":[
    {"id":"evidence-link","from":"hub","to":"evidence","slot":"top-left"},
    {"id":"owner-link","from":"hub","to":"owner","slot":"bottom-right"}
  ]
}
```

Slots are unique. `bottom` cannot coexist with `bottom-left/right` because their content regions conflict. Missing/duplicate targets, duplicate IDs, incompatible counts and unrecognized slots fail validation. Explicit connections must cover every satellite; removing a node requires removing its edge. Regenerate to add/remove DOM nodes/edges; `layout()` remeasures existing elements, it does not infer new topology from arbitrary DOM edits. Resolved connections are saved in `deck.resolved.json`.

Selectors: `[data-motion="hub"]`, `[data-motion="satellite-evidence"]`, `[data-motion="connector-evidence-link"]`; scope them to the slide. Each connector also has `data-from`, `data-to`, `data-slot`. Without explicit IDs, numeric fallbacks preserve existing simple examples but may change after reordering. Original curve211.249×106.192 and stem10×129 stay unscaled; cards move to endpoints. Text replacement recomputes attachment geometry. Too-wide nodes or collisions block delivery rather than stretching artwork.

## Input and Send / 输入框与发送按钮

`prompt`, compact `label/image`, `showCursor`, and `showSend` remain independently configurable. Multiline wraps; compact stays one line. Example:

```json
{"id":"request","type":"motion-input","variant":"compact",
 "label":"Ask","prompt":"Find one useful next step.",
 "send":{"state":"default","ariaLabel":"Send request"},"showCursor":true}
```

Targets: `input` (whole scene), `input-surface`, `input-logo` (if present), `input-label` (if present), `prompt`, `send`, `send-icon`, `cursor` (if present). The arrow is the original packaged SVG path rendered inline with `currentColor`, not a redrawn glyph or flattened button image. Text remains live HTML. This is an editable visual input scene, not a functional text-entry form or network request UI.

Send is a real `button`, with manual states `default / hover / pressed / sent / disabled`. Its background and arrow color are separate `--send-fill` / `--send-color` properties; state colors come from `tokens.send.states`. State names do not install automatic hover/press animations. No native transitions, easing, scale or post-click state are forced.

```js
await AIDENT_MOTION.ready;
AIDENT_MOTION.setSendState('request', 'pressed');
// Host animation may scale the button, animate its colors, and then set 'sent'.
window.addEventListener('aident:send', ({detail}) => {
  // detail = {slideId, state}; host decides what happens next. No network request.
});
```

Pointer click and keyboard activation emit `aident:send`; disabled buttons do not. `setSendState` also updates actual button disability, rejects unknown states, and does not alter timing or animation transforms. Seek does not reset host-authored state. For reproducible video capture the external timeline must explicitly set state at each requested time, including backward seeks. For pure color customization use the button's CSS variables without changing all slide colors.

## Logo × Logo / 双 Logo

Both entries in `logos:[left,right]` are replaceable PNG/JPEG/WebP/SVG files. Replace `logos[0]`, `logos[1]`, or both; preserve array order. `separator` is separately editable text (default `×`). Two populated slots are required in pair mode; do not invent a partner. Keep packaged Aident on one side only if that is the intended relationship/default placeholder.

Never split a single brand's symbol and wordmark across `×` as if they were two identities. The default for single/pair brand shots is the approved **complete graphic-plus-text** `assets/motion/lockup.svg`. It is one self-contained image exported from the approved artwork, with no export-canvas background and no font dependency. Keep `assets/motion/mark.svg` for compact list/input/diagram identities, or an intentionally requested graphic-only shot. Do not use extracted text-only `wordmark-light.svg` as a complete identity, recreate lettering with HTML fonts, or assemble a new lockup by guesswork. The pair example has the complete Logo on the left and an explicit live-text user-logo placeholder on the right:

```json
"logos": [
  {"src":"assets/motion/lockup.svg","alt":"Aident Loadout complete logo"},
  {"placeholder":"YOUR LOGO","caption":"Replace with your brand"}
]
```

Chinese examples use `{"placeholder":"你的 Logo","caption":"替换为你的品牌标志"}`. Placeholder text stays editable HTML, uses bundled fonts and does not pretend to be a partner logo. A placeholder entry accepts only `placeholder` (1–24 characters) and optional `caption` (up to48). Replace the entire entry with `{src,alt}` to populate it; never leave placeholder fields alongside `src`. Omit the pair scene when no second identity or placeholder is relevant. These examples demonstrate customization, not a partnership claim.

Independent stable targets are `[data-motion="logo-0"]`, `[data-motion="separator"]`, `[data-motion="logo-1"]`. Each Logo image remains a separate file even when both reference the same asset. Text/image leaf IDs may renumber on structural edits; animate named component targets and regenerate the handoff when structure changes.

To change only the right image directly, select `[data-motion="logo-1"] img` within the scene, replace `src`, await `decode()`, then call `layout()`. Never change every `.m-brand-logo` globally. Single-shot bounds are width≤777 and height≤147; pair bounds are width≤597 and height≤113.062 per image, with 64px between identity/separator/identity. These are maximum bounds, not forced image dimensions; runtime scales uniformly by intrinsic ratio. They come from `motion.json.brand` and are separate from the list's 150px mark. A differently shaped replacement may recenter the whole pair through Flex layout; unchanged left identity and animation styles remain intact. If a shot needs absolutely stationary positions while swapping aspect ratios, the downstream animator should reserve a slot using the known replacement set before starting animation. Do not freeze one sample's dimensions as a universal brand rule.

Fade, move, scale, recolor a suitable vector, or swap one Logo independently; the player does not animate the other Logo automatically. Raster Logo recoloring needs an appropriate alternate asset; do not promise that every PNG can be cleanly recolored by CSS. Browser QA checks each image ratio and containment after replacement.

## Examples and verification

See `examples/motion/controls.en.json` and `controls.zh.json` for bilingual timing, color, count/slot and Input-state examples. Run `node scripts/validate-motion-controls.mjs --browser` for source contracts, count/edge correspondence, replacement Logos, Send activation/state ownership and screenshot checks. Geometry pass still requires a visual review.
