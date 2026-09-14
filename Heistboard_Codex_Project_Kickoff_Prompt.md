# Heistboard - Codex Project Kickoff Prompt

Build the first reviewable vertical slice for the Unlayer React Image Editor Challenge.

- Start date: 13 September 2026
- Deadline: 24 September 2026 at 23:59 UTC

*Planning artifact - contains instructions only, no application code*

## How to use this document

Open Codex in the root of the Heistboard repository, then paste the full text under Copy-paste prompt into a new session. The prompt is written to work with either an empty repository or an existing scaffold.

> **First session boundary**

> The first session should finish only HB-001: repository and documentation bootstrap plus a deployed-quality local proof of map editing, preview, and download. It must not begin Mapbox integration or final visual design.

> **Git rule**

> Codex may create and close GitHub issues through the `gh` CLI and may create local commits. It must never run `git push`, `gh pr create`, or any command that publishes code. The user will push later.

## Assumptions encoded in the prompt

- The current directory is intended to become or already is the project repository.
- A GitHub remote and authenticated gh CLI may already exist. If either is missing, Codex must ask one focused question instead of inventing a repository.
- The existing package manager wins. An empty repository defaults to pnpm.
- The project uses a single domain context with CONTEXT.md at the root and ADRs in docs/adr/.
- The project-level task ledger is .temp/tasks.md and is committed to Git despite its directory name.
- GitHub issues represent vertical slices. They do not mirror every small checkbox.

## Selected Matt Pocock skills

| **Skill**                | **Use in Heistboard**                                                           |
|--------------------------|---------------------------------------------------------------------------------|
| setup-matt-pocock-skills | One-time repository configuration for GitHub issues and domain documentation.   |
| writing-for-agents       | Keep AGENTS.md, CONTEXT.md, ADRs, and tickets concise and behavioral.           |
| domain-modeling          | Create shared product language and record durable decisions.                    |
| codebase-design          | Keep the editor, workflow, composition, and provider boundaries deep and small. |
| implement                | Deliver one issue-sized vertical slice per run.                                 |
| tdd                      | Test durable seams such as workflow state and composition rules.                |
| code-review              | Review both engineering standards and fidelity to the originating issue.        |
| diagnosing-bugs          | Use a reproduce-to-regression loop for editor, canvas, and browser failures.    |

**Official source:** [mattpocock/skills](https://github.com/mattpocock/skills)

## Copy-paste prompt

Paste everything from BEGIN PROMPT through END PROMPT into Codex.

---

## BEGIN PROMPT

You are starting the Heistboard project. Work in the current repository and complete the first vertical slice described below.

### 1. Role and operating mode

Act as the lead product engineer for Heistboard. Make pragmatic decisions, protect the deadline, and complete reviewable work instead of stopping at a plan. This prompt authorizes local file creation, dependency installation, GitHub issue creation and closure through gh, verification, and local commits within the current repository.

Today is 13 September 2026. The Unlayer Build with React Image Editor Challenge ends on 24 September 2026 at 23:59 UTC. Optimize for creativity, visual execution, meaningful React Image Editor use, reliability, and polish.

The first run has a strict boundary: bootstrap the repository and documentation, then complete HB-001, the React Image Editor export tracer bullet. Stop after HB-001 is verified, committed locally, and its GitHub issue is closed. Do not begin the map provider, portrait, final visual system, or cinematic reveal in this run.

### 2. Non-negotiable Git and GitHub rules

- Never run git push, gh pr create, git reset --hard, git clean -fd, or any history-rewriting command.
- Never publish code, create a pull request, merge, tag, or release. The user will push local commits later.
- Use the gh CLI for GitHub issue operations. Do not use a browser or manually construct GitHub API calls.
- Inspect git status before changing anything. Preserve all unrelated files, staged changes, and user work.
- Never commit credentials, API keys, environment files, generated browser data, build output, or user-uploaded images.
- Create one GitHub issue for each reviewable vertical slice immediately before implementation. Do not create all future issues at once.
- Each issue must state the task ID, problem, scope, acceptance criteria, verification plan, documentation impact, and exclusions.
- After the slice passes review and verification, update .temp/tasks.md, create one local commit referencing the issue with Refs \#NUMBER, obtain the short local SHA, add a gh issue comment saying the implementation is in that local commit and has not been pushed, then close the issue with gh issue close.
- Do not use Closes \#NUMBER in the local commit message because no push will occur and automatic remote closure would be misleading.
- Before closing an issue, ensure git status contains no accidental files and the issue acceptance criteria have been satisfied.

If gh is unauthenticated, no GitHub remote exists, or the current remote cannot be resolved, finish read-only repository inspection and ask one focused question. Do not create a new remote repository, guess an owner, or push an initial branch.

### 3. Matt Pocock engineering skills

Use Matt Pocock's official skills from https://github.com/mattpocock/skills. First inspect which skills are already available. If the required set is absent, run the official installer npx skills@latest add mattpocock/skills, target Codex, and select only the following skills:

- setup-matt-pocock-skills
- writing-for-agents
- domain-modeling
- codebase-design
- implement
- tdd
- code-review
- diagnosing-bugs

Do not install both the Claude plugin and the skills.sh version. Do not reinstall skills already present. If the installer creates project files, inspect them and keep only the selected skill set and required license material.

Run setup-matt-pocock-skills once with these already-decided answers: use GitHub Issues through the existing GitHub remote; use a single domain context; keep CONTEXT.md at the repository root; keep ADRs under docs/adr/; point AGENTS.md to the supporting documents; do not create or redesign triage labels.

Treat this prompt as the explicit user invocation of the implement workflow for HB-001. Apply writing-for-agents when creating instructions and documentation, domain-modeling when defining shared terms and ADRs, codebase-design when selecting module boundaries, tdd only at meaningful seams, code-review before the commit, and diagnosing-bugs only when a reproducible failure exists.

If code-review expects parallel reviewers and the environment cannot provide them, perform the standards review and specification review as two separate passes. Do not skip either axis.

### 4. Product context

Product name: Heistboard

Tagline: Your neighborhood. Your next fictional mission.

One-sentence product: Heistboard turns a familiar neighborhood into a personalized fictional mission dossier through user-authored map editing.

User fantasy: I turned streets I recognize and my own identity into a cinematic fictional mission file.

Core interaction: the user marks a mission on a neighborhood map inside React Image Editor by drawing a route, marking two locations, and adding one short note.

First scenario: The Last Delivery. A mysterious fictional package needs to reach a meeting point before sunrise. The user identifies the pickup, draws a route, marks the meeting point, and adds a personal note.

Final artifact: one 2400 by 1600 landscape PNG containing the annotated map, alias, optional portrait or silhouette, short mission brief, fictional-use label, and map attribution where required.

Primary payoff: when editing ends, the exact annotated map pulls back into the complete dossier. Never replace the user's work with an automatically generated image.

### 5. Challenge requirements and design guardrails

- The experience must be inspired by open-world crime fiction and tropical nightlife without copying GTA or Rockstar branding, characters, maps, logos, UI, typography, soundtrack, or copyrighted assets.
- React Image Editor must be central. Removing it must destroy the main interaction.
- Users must meaningfully customize at least one visual. Drawing the route, shapes, and text on the territory map is the primary customization.
- The completed project must eventually have a public deployment and public GitHub repository, but this Codex agent is permanently forbidden from pushing code.
- The ideal experience lasts 2 to 5 minutes and contains five stages: open the file, choose territory, add identity, mark the plan, reveal and export.
- Use an original visual universe built from crime thrillers, paper dossiers, surveillance, street culture, and restrained tropical nightlife.

### 6. Ruthless scope

P0 consists of territory selection, one map style, one scenario, alias, optional portrait, mission editing, fixed dossier composition, short reveal, PNG download, sample path, recovery states, usable small-screen layout, documentation, deployment, and submission assets.

Do not build authentication, a database, accounts, cloud storage, multiplayer, a public gallery, AI generation, real route calculation, live police or traffic data, 3D maps, game simulation, arbitrary dossier layout editing, or multiple export formats.

P1 features may begin only after the feature freeze checklist is satisfied: verified custom editor stickers, two extra scenarios, optional sound, before-and-after comparison, and native file sharing.

P2 features are alternate map treatment, portrait export, and local draft restoration. Remove them immediately if a P0 item slips.

### 7. Technical direction

- Use the existing framework and package manager when present. For an empty repository, use a current stable Next.js App Router project with strict TypeScript and pnpm.
- Use @unlayer/react-image-editor as the editing surface. It is client-side and requires React 18 or newer.
- Enable only the editor tools the experience needs. P0 uses draw, shapes, text, crop for the portrait, and restrained filters. Decide the tool configuration before mounting so edits are not lost through remounts.
- The documented editor output is a flattened image. Do not promise editable project restoration, custom sticker injection, or layer serialization unless the installed version proves those capabilities through supported APIs.
- Keep workflow state in a small typed reducer or equivalent explicit state machine. Do not add a state library unless the reducer becomes demonstrably inadequate.
- Use Browser Canvas 2D for deterministic final composition. Do not screenshot the DOM to generate the dossier.
- Keep editor images and generated Blobs outside serializable form state. Revoke object URLs when replaced or no longer needed.
- Use Mapbox geocoding and Static Images as the current candidate for later territory work. The provider boundary must accept a location query and return a display label, coordinates, and editable image input. Do not implement it in HB-001.
- Map attribution must remain legible in the application and final artifact where required. Confirm edited-download and public-sharing rights before accepting the provider ADR.
- No persistent backend is required for P0. Keep portraits, maps, and final dossiers client-side except for documented map-provider requests.
- Use CSS for ordinary motion. Add one animation library later only if it materially improves the reveal and reduces implementation effort.

### 8. Domain language and invariants

Use these terms consistently in documentation, file names, types, UI copy, tests, and issues:

- Territory: The confirmed geographic area shown as the base map.
- Map Base: The unedited raster map loaded into React Image Editor.
- Mission Plan: The route, marks, shapes, labels, and note authored by the user.
- Annotated Map: The flattened image returned after the user saves the Mission Plan.
- Identity: Alias plus optional edited portrait, with a silhouette fallback.
- Operation: The fictional scenario and user-selected title.
- Dossier: The fixed final composition containing the Annotated Map, Identity, Operation, and attribution.
- Reveal: The short transition from saved editor output to the complete Dossier.

Record and protect these invariants:

- The Dossier always uses the exact Annotated Map the user saved.
- Changing Territory after mission editing requires an explicit warning because it resets the Mission Plan.
- A missing portrait never blocks completion.
- The preview and downloaded PNG are generated from the same final image.
- Map attribution remains legible and is not covered by the composition.
- The product never claims to calculate a real or safe route.
- A failed external map request does not block the owned sample-map path.

### 9. Required repository documentation

Create or update these files before implementation. Preserve existing useful content and avoid duplicating rules across files:

- AGENTS.md: Short operating rules and context pointers. Include the no-push rule, issue workflow, task-ledger location, verification expectation, and when to read each project document.
- CONTEXT.md: Product purpose, five-stage journey, ubiquitous language, invariants, scope boundaries, and deadline.
- docs/product-spec.md: User experience, P0 acceptance criteria, P1 and P2 boundaries, accessibility, privacy, performance, and submission constraints.
- docs/architecture.md: Module boundaries, data flow, editor lifecycle, image and Blob lifecycle, composition pipeline, provider boundary, failure states, and deployment assumptions.
- docs/qa-checklist.md: Manual critical path, output inspection, browser coverage, responsive behavior, accessibility, failure recovery, and pre-submission checks.
- docs/adr/0001-react-image-editor-is-the-core-authoring-surface.md: Accept the editor as the primary map-authoring surface and document its flattened-output boundary.
- docs/adr/0002-use-static-2d-territory-images.md: Accept a static 2D image workflow and reject interactive 3D capture for the deadline.
- docs/adr/0003-compose-the-dossier-in-browser-canvas.md: Accept deterministic Canvas 2D composition and a 2400 by 1600 PNG output.
- docs/adr/0004-avoid-persistent-user-data-for-p0.md: Accept client-side session data and reject authentication, database storage, and galleries.
- docs/adr/0005-isolate-map-provider-and-owned-fallback.md: Keep this ADR proposed until map usage and export conditions are verified. Define the provider boundary and original sample-map fallback.
- .temp/tasks.md: The single authoritative project-level task ledger described below.

Every ADR must contain title, status, date, context, decision, alternatives considered, consequences, risks, and reversal trigger. Use Proposed for unresolved decisions and Accepted only when evidence supports them.

The documentation describes decisions and behavior. Do not fill it with framework tutorials, speculative future systems, or copied text from this prompt.

### 10. The .temp/tasks.md contract

- .temp/tasks.md is the only complete project task list. Other documents may describe milestones but must not contain a competing full checklist.
- The file must be version-controlled. If .temp is ignored, add the narrowest .gitignore exception necessary to include .temp/tasks.md while keeping disposable files ignored.
- Each task entry contains ID, target date, priority, status checkbox, outcome, acceptance criteria as ordinary bullets, dependency IDs, GitHub issue number when opened, and a short result note when completed.
- Allowed state is encoded by checkbox plus a status word: TODO, IN PROGRESS, BLOCKED, DONE, or CUT.
- Only one implementation task may be IN PROGRESS at a time.
- Before starting work, update the selected task to IN PROGRESS and record the issue number. Before the local commit, change it to DONE only when acceptance criteria pass.
- New work discovered during implementation goes into this ledger before it is started. Do not silently expand the current issue.
- Issue bodies may repeat the current slice's acceptance criteria, but they must not duplicate the full project ledger.

### 11. Initial task ledger to write

Create .temp/tasks.md with the following tasks and acceptance criteria. Keep this order unless a documented dependency forces a change.

#### HB-001 - Bootstrap the repository and prove the editor export tracer bullet

- Target: Sep 13, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: None
- Acceptance criteria:
  - Repository instructions, CONTEXT.md, architecture, product spec, QA checklist, ADRs, and this ledger exist.
  - A local original map-like image loads into React Image Editor.
  - A user can draw, add a shape, add text, save, preview the exact saved output, and download it.
  - Editor load and image load failures have visible recovery states.
  - The production build passes and the downloaded file is manually inspected.

#### HB-002 - Establish an early public smoke deployment from the local working tree

- Target: Sep 14, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-001
- Acceptance criteria:
  - A hosting target is selected from tools already available to the user.
  - Deployment does not require git push or expose secrets.
  - The editor tracer bullet works from a clean browser session.
  - Deployment URL and rollback method are recorded.

#### HB-003 - Validate map-provider usage and export architecture

- Target: Sep 14, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-001
- Acceptance criteria:
  - Primary provider documentation is reviewed for search, static image, attribution, caching, and edited-download use.
  - Mapbox is accepted or rejected in ADR 0005 with evidence.
  - An original fictional sample map remains available as fallback.
  - No provider implementation begins until the decision is recorded.

#### HB-004 - Build territory search and confirmation

- Target: Sep 15, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-003
- Acceptance criteria:
  - City, neighborhood, street, and address searches return disambiguated results.
  - User confirms a result and chooses from two useful area scales.
  - A styled static map enters the editor at a stable aspect ratio.
  - Attribution is readable and errors recover gracefully.

#### HB-005 - Add identity creation

- Target: Sep 16, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-001
- Acceptance criteria:
  - User enters a bounded alias.
  - Optional portrait upload supports validated image types and size limits.
  - Portrait crop and restrained filter save successfully.
  - A designed silhouette lets users continue without a portrait.

#### HB-006 - Guide the mission plan inside the editor

- Target: Sep 16, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-004
- Acceptance criteria:
  - The Last Delivery scenario gives four short editing prompts.
  - Required draw, shapes, and text tools are discoverable.
  - The surrounding UI does not compete with the editor.
  - Saving produces the Annotated Map and a clear next action.

#### HB-007 - Compose the final dossier

- Target: Sep 17, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-005, HB-006
- Acceptance criteria:
  - Canvas composition produces a 2400 by 1600 image.
  - Map, alias, identity, operation copy, fictional-use label, and attribution fit without clipping.
  - Fonts and images finish loading before export.
  - Preview and download use the same final image.

#### HB-008 - Complete workflow state and recovery

- Target: Sep 17, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-007
- Acceptance criteria:
  - All five stages work in sequence.
  - Back and edit actions preserve compatible work.
  - Territory changes warn before resetting mission edits.
  - Restart clears object URLs and returns to a valid initial state.

#### HB-009 - Apply the final visual system

- Target: Sep 18, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-008
- Acceptance criteria:
  - The experience uses charcoal, warm paper, deep petrol, faded coral, and restrained mustard accents.
  - The map remains the primary visual element.
  - Typography stays within two families plus a system monospace stack.
  - Grain, tape, shadows, and stamps do not reduce readability.

#### HB-010 - Build the cinematic reveal

- Target: Sep 19, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-009
- Acceptance criteria:
  - The exact Annotated Map pulls back into the Dossier.
  - Reveal completes within about two seconds and can be skipped or replayed.
  - Reduced-motion users receive a clear static transition.
  - No fake processing or generated replacement image appears.

#### HB-011 - Make the critical path responsive and accessible

- Target: Sep 19, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-010
- Acceptance criteria:
  - The editor receives maximum usable width on small screens.
  - Keyboard focus, labels, contrast, and tap targets are usable.
  - The experience works without sound.
  - Mobile constraints do not hide save or recovery actions.

#### HB-012 - Run usability tests and freeze features

- Target: Sep 20, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-011
- Acceptance criteria:
  - Five people attempt the flow without live explanation.
  - At least four complete a dossier in under five minutes.
  - Repeated confusion is fixed or documented.
  - Feature freeze is recorded at 18:00 UTC and all remaining P1 work is cut unless P0 is stable.

#### HB-013 - Harden failures, privacy, and performance

- Target: Sep 21, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-012
- Acceptance criteria:
  - Large uploads are bounded and normalized.
  - External failures provide retry or sample-path recovery.
  - Exact locations and portraits are not logged or placed in public URLs.
  - Object URLs and large canvases are released.
  - Critical-path performance is acceptable on a mid-range phone and desktop.

#### HB-014 - Complete browser and export QA

- Target: Sep 21, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-013
- Acceptance criteria:
  - Critical path is checked in current Chromium, Firefox, Safari where available, and a real mobile browser.
  - Downloaded PNG dimensions and readability are inspected.
  - No completion-blocking defects remain.
  - Known limitations are recorded honestly.

#### HB-015 - Create the demo and repository presentation

- Target: Sep 22, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-014
- Acceptance criteria:
  - A 30 to 60 second trailer shows location, portrait, real editor actions, reveal, and download.
  - README explains the product, editor integration, architecture, setup, limitations, credits, and privacy behavior.
  - Screenshots, asset licenses, and attribution are complete.
  - The demo remains understandable when muted.

#### HB-016 - Verify production and prepare the user push handoff

- Target: Sep 23, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-015
- Acceptance criteria:
  - Production links work without login.
  - Map quota and hosting status are checked.
  - Local branch is clean and all required commits are present.
  - Provide the user with the exact branch and local commits that must be pushed, but do not run git push.

#### HB-017 - Prepare and verify the challenge submission

- Target: Sep 23, 2026
- Priority: P0
- Status: [ ] TODO
- Dependencies: HB-016
- Acceptance criteria:
  - Public repository requirement is verified after the user pushes.
  - Deployment, repository, demo, and submission links work from a clean session.
  - Submission receipt or confirmation is retained.
  - September 24 is reserved for availability checks and critical fixes only.

### 12. Issue workflow for every task

For the selected task, use this sequence:

- Read AGENTS.md, CONTEXT.md, the relevant ADRs, the product spec, architecture, QA checklist, and .temp/tasks.md.
- Inspect git status, current branch, remotes, gh authentication, package manager, existing scripts, and existing tests.
- Confirm that all dependencies named by the task are DONE.
- Create the GitHub issue through gh. Use a body file for multiline content. Record the issue number in .temp/tasks.md and mark the task IN PROGRESS.
- Define the observable seams that deserve tests. Avoid tests that simply repeat implementation or third-party behavior.
- Implement the smallest vertical slice that satisfies the issue. Do not include adjacent future tasks.
- Run focused checks while working. Run the full required quality gate once after the slice is complete.
- Use diagnosing-bugs for reproducible failures rather than applying speculative fixes.
- Run code-review as separate Standards and Spec passes from the pre-task commit. Fix material findings and rerun only the affected checks.
- Manually verify visual or browser behavior the automated checks cannot establish.
- Update documentation and .temp/tasks.md, mark the task DONE, and create one local commit with a conventional message plus Refs \#NUMBER.
- Comment on the issue with the short local SHA, verification summary, and the sentence: This implementation is committed locally and has not been pushed under project policy.
- Close the issue through gh. Report the issue URL, local commit SHA, tests, manual checks, remaining risks, and git status.

### 13. First-session issue: HB-001

Create one issue titled: HB-001 Prove the React Image Editor export pipeline

The issue must cover repository bootstrap, required documentation, task ledger, and the first end-to-end editor slice. Use an original local map-like asset created for this repository. Do not use Google, Mapbox, OpenStreetMap tiles, GTA assets, or copied game artwork in this proof.

HB-001 implementation sequence:

- Inspect the repository and preserve its existing structure. If it is empty, scaffold the smallest current stable Next.js App Router application using TypeScript, pnpm, linting, and a src directory.
- Create the documentation and ADR structure before application implementation. Keep AGENTS.md brief and pointer-driven.
- Create and populate .temp/tasks.md from the ledger in this prompt, then mark HB-001 IN PROGRESS with its issue number.
- Install @unlayer/react-image-editor and inspect the installed package API and peer requirements. Record material differences from the public documentation.
- Create one original local raster or SVG-derived map-like image with clear roads, blocks, water or park areas, and enough contrast to expose drawing problems.
- Build one focused proof screen. It needs the image editor, a short prompt, save and cancel handling, visible load-error recovery, saved-image preview, and download action.
- Verify that a person can draw a route, add a shape, add text, save, preview the exact result, and download it.
- Inspect the actual downloaded file for dimensions, text readability, missing regions, unexpected transparency, and color changes.
- Confirm that a second editing attempt works and that object URLs or generated resources are released correctly.
- Run the production build, typecheck, lint, and meaningful tests. Do not create shallow tests that mock the editor and merely assert that a component rendered.
- Run the two-axis code review, fix material findings, mark HB-001 DONE, commit locally, comment, and close the issue.

### 14. HB-001 acceptance and stop conditions

HB-001 is complete only when all of the following are true:

- The app starts and builds using documented commands.
- The editor loads an original local map-like input.
- Draw, shapes, and text all work in an actual browser session.
- Save produces a flattened result that appears in a preview outside the editor.
- Download produces a usable image file and the actual file has been inspected.
- Editor failure and image failure are visible and recoverable.
- The required documentation, ADRs, and .temp/tasks.md exist and agree with the implementation.
- The full local quality gate passes.
- The GitHub issue is closed after one verified local commit, with the local-only status stated in the issue comment.
- git status is clean except for pre-existing user changes that were deliberately preserved and reported.

Stop after reporting HB-001. Do not start HB-002 or any later task, even if time remains. The user will review the tracer bullet before the project commits to mapping and visual polish.

### 15. Quality strategy

- Test behavior at public seams: workflow transitions, upload validation, deterministic composition input, file naming, and download output.
- For third-party canvas editing, prefer one real-browser smoke path and manual output inspection over extensive mocks.
- Use TypeScript strictness and explicit domain types. Avoid stringly typed workflow states.
- Treat visual QA as a required test. Check the actual artifact at full size and reduced social-feed size.
- Do not broaden testing after the documented risks are sufficiently covered.
- Record known browser or editor limitations rather than hiding them behind fake fallbacks.

### 16. Visual direction for later tasks

Use this direction as a constraint, not as HB-001 work: charcoal \#14191A, warm ivory \#E7DFCB, deep petrol \#183E43, faded coral \#EF7866, restrained mustard \#D1B365. Favor paper, ink, street markings, evidence sleeves, and subtle grain. Keep the map dominant. Avoid a generic neon-gradient dashboard, dense HUD overlays, excessive glass, fake data panels, and copied game typography.

### 17. Security, privacy, and provider boundaries

- Never expose server-only credentials in client bundles. Public map tokens must use provider restrictions appropriate to the deployed origin.
- Validate uploaded image type and size. Do not trust file extension alone.
- Do not fetch arbitrary user-supplied URLs through a server endpoint.
- Do not store user portraits or exact locations for P0.
- Do not log image data URLs, Blobs, exact addresses, tokens, or personal images.
- Do not claim images stay fully local until network behavior of the editor and supporting services is verified.
- A location-based creative tool can reveal where someone lives. Default later territory views to neighborhood scale and let users inspect the artifact before download.

### 18. Questions and escalation

Ask the user only when the answer changes repository ownership, GitHub remote, credentials, provider contract, destructive action, or a product decision not settled here. Ask one concise question at a time after completing all safe local investigation.

Do not stop for ordinary implementation choices. Record reversible technical choices in architecture documentation and proceed. If a selected dependency cannot support a required behavior, demonstrate the limitation, update the relevant ADR to Proposed or Rejected, record the blocker in .temp/tasks.md, and present the smallest viable fallback.

### 19. Required final report for the first session

After HB-001, report:

- Outcome in one sentence.
- Issue number and URL.
- Local commit short SHA and commit message.
- Files and documentation created or changed.
- Automated checks and their results.
- Manual editor and downloaded-image checks.
- Any preserved pre-existing changes.
- Remaining risks that HB-003 must resolve.
- Current git status and an explicit statement that no code was pushed.

## END PROMPT

Begin with repository inspection, skill availability, GitHub remote and `gh` authentication checks. Then execute HB-001 to completion.

---

## Reference links

- [Matt Pocock engineering skills](https://github.com/mattpocock/skills)
- [Unlayer React Image Editor](https://github.com/unlayer/react-image-editor)
- [Official challenge announcement](https://www.linkedin.com/posts/unlayer_builtwithimageeditor-activity-7501266371553452032-RB8U)
- [Mapbox Static Images API](https://docs.mapbox.com/api/maps/static-images/)
- [Mapbox attribution guidance](https://docs.mapbox.com/help/dive-deeper/attribution/)

> **Repository publication warning**

> The challenge eventually requires a public GitHub repository. Because this prompt forbids Codex from pushing, the user must push the reviewed local commits before submission and then verify the public repository from a signed-out browser session.
