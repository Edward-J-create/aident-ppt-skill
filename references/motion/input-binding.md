# Input geometry binding / 输入框与鼠标定位

Use this optional helper for typing followed by a Send click. It is not an animation preset: it installs no movement, click, ripple, blink or timing. The default has no insertion caret (`showCaret: false`). The mouse is independent.

## Prepare before animating

```js
await AIDENT_MOTION.ready;
AIDENT_MOTION.seekSlide('request', 0);
const scene = document.querySelector('[data-id="request"]');
const binding = AIDENT_MOTION.inputBinding('request');
const fullPrompt = scene.querySelector('[data-motion="prompt-text"]').textContent;
await binding.prepare(fullPrompt);
// Only now clear/reveal text through your deterministic animation timeline.
AIDENT_MOTION.setPromptText('request', '');
```

`prepare(fullPrompt)` loads the actual font face for that text, waits for `document.fonts.ready` and scene image decoding, then reserves the prompt's full local CSS width/height. It restores the previously displayed text. Compact Send no longer moves as letters appear; multiline geometry is also reserved. It rejects overflow/overlap rather than shrinking text. Await preparation before building/starting the host animation. Do not measure empty text, a fallback font, a hidden scene, or a transient entrance pose. A camera's positive scale is supported; rotation/skew/perspective is not.

This reservation is **per content, language, font and layout**, never a hardcoded sample width. Call `release()` then `prepare(newFullPrompt)` after changing those inputs, logos or layout. Preparation temporarily presents the full text for measurement, so do it before playback/capture, not inside a frame callback. If the host requires synchronous timeline registration, integrate preparation into its pre-render/asset-ready initialization, then build the registered timeline according to that engine's contract. Do not assume a new async-created timeline is supported by every host.

中文：先等实际字体和图片加载完，再按最终文案预留本镜头尺寸；不要先清空文案再测量，更不要复制某个视频里的固定像素宽度。换文案、字体、语言或布局后重新准备。逐字变化不能把 Send 推走或压住。

## Measure a target, not an animation

`binding.measure()` returns:

- `delta: {x,y}`: **additional translation**, in the pointer parent's local CSS units; not absolute GSAP coordinates.
- `tip` and `target`: current fingertip and Send-center positions in viewport pixels.
- `error`: their distance in slide/canvas pixels; default tolerance is 1px.
- `transformOrigin`: local pointer hotspot for press scaling.
- `aligned` and `tolerance`.

Measure in the settled click-time layout. With a static button and camera, the following pattern works after preparation; use the project's existing GSAP, not a new CDN dependency:

```js
const pointer = scene.querySelector('[data-motion="cursor"]');
const send = scene.querySelector('[data-motion="send"]');
const first = binding.measure();
gsap.set(pointer, {transformOrigin: first.transformOrigin});
const goal = binding.measure(); // origin changes can move an already scaled pointer
const x = Number(gsap.getProperty(pointer, 'x')) + goal.delta.x;
const y = Number(gsap.getProperty(pointer, 'y')) + goal.delta.y;
// Add the approach to the host timeline, finishing at a named `contact` cue.
timeline.to(pointer, {x, y, duration: approachDuration}, approachStart);
// Keep pointer scale unchanged during approach, or measure its intended end scale.
// At contact, author pointer/Send compression together, using the hotspot origin.
```

At arrival, press onset, maximum press and release, seek the host timeline to that frame and call `binding.assertAligned()`. It throws for error >1 canvas px, invisible/missing targets, disabled Send, changed fonts or unsupported transforms. This checks geometry, not whether an animation should click: the caller owns click timing/state and backward seeks. Do not run assertions during intentional approach. No target falls back to `(0,0)`.

The helper supports translated, positive axis-aligned 2D scaling, including responsive previews and scaled pointer artwork. Arbitrary rotation, skew, reflection, perspective, CSS zoom, cropped artwork and non-centered contain are rejected instead of guessed. A moving camera or button needs measurements at the intended contact pose, or host-owned frame-by-frame coordinate mapping; a one-time target is not automatic tracking.

The packaged 59×59 hand uses the authored contact point `(23,12)` from `assets/tokens/motion.json`. `transformOrigin` and geometry use this same point, not the image center. For replacement artwork pass `measure({hotspot:{x,y}})` and `assertAligned({hotspot:{x,y}})` with normalized intrinsic-image coordinates in 0..1. Always supply this option for custom artwork, including when replaced before binding; no API can infer an arbitrary image's fingertip. Inspect visible contact as well as numeric error.

## Portable animation projects

Generated HTML loads the independent `assets/runtime/motion-input.js` helper. If discarding the preview/player, retain that file and the exported `inputContract.pointerGeometry` config as `window.AIDENT_INPUT_CONFIG`, then use `AIDENT_INPUT.bind(sceneElement)`. Preserve `data-motion="prompt-text|prompt|cursor|send"` selectors. The wrapper `AIDENT_MOTION.inputBinding(id)` is only a convenience. Do not claim the helper survives a flattened image/video export or a project that deleted its script/targets.

## Validation

Run `scripts/validate-motion-input-binding.mjs`. It covers delayed font loading, EN/ZH, compact/multiline, successive text prefixes, two preview scales, pointer press scales, replacement pointer hotspot, disabled/hidden targets, unsupported transforms, stale font/content and reverse samples. Run general preflight too. Inspect **actual new export frames** for overflow and visible fingertip contact: passing a static deck check or measuring an editor screenshot does not certify a final MP4.
