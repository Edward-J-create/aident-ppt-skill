# Maintaining Aident PPT Skill / 维护与发布

Keep changes reusable: update canonical tokens/registries, runtime, schema, references, examples and checks together. A screenshot-only correction is not a component fix. Keep Presentation and Motion rules separate; do not copy the reference repository's visual design or code.

所有修改都应落到可复用规则和实现中；不要只修生成的示例。商务演示与 Motion Slides 的字体、对齐、图标、布局与检查规则分开维护。

## Reproduce a report

Provide the repository commit, Node/browser/OS versions, mode, language, slide ID, a minimal sanitized JSON and local replacement assets. Include expected versus actual screenshots at 1920×1080 and the relevant QA report. Do not submit customer information, credentials, private design URLs or commercial screenshots.

## Runtime requirements

HTML generation uses Node.js 20+ and packaged assets; no npm dependency is needed for basic generation. Browser QA uses Playwright. Icon and preview maintenance additionally uses Sharp. Prefer the host's existing runtime via `RUNTIME_NODE_MODULES`; otherwise install locally (do not commit `node_modules`):

```bash
npm install --no-save --package-lock=false playwright sharp
npx playwright install chromium
```

The scripts use installed Chrome when available or Playwright Chromium. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select another compatible executable for Motion QA. Optional PPTX has separate runtime requirements in [export-and-present.md](references/export-and-present.md); it is not needed for HTML work.

## Validate a change

```bash
npm run validate
npm run generate:en
npm run generate:zh
npm run preflight:en
npm run preflight:zh
npm run motion:en
npm run motion:zh
npm run motion:qa:en
npm run motion:qa:zh
```

Use each mode's quality document and visually inspect every changed page, not only aggregate counts. Motion QA must retain intentional list overflow while blocking actual slide overflow. After changing shared generation or font/asset logic, test both modes and an optional single-file HTML export. Run presenter checks when its runtime changes. Run PDF/PPTX checks only when those adapters change or exports are requested.

When changing multi-agent integration, initialize a fresh run and test pending-handoff rejection, planning, assembly and release validation. QA pass reports must describe real generated artifacts; example pass reports are protocol fixtures, never evidence for a new release.

## Preview and asset updates

- Preserve original vector paths and logos. Joint connectors never stretch; cards dock to fixed endpoints.
- Keep backgrounds, textures and README previews Lossless WebP. Re-export before/after at the same resolution and compare decoded pixels when changing encoding.
- Regenerate Motion montages with `npm run motion:preview` only after both browser QA reports pass. Ordinary previews have separate `preview:showcases` and `preview:readme` commands.
- Run `npm run assets` after updating resource/category manifests. Review file counts, sizes and hashes.
- Preserve all font licenses and [NOTICE.md](NOTICE.md). Publishing does not grant a new brand-asset or repository-wide license.

## Publish safely

1. Confirm the destination is `Edward-J-create/aident-ppt-skill` and inspect its current branch/SHA.
2. Compare against a fresh checkout; preserve remote-only files and investigate conflicting edits. Never force-push over another author's updates.
3. Publish only Skill source, references, generic examples, indexed assets and documentation. Exclude `output/`, `.tmp/`, `node_modules/`, caches, user briefs and local QA screenshots. README montages belong under `assets/previews/`.
4. Run package checks and relevant browser tests from the staged checkout; confirm README links, installed fonts and both preview languages.
5. Review the final diff and staged filenames. Commit, push normally, then verify the remote SHA and downloadable files match.

See [reference-gap-matrix.md](references/reference-gap-matrix.md) for the scope comparison and explicitly unimplemented reference features. Granularity means concrete fields, geometry, failure rules and reproducible checks—not unsupported claims of complete feature parity.
