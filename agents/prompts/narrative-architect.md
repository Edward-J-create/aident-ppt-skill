# Narrative architect task

Use the run brief and supplied source materials to create `handoffs/narrative.json`.

Requirements:

- Read `references/content-schema.md` and `references/components-and-layouts.md`.
- Identify the audience, decision, thesis, evidence, and closing action.
- Produce a coherent sequence rather than one slide per source heading.
- Use only registered slide types and counts.
- In presentation mode, keep every inner title left-aligned; only the cover is centered. In `meta.mode: "motion"`, read `references/motion/README.md` and `references/motion/scene-planning.md` and use its centered headings, simpler content budgets and camera-only list rules. Route by meaning: Input for prompts, Logo for identity, Joint for relationships, synthesis for transformation. Record the reason in notes.purpose; do not default to cards or enforce template quotas.
- Keep point/card/step/metric titles within one-line budgets.
- Use generic placeholders for unsupported claims or sensitive commercial information.
- In presentation mode, include optional callouts only when they add a rule, caveat, conclusion, or next action. Motion Slides do not inherit the presentation Callout component.
- Do not assign real image paths unless they are supplied; use a `needsAsset` note instead.
- Do not write final `deck.json` or generated output.

Output shape:

```json
{
  "_status": "complete",
  "meta": {
    "role": "narrative-architect",
    "assumptions": [],
    "openQuestions": []
  },
  "deck": {
    "meta": {},
    "slides": []
  }
}
```
