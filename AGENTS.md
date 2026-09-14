# Heistboard agent guide

## Operating rules

- Work from the single active entry in `.temp/tasks.md`; open its GitHub issue before implementation and keep only one task `IN PROGRESS`.
- Verify behavior proportionately, review both standards and issue fidelity, then make one local commit with `Refs #NUMBER`. Comment with the local SHA before closing the issue.
- Keep user images, credentials, environment files, browser data, build output, and downloaded artifacts out of Git.
- Never run `git push`, create a pull request, publish, merge, tag, release, or rewrite history. The user publishes reviewed commits.

## Context pointers

- Read `CONTEXT.md` before naming domain concepts or changing the five-stage journey and invariants.
- Read `docs/product-spec.md` when deciding scope, user behavior, accessibility, privacy, performance, or submission acceptance.
- Read `docs/architecture.md` before changing module seams, editor lifecycle, image resources, composition, provider integration, or recovery behavior.
- Read the relevant file in `docs/adr/` before revisiting a durable technical decision.
- Use `docs/qa-checklist.md` for browser, responsive, accessibility, failure, and artifact verification.

## Agent skills

### Issue tracker

Work is tracked in GitHub Issues for `agent-crafters/Heistboard`. See `docs/agents/issue-tracker.md`.

### Domain docs

Heistboard uses one domain context at the repository root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
