# Semantic shot planning / 按语义选择镜头

Read before drafting a Motion deck. The generator renders explicit `slide.type`; it does not select layouts, assign hidden weights, or infer a storyboard. The authoring Agent must do that work. The 18-page examples are a component catalog, not a recommended video sequence.

## Intake

Establish audience, intended takeaway, language (English default), source content and whether this delivery is editable HTML or a separately requested finished animation. Ask once: “Keep the default Aident Logo, replace it with your own PNG/JPEG/WebP/SVG, or use no Logo?” Do not block when unanswered: use packaged `assets/motion/mark.svg` and disclose the default. Already supplied brand choices need no repeat question. Ask this when generating a user's deck, not when maintaining the Skill.

Only use user-supplied or approved logos to imply actual products/organizations. A pair-logo scene represents a real, specified relationship; do not invent a partner to fill the second slot. Never put a Logo on every scene solely for variety.

## Choose the visual relation first

| Meaning / 叙事作用 | Preferred candidate | Use it when / avoid it when |
|---|---|---|
| Identity, introduction, closing signature / 品牌亮相 | `motion-brand` single | Give an identity its own shot when it matters; no need for a heading above a Logo. Use default Aident if no replacement is supplied. |
| Integration or collaboration / 品牌关系 | `motion-brand` pair | Two approved identities and an editable separator. No invented endorsement. |
| A request, query, instruction / 输入问题 | `motion-input` compact or multiline | Show the actual prompt instead of a card saying “Enter a prompt.” Compact may include Logo/label; multiline supports a real readable request. |
| One center connected to 3/4 actors / 连接关系 | `motion-hub` | Explain tools, roles, signals or relationships with live nodes and unchanged Joint connectors. Do not misuse this as a linear four-step chain. |
| Many inputs becoming fewer outputs / 汇聚与转化 | `motion-synthesis` | Separate input tags, directional connector and output; not paragraph cards. Requires 3 input groups and 1–3 outputs. |
| Real screenshot, visual evidence / 画面证据 | `motion-image` | Hero for image focus, split for left text/right image. Ask for missing evidence instead of inventing a screenshot. |
| A genuine contrast / 对比 | `motion-comparison` | Two distinct states; don't turn an ordinary list into a false before/after claim. |
| Ordered repeated results / 连续清单 | `motion-list` | Keep full content beyond camera. No nested scrolling viewport. More rows need downstream camera travel, not tiny text. |
| A meaningful number / 数值 | `motion-metric` | One verified or clearly illustrative number. No metric merely to create a closing page. |
| Independent categories / 并列概念 | `motion-cards` | 2–4 genuinely parallel ideas. Not the default container for prompts, relationships or process transformations. |
| A standalone claim or transition / 核心句 | `motion-title` | One short takeaway. Avoid repeating every scene's message as a separate title slide. |

These are semantic choices, not numeric weights, mandatory percentages or a quota requiring every template. If no registered geometry fits (for example an arbitrary linear workflow), explain the mismatch and choose a supported truthful representation; do not disguise card columns as a connected flowchart or stretch Joint artwork.

## Draft a shot plan

For each shot record: narrative purpose, visible subject, visual relation, chosen type, required assets and optional downstream motion idea. Put the reason in `notes.purpose`, narration in `notes.talk`, and a non-binding transition idea in `notes.transition`. Do not add unsupported JSON keys.

Before generation review whether prompt, identity or relationship content was flattened into cards. If so, select Input, Logo or Joint/synthesis as appropriate. Repeated layouts are allowed when the story needs repetition; avoid mechanically mapping one source heading to one page. Keep one dominant visual idea per shot; move narration into notes. Labels, numbering and explanatory body copy are optional, not required decorations.

An illustrative AI explainer might use: Logo introduction → actual Input prompt → Joint relationships → synthesis/result → a short list → Logo closing. This is not a fixed sequence: omit branding if explicitly unwanted, and only include relationships/transformation supported by the source. Both EN and ZH follow the same planning process.

## Animation ownership

Motion Slides means animation-ready scene construction, not PPT transitions. HTML defaults to fully visible components; do not apply generic rise/fade/stagger or hide assets behind timed reveals. Keep identity, input cursor/send, nodes, connectors and rows separate for later editing. Describe an optional action (for example “submit the question, then reveal related tools”), not a required easing, duration, scroll distance or animation range. A chosen animation Skill owns choreography, camera motion, timing, frame rendering and final motion QA.

## Planning review

- Can each selected layout be justified by the actual content relationship?
- Were Logo/Input/Joint candidates considered where their meaning exists, rather than skipped because cards were easier?
- Are missing assets surfaced, with the default Logo explicit and all replacements editable?
- Is this an editable visual storyboard, rather than paragraphs plus repeated entrances?
- Do not claim browser geometry checks can judge narrative quality. The Agent must perform this semantic review in addition to automated preflight.
