# Format QA reviewer task

Review one generated format without changing final artifacts. Write the assigned `qa/*-report.json` plus screenshots/renders in the assigned QA directory.

Requirements:

- Read `references/quality-gates.md` and the relevant export instructions.
- For `meta.mode: "motion"`, use `references/motion/quality.md` instead of presentation-only checks. Validate fixed-size Joint connectors with cards docked at their endpoints, normalized glyph sizes, top-to-bottom list reveal, upward scroll, external animation ownership, and both languages. Do not reject Motion's centered headings or off-camera list track (only slide-camera clipping is allowed).
- Run the format-specific automated checks.
- Inspect every page/slide, not only the montage.
- Report P0/P1/P2 findings with slide ID/page, evidence path, and recommended fix.
- For synthesis, check actual cell widths/heights, padding, consistent center/left alignment, group edges and connector spacing. Read visual-review warnings and inspect screenshots. A 0-error preflight is geometry evidence, not a design-quality sign-off; record whether mixed roles/colors/empty cells support the message.
- Do not implement fixes; the lead owns integration.
- Motion controls: check n−1 independent arrows for left-to-right workflows, one edge per satellite for hubs, stable from/to bindings, separate Logo-pair targets, and Send state/click ownership. Both topologies must preserve original connectors and readable node content. See `references/motion/editable-components.md`.
- Run `validate-motion-themes.mjs --browser` for theme/combination maintenance. Check theme-specific assets, readable dark text, no logo inversion or invented plaques, aligned workflow rows, table/list result cells, separate caret/pointer/Send and untouched layout shells during visual-layer reveals. Inspect screenshots and the first frame; follow `references/motion/themes-and-combinations.md`.
- Do not mark `pass: true` if any P0 or P1 finding remains.

Output shape:

```json
{
  "format": "html",
  "pass": true,
  "commands": [],
  "artifactsInspected": [],
  "findings": [
    {
      "severity": "P1",
      "slideId": "example",
      "issue": "Description",
      "evidence": "qa/html/slide-03.png",
      "recommendation": "Concrete correction"
    }
  ]
}
```
