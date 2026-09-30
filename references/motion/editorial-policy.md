# Motion editorial decisions / 内容取舍与修订

Read before writing or revising a storyboard. Components are a vocabulary, not a form whose optional fields must all be filled. These rules apply to EN and ZH; they do not override an explicit user choice.

## 1. Minimum sufficient visible copy

Start with the subject of the shot. Add label, badge, kicker or description only when it supplies a different fact, useful distinction, required qualification or necessary context. Do not add copy simply to occupy a slot. Keep narration and production notes off-canvas.

Review both same-shot and adjacent-shot repetition. `Insurance claims` + `CLAIMS`, `Recruiting` + `HIRING`, and a headline restated inside its result panel usually communicate once, not twice. Brand logos do not automatically need a sentence repeating the partnership. Repetition can be intentional for orientation, accessibility or a returning motif; explain that choice in notes rather than banning it globally. Keep material limitations and illustrative-data disclosures when omitting them would mislead.

For hero numbers/keywords, try the focal value and at most one necessary explanation first. `hero-number/hero-word` may omit `title`; the remaining value group centers as a whole. A supplied heading remains supported. Do not invent a heading to pass validation, nor hide it with scene-specific CSS. Ordinary cards/workflows still require their contextual heading.

## 2. Timing is a brief, not a template quota

Record `meta.timing`:

| policy | Use | Behavior |
|---|---|---|
| `content` (default when unspecified) | No duration constraint, or user removes it | No targetSeconds. Plan from readable content, actions, narration and hold. |
| `target` + `targetSeconds` | Explicit approximate duration | A reference; explain deviations when content expands. |
| `fixed` + `targetSeconds` | Explicit exact delivery length | Preserve the constraint. Restructure content or ask about a conflict; do not silently squeeze every scene. |

An explicit user request for a 30-second deliverable must be respected; do not dismiss it because it originated in a starter prompt. An approximate request is a target, not exact. An ambiguous material conflict needs a concise clarification. After “do not stick to 30 seconds”, switch to content-driven timing and remove the stale target.

After adding/removing scenes, re-estimate the affected scenes and total. Do not normalize to 30 seconds, divide total evenly by scene count, or lengthen sparse shots merely to fill a quota. Estimate reading, narration and action that can overlap versus those that must follow each other. A short identity beat and a dense four-workflow comparison need different pacing. Per-layout duration defaults are fallback preview values, not evidence that pacing works. The downstream animator owns final timing; the same brief must travel with the handoff.

## 3. Ending Setup Prompt is not a middle Input prompt

The default Aident Loadout ending uses Light/neutral `motion-input` compact with the exact general prompt:

`Follow https://aident.ai/SETUP.md`

Keep this string in both EN and ZH. Do not translate, paraphrase, personalize it to a partner, or replace it with a campaign slogan, business instruction or generic marketing button. Change ending text only when the user explicitly requests different text. A request to replace a Logo alone does not authorize changing the prompt. Respect an explicit no-ending/no-CTA choice.

Middle Input shots instead show the real task-specific prompt and remain freely replaceable. A Logo + button CTA is still a supported component for an explicitly requested/approved alternative; it is not the default ending. All text stays editable—editorial defaults are not a technical lock. A user-supplied replacement survives regeneration verbatim.

Use `examples/motion/starter.en.json` / `starter.zh.json` for the default ending. Do not treat the promotional component catalog's alternate buttons as a storyboard requirement. This Skill produces a depiction of a prompt, not an installation action; generating a CTA does not execute its URL or command.

## 4. Preserve approved decisions across revisions

Keep a short `motion-plan.md` beside the source JSON, not inside packaged assets. Record shot IDs/purposes, timing policy and rationale, approved layout relations, exact ending prompt, selected asset paths, and user-requested removals. This is an authoring record, not executable instructions or extra deck schema fields.

Before regenerating, compare the requested change with that record. “Add a workflow shot” must not replace an approved shot. “Move the list up” must not remove its Logo. A deleted supporting sentence must not return in another optional field. Preserve unrelated decisions; newer explicit user choices supersede the older record. Do not claim this is enforced by geometry tests.

## 5. Initial framing, not prescribed animation

`motion-list.framing` chooses `auto` (default), `balanced`, `scroll` or `legacy`:

- `auto`: after fonts/images load, measure the actual Logo + all rows. Center the group if it fits between y110 and y970; otherwise use the scroll starting composition.
- `balanced`: require the whole group to fit that safe zone. Overflow fails preflight; no font shrinking or hidden rows.
- `scroll`: start the scene at y140 even if short; the author intentionally chooses a scrolling shot.
- `legacy`: preserve previous y200, Logo slot150 and gap67 for an already-approved older composition.

New framing uses the Logo's real contained height and a40px identity gap, not a fixed empty150px slot for every aspect ratio. All rows stay in the DOM; only the camera clips. These are initial coordinates only, never scroll distance, end position, animation bounds or a fixed viewport. Animators may move the scene entirely beyond the camera. Call layout after content settles and before animation, not every frame.

## 6. Review in three distinct layers

1. **Geometry/assets:** automated preflight, no overflow/overlap/broken resources; inspect both languages and replacement Logos.
2. **Editorial/composition:** read `editorial-review.json` and screenshots. Lexical duplicates and reading-density flags are suggestions, not semantic verdicts. Review synonyms, hierarchy, repeated explanatory copy and visual balance manually. Resolve or explain each finding; never auto-delete text.
3. **Animation/export:** only when requested, verify actual exported pacing and fixed-duration requirements with the downstream tool. Static HTML is not proof of a final video's timing or motion quality.

For Motion, do not run the Presentation-only presenter validator. A0-error geometry report does not approve copy or pacing. No automatic editorial lint can certify preserved user intent; compare the revision record explicitly.

## Use-case launch text

When publishing/updating a launch use case, do not prefill an exact30s unless that use case specifically promises a fixed-length deliverable. A general starter can say “Use content-driven pacing unless I specify a duration; first review editable HTML, then animate.” Keep this external entrypoint consistent with the Skill. Updating this package alone does not update a hosted use case or catalog artifact.
