# Editable handoff to animation tools

The Skill provides reusable HTML layouts, editable layers, local assets/fonts, and a lightweight preview clock. It does not require GSAP, Hyperframes or Remotion. Do not expand a layout request into a video-rendering project unless the user asks.

## Contract

- Each slide is a `section.motion-slide[data-id="stable-slide-id"]`.
- Components have `data-motion="heading|card-0|hub|satellite-0|connector-0|..."`.
- Every text/image has `data-layer="slide-id/..."` and `data-editable="text|image"`.
- List window: `[data-scroll-window]`; complete list track: `[data-scroll-track]`; rows: `[data-list-item]`.
- Background, texture, connectors, content, and identity are separate layers. Images are independent files. Text is ordinary HTML, not outlines or rasterized text.
- `animation-handoff.json` lists the concrete selectors/assets; `timeline.json` provides shot order/durations and notes; `deck.resolved.json` is the content source.
- Paths remain local/relative. No design-service connection is needed for generation or animation editing.

## External ownership

Open `index.html?external=1&capture=1&slide=0` for a clean, fully visible static composition. After readiness, the native preview does not animate opacity, transforms, or the list track. The external animator owns those properties.

```js
await window.AIDENT_MOTION.ready;
window.AIDENT_MOTION.externalControl(true);
window.AIDENT_MOTION.seekSlide('connected-three', 0);
window.AIDENT_MOTION.layout(); // after content/fonts/images change, before animation
```

Do not call `layout()` each animation frame; it measures layout and should not fight animated positions. If editing card text or replacing a logo, reset external animation first, wait for the replacement image's `decode()`, then call `layout()` to update intrinsic logo sizing and dock content-hugging cards to unchanged Joint connectors.

The internal preview is optional. You can remove its script when adapting HTML/CSS into another project, but retain its intrinsic image sizing and card-docking logic or implement equivalent layout binding. Joint curves and stems keep their original dimensions. Do not freeze cards to coordinates measured from one example's text and then stretch connectors to reach them.

## Minimal player interface

| API | Behavior |
|---|---|
| `ready` | Promise for bundled fonts, images, and initial layout |
| `seek(seconds)` | absolute deterministic preview time |
| `seekSlide(idOrIndex, seconds)` | select a shot and local time |
| `pause()` / `play()` | manual preview; no automatic playback by default |
| `externalControl(true)` | pause and clear player-written transforms/opacity |
| `staticSlide(index)` | select a fully visible static scene for editing |
| `layout()` | recalculate intrinsic logo sizes and Joint attachment boxes |
| `getState()` | global/local time, current slide, fps, duration, ownership |
| `duration`, `fps` | numeric timeline metadata |

Query options: `?t=2.5&capture=1` selects an absolute time; `?slide=3&external=1&capture=1` selects a static editable scene. `autoplay=1` is optional. Reduced-motion preference suppresses decorative entrances. Deterministic frame capture should use an explicit clock, not wall-clock playback or browser scrolling.

## GSAP adaptation

Use the official [GSAP skills](https://github.com/greensock/gsap-skills) when the user chooses that animation stack. Its core/timeline guidance supports scoped targets, sequencing and playback; the layout Skill supplies the actual editable targets.

Typical integration inside a project that already installs GSAP:

```js
await AIDENT_MOTION.ready;
AIDENT_MOTION.externalControl(true);
AIDENT_MOTION.seekSlide('results-list', 0);
const scene = document.querySelector('[data-id="results-list"]');
const rows = scene.querySelectorAll('[data-list-item]');
const track = scene.querySelector('[data-scroll-track]');
const windowBox = scene.querySelector('[data-scroll-window]');
const distance = Math.max(0, track.scrollHeight - windowBox.clientHeight);
const tl = gsap.timeline({paused: true});
tl.fromTo(rows, {opacity: 0}, {opacity: 1, duration: .4, stagger: .25}, 0);
tl.fromTo(track, {y: 0}, {y: -distance, duration: 8, ease: 'none'}, 1.4);
// An external frame clock can call tl.seek(frame / fps).
```

Items reveal top-to-bottom; track scrolls upward. Both remain separately editable. This is a short integration example, not a required animation preset. Scope queries to the scene. For animated Joint nodes, either animate the node and its connected curve as a group or update both from the same geometry; keep endpoints attached throughout motion.

## Hyperframes adaptation

Use the current Hyperframes skill/tooling when the user requests a Hyperframes project. Import/adapt the live HTML and its CSS/assets as scene content, preserving `data-layer` identifiers where practical. Map the scene timing from `timeline.json` to the host timeline, and give the host ownership of animations. Do not assume this folder is already a native Hyperframes project or has a particular version's registration files.

The minimum transfer is HTML + CSS + referenced assets/fonts + `animation-handoff.json` + content JSON. Verify first, middle and final frames, including all list rows and attached connector endpoints.

## Remotion adaptation

Use the current Remotion skill/tooling when that stack is requested. Adapt the DOM layout into React components, retain all content as props sourced from `deck.resolved.json`, and keep the original font files and image fit constraints. Drive transforms/opacities from Remotion's frame clock and map seconds using the composition fps. An ordinary iframe that starts its own requestAnimationFrame loop is not a reliable frame-synchronized Remotion composition.

Alternatively, a downstream capture process can render explicit HTML times and use those frames as video input; that result is raster video, so retain this editable source folder for later changes. Do not promise that MP4 preserves text layers or that HTML opens directly as an editable Premiere/Final Cut/DaVinci timeline.

## Editor handoff checklist

Supply scene order, source JSON, local media, fonts/licenses, layer index, suggested timing, and narration notes. Record the chosen engine and output fps only when producing a video. Changing the animation engine must not silently change layout, colors, fonts, original logo ratio, list order, or left-text/right-image composition.
