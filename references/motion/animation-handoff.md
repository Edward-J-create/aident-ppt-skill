# Editable handoff to animation tools

Version3 adds explicit theme, layout-owner, input and first-frame contracts; see [themes-and-combinations.md](themes-and-combinations.md). For diagram reveals target named `-visual` children, not the coordinate-owning node shell. The whole `diagram` or `workflow-group` target moves connected content together. A single animated node does not trigger live edge routing. Original connector SVG files remain linked and editable: a downstream stroke-draw adapter can inline their exact paths with unique IDs, preserving intrinsic dimensions; the Skill does not replace them with redrawn lines.

The Skill provides reusable HTML layouts, editable layers, local assets/fonts, and a lightweight preview clock. It does not require GSAP, Hyperframes or Remotion. Do not expand a layout request into a video-rendering project unless the user asks.

## Contract

- Each slide is a `section.motion-slide[data-id="stable-slide-id"]`.
- Components have `data-motion="heading|card-0|hub|satellite-0|connector-0|..."`.
- Every text/image has `data-layer="slide-id/..."` and `data-editable="text|image"`.
- Camera: `.motion-slide`; whole list scene (identity + track): `[data-list-scene]`; track: `[data-scroll-track]`; rows: `[data-list-item]`. No internal scroll window.
- Background, texture, connectors, content, and identity are separate layers. Images are independent files. Text is ordinary HTML, not outlines or rasterized text.
- `animation-handoff.json` lists the concrete selectors/assets; `timeline.json` provides shot order/durations and notes; `deck.resolved.json` is the content source.
- Paths remain local/relative. No design-service connection is needed for generation or animation editing.

## External ownership

Metric-card values and the CTA are registered targets, not arbitrary post-render additions. See [metrics-and-cta.md](metrics-and-cta.md). The generated handoff includes CTA container/text/arrow/optional label and independent metric-card/value selectors. Preflight compares the complete index with the actual DOM; removed or unindexed layers fail. Prompt copy is indexed at its text leaf, separate from its caret/container.

Open `index.html?capture=1&slide=0` for a clean static composition. Static visibility is the default even without query options: the native preview never animates content opacity, transforms or list position. The external animator owns those properties. `timeline.json` and `animation-handoff.json` declare advisory timing; no scroll distance or animation range is supplied.

```js
await window.AIDENT_MOTION.ready;
window.AIDENT_MOTION.externalControl(true);
window.AIDENT_MOTION.seekSlide('connected-three', 0);
window.AIDENT_MOTION.layout(); // after content/fonts/images change, before animation
```

Do not call `layout()` each animation frame; it measures layout and should not fight animated positions. If editing card/tag text or replacing a logo, reset external animation first, wait for fonts and the replacement image's `decode()` when applicable, then call `layout()` to update intrinsic logo sizing, recompute synthesis tag grids and dock content-hugging cards to unchanged Joint connectors.

The internal preview is optional. You can remove its script when adapting HTML/CSS into another project, but retain its intrinsic image sizing, synthesis composition measurement and card-docking logic or implement equivalent layout binding. Joint curves and stems keep their original dimensions. Do not freeze cards to coordinates measured from one example's text and then stretch connectors to reach them.

For animated Input, read **Cursor-to-Send targeting** and **Typing caret lifecycle** in [editable-components.md](editable-components.md). The mouse pointer has no automatic positional binding to Send; `x: 0, y: 0` is not a click endpoint. The typing caret follows live text, not a visual reveal mask over a complete sentence. The adapter owns measured click targeting, incremental text, caret visibility and deterministic state on seeks. Static preflight does not validate these animation behaviors.

## Minimal player interface

| API | Behavior |
|---|---|
| `ready` | Promise for bundled fonts, images, and initial layout |
| `seek(seconds)` | absolute deterministic preview time |
| `seekSlide(idOrIndex, seconds)` | select a shot and local time |
| `pause()` / `play()` | advisory clock/scene selection only; never content animation |
| `externalControl(true)` | compatibility API: pause clock, retain external ownership; never clear host styles |
| `staticSlide(index)` | pause and select scene; does not reset host-authored animation |
| `layout()` | recalculate intrinsic logo sizes, synthesis tag grids and Joint attachment boxes |
| `getState()` | global/local time, current slide, fps, duration, ownership |
| `setSendState(slideId,state)` | apply one explicit Send state; does not animate or submit; seek never resets it |
| `setPromptText(slideId,text)` | update the live prompt text leaf; inline caret follows its text end, but visibility/blink remain host-owned |
| `duration`, `fps` | numeric timeline metadata |

Query options: `?t=2.5&capture=1` selects an advisory absolute time; `?slide=3&capture=1` selects a static scene. Legacy `external` and `autoplay` flags never enable native entrance effects or automatic playback. Seeking alone does not render an animation: downstream frame capture must drive the host timeline explicitly, not wall-clock playback or browser scrolling.

## GSAP adaptation

Use the official [GSAP skills](https://github.com/greensock/gsap-skills) when the user chooses that animation stack. Its core/timeline guidance supports scoped targets, sequencing and playback; the layout Skill supplies the actual editable targets.

First expose targets to the chosen engine. This is a target-discovery example, not an animation preset:

```js
await AIDENT_MOTION.ready;
AIDENT_MOTION.externalControl(true);
AIDENT_MOTION.seekSlide('results-list', 0);
const camera = document.querySelector('[data-id="results-list"]');
const scene = camera.querySelector('[data-list-scene]');
const track = scene.querySelector('[data-scroll-track]');
const rows = [...scene.querySelectorAll('[data-list-item]')];
// The animation author chooses timing, distance, easing and camera framing.
// Animate scene to move identity + every row beyond the camera as one unit.
// Animate rows separately for a top-to-bottom appearance sequence.
// No scrollHeight-minus-window-height formula and no nested clipping window.
```

Suggested items reveal top-to-bottom while the complete scene travels upward, possibly fully out of view. These are independent editable targets, not mandatory animation ranges. A downstream GSAP timeline may use its own frame clock. Scope queries to the selected camera. For animated Joint nodes, animate a node and its connected curve together or update both from the same geometry; keep endpoints attached without stretching original curves.

## Hyperframes adaptation

Use the current Hyperframes skill/tooling when the user requests a Hyperframes project. Import/adapt the live HTML and its CSS/assets as scene content, preserving `data-layer` identifiers where practical. Map the scene timing from `timeline.json` to the host timeline, and give the host ownership of animations. Do not assume this folder is already a native Hyperframes project or has a particular version's registration files.

The minimum transfer is HTML + CSS + referenced assets/fonts + `animation-handoff.json` + content JSON. Verify first, middle and final frames, including all list rows and attached connector endpoints.

## Remotion adaptation

Use the current Remotion skill/tooling when that stack is requested. Adapt the DOM layout into React components, retain all content as props sourced from `deck.resolved.json`, and keep the original font files and image fit constraints. Drive transforms/opacities from Remotion's frame clock and map seconds using the composition fps. An ordinary iframe that starts its own requestAnimationFrame loop is not a reliable frame-synchronized Remotion composition.

Alternatively, a downstream capture process can render explicit HTML times and use those frames as video input; that result is raster video, so retain this editable source folder for later changes. Do not promise that MP4 preserves text layers or that HTML opens directly as an editable Premiere/Final Cut/DaVinci timeline.

## Editor handoff checklist

Read [editable-components.md](editable-components.md) for left/right Logo targets, replace-one-image behavior, Send button/inline-arrow targets and click events, short advisory timing, and linear versus hub connection schemas. State setters are not animations: external deterministic timelines must explicitly set the right state on backward and forward seeks.

Supply scene order, source JSON, local media, fonts/licenses, layer index, suggested timing, and narration notes. Record the chosen engine and output fps only when producing a video. Changing the animation engine must not silently change layout, colors, fonts, original logo ratio, list order, or left-text/right-image composition.
