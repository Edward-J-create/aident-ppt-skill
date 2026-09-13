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
7. Only the slide camera clips lists. Scene/track/ancestors below the slide must have visible overflow and no mask. All rows remain in the DOM and text stays in its own row. Temporarily translate the entire scene during QA to inspect the final row and prove the scene can fully leave the camera; never store that QA distance as a motion preset.
8. Suggested items appear top-to-bottom; whole scene moves upward. Scene, identity, track and row transforms remain independently addressable. Default list Logo must exist unless explicitly hidden; test custom and omitted Logo variants.
9. Normal preview fits at1920×1080,1280×720,1366×768,1440×900,1024×768. Grid is not required to see the whole frame.
10. Seek forward, backward and to the same time twice; compare the resulting animated state. No wall-clock dependency in explicit seek mode.
11. Normal mode already exposes full static content at time0 and after every seek. No native entrances, partial opacity, automatic list travel or default timing presets. Set external transforms/opacity, seek and wait: the player must not overwrite or clear them. Check every concrete selector in the handoff resolves uniquely.
12. Test folder HTML offline and optional single-file HTML. No remote fonts, CDN scripts, temporary export URLs, or missing local images.

The preview clock only selects scenes; it is not animation art direction. Review the semantic shot choices using [scene-planning.md](scene-planning.md): do prompt/identity/relationship content use appropriate Input/Logo/Joint candidates rather than generic card substitutions? Automated geometry checks cannot replace this authoring review. Exported MP4/NLE projects and engine-specific compositions require downstream QA when requested.

## Maintenance

Update `assets/tokens/motion.json`, `assets/components/motion-registry.json`, renderer/CSS, schema, examples, and these references together. Use `scripts/normalize-motion-icons.mjs --check` to verify exact extraction of existing design-system paths. Background changes remain lossless and require a visual comparison to the approved source. Refresh `assets/manifest.json` with `scripts/validate-assets.mjs`.

Run ordinary presentation regressions when the shared generator or preflight entrypoint changes. Motion-specific centered titles and intentional list-track overflow must never weaken the business deck's QA rules.
