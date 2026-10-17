# Cross-agent use and invocation rights

The portable entrypoint is `SKILL.md` in the complete **aident-ppt-skill** package. Preserve references, templates, helper scripts, assets and license notices; copying only the main prompt is not a complete installation. Resolve relative links from the containing document, not from the user's output folder.

## Host setup

```bash
npx skills add edward-skills/aident-ppt-skill --skill aident-ppt-skill
```

Choose the host in the installer. An optional explicit project installation is:

```bash
npx skills add edward-skills/aident-ppt-skill --skill aident-ppt-skill \
  --agent codex claude-code cursor opencode
```

`agents/openai.yaml`, when present, is optional host UI metadata. Other hosts should follow the same workflow. Installation compatibility does not certify equal production quality or grant external account access.

## Meta Muse AI and Grok Bot

[Meta Muse AI](https://ai.meta.com/muse/) describes a personal computer/browser and tool-building capabilities. Complete-package native import and automatic activation have not been production-tested for this Skill. Do not conflate it with [Muse Code's filesystem skill support](https://meta-models.github.io/muse-code-sdk/next/guides/extend/skills/).

[Grok Bot's official documentation](https://docs.x.ai/grok-bot/skills-routines-and-automations) describes custom workflows, a private Skill library and `/` invocation. Complete supporting-file import still needs verification in the actual account. These are documentation-based capability notes dated 2026-10-17, not completed runs on either product.

A portable request for a personal Agent:

```text
Obtain the complete aident-ppt-skill Skill package from
https://github.com/edward-skills/aident-ppt-skill.
Read SKILL.md and the referenced modules needed for my task; do not replace the
workflow with a summary or omit its scripts, templates, assets and checks.
Use your available capabilities and authorized accounts to carry out my request.
Respect the original approval, source, delivery and verification requirements.
If a required capability is unavailable, name the missing stage and deliver only
what has actually been produced and verified. Keep the Skill private to my own
invocation environment; do not republish or share its package as a public Skill.
```

## Required capabilities for this Skill

Node.js and the bundled fonts/assets; a browser for actual visual QA; optional export adapters only for requested formats.

Produce the requested deck or Motion Slides using packaged rules. Do not describe unrendered scenes or an unavailable export as a finished file.

Existing tool-routing preferences, paid-action boundaries and user-requested destinations remain in force. An account connector being visible does not prove access or grant permission to publish, send or change data.

## Rights

Current first-party materials use the [invocation-only license](../LICENSE.md). Installing and invoking for personal or client projects is permitted; generated outputs may be used normally subject to embedded third-party rights. Skill redistribution, resale, derivative Skill publication and offering the Skill itself as a hosted service are not authorized. See [licensing history](licensing-history.md) for the version boundary; this update does not purport to revoke past MIT grants. Fonts and other separately licensed materials retain their licenses.
