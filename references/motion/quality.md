# Motion Slides quality gate

Run the shared entrypoint; it routes motion HTML to its dedicated checks:

```bash
RUNTIME_NODE_MODULES=/absolute/path/node_modules node "$SKILL_DIR/scripts/preflight.mjs" \
  --html /absolute/path/motion/index.html --screenshots /absolute/path/motion/qa
```

## Required evidence

1. EN and ZH examples use identical template coverage. Confirm Outfit/Noto Sans for English and Smiley Sans/Noto Sans SC roles for Chinese.
2. Every text box fits; one-line titles do not wrap; no overlaps between foreground text or across connected cards.
3. Logos remain visible and preserve ratio for square, wide and tall replacement marks. An image that loads successfully but contains only an accidental shadow/glow layer still fails visual review.
4. Cards have the registered surface/radius and shared height; descriptions hug content. Kicker/tag gradients hug their text width.
5. Joint connectors retain their original SVG dimensions and curvature. Cards move to dock at the endpoints after short/long copy or logo replacement; never stretch connectors to reach fixed card positions. Check both three- and four-satellite variants, connector dimensions, edge contact, and no card overlap. Curves and logos use contain, not fill.
6. Design-system glyphs inside Joint cards use normalized motion resources. Do not resize a 60px surface+icon asset to46 and inadvertently make its inner symbol24px. Preserve original path geometry.
7. Scrolling-window bounds stay inside the canvas. Long-track overflow is allowed only under that clipped window. List row text stays inside its own row. Check the start, mid-scroll and end; final rows must become fully visible.
8. Items appear top-to-bottom; entire track scrolls upward. Their transforms are independently addressable.
9. Normal preview fits at1920×1080,1280×720,1366×768,1440×900,1024×768. Grid is not required to see the whole frame.
10. Seek forward, backward and to the same time twice; compare the resulting animated state. No wall-clock dependency in explicit seek mode.
11. External mode exposes full static content and clears player-owned transforms. Start an external animation, wait, and confirm the native player does not overwrite it. Check every concrete selector in the handoff resolves uniquely.
12. Test folder HTML offline and optional single-file HTML. No remote fonts, CDN scripts, temporary export URLs, or missing local images.

The internal preview is not the final animation art direction. Review static layout first, then only the minimal behavior that is actually part of this package. Exported MP4/NLE projects and engine-specific compositions require the downstream tool's own QA when requested.

## Maintenance

Update `assets/tokens/motion.json`, `assets/components/motion-registry.json`, renderer/CSS, schema, examples, and these references together. Use `scripts/normalize-motion-icons.mjs --check` to verify exact extraction of existing design-system paths. Background changes remain lossless and require a visual comparison to the approved source. Refresh `assets/manifest.json` with `scripts/validate-assets.mjs`.

Run ordinary presentation regressions when the shared generator or preflight entrypoint changes. Motion-specific centered titles and intentional list-track overflow must never weaken the business deck's QA rules.
