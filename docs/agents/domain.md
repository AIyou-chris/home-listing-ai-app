# Domain Docs

Single-context repo. One `CONTEXT.md` + `docs/adr/` at the repo root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root (if it exists)
- **`docs/adr/`** — read ADRs that touch the area you're about to work in

If either doesn't exist, proceed silently — don't flag their absence.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   └── *.md
└── src/
```

## Use the glossary's vocabulary

When naming domain concepts (in issue titles, refactor proposals, test names), use terms as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly:

> _Contradicts ADR-0001 (description) — worth reopening because…_
