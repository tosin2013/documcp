# Data model: v2.0 foundation

No stored data. The item's artifacts:

| Artifact | Fields | Rules |
|---|---|---|
| Skill (`skills/<name>/SKILL.md`) | frontmatter `name`, `description`; body sections per [contracts/skill.md](contracts/skill.md) | `name` = folder name; tool names and parameters exist in `TOOLS` |
| Gap log (written by the agent following the skill) | entries: step, what was missing, what the agent did | one entry per improvisation |
| Verdict memo (`docs/research/standalone-cli-verdict.md`) | the sections in [contracts/verdict-memo.md](contracts/verdict-memo.md) | one recommendation; links #126 and ADR-0017 |
