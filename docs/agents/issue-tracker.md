# Issue tracker: GitHub

Issues for this repository live at `https://github.com/agent-crafters/Heistboard/issues`. Use the `gh` CLI for every issue operation and infer the repository from `origin` when available.

## Conventions

- Create an issue from a body file immediately before its reviewable slice begins.
- Read with `gh issue view <number> --comments`; list with structured JSON when filtering is needed.
- Comment with `gh issue comment <number> --body-file <path>` and close with `gh issue close <number>`.
- Each implementation commit uses `Refs #NUMBER`; local commits do not use automatic-close wording.
- Pull requests are not a request or triage surface.
