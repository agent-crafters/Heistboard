# Heistboard task ledger

This is the single authoritative project task list. Status is encoded by the checkbox and one of `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`, or `CUT`. Only one implementation task may be `IN PROGRESS`.

## HB-001 — Bootstrap the repository and prove the editor export tracer bullet

- Target: 2026-09-13
- Priority: P0
- Status: [x] DONE
- Outcome: Establish repository guidance and a deployed-quality local proof that a Mission Plan can be saved, previewed, and downloaded.
- Dependencies: None
- GitHub issue: #1
- Acceptance criteria:
  - Repository instructions, `CONTEXT.md`, architecture, product spec, QA checklist, ADRs, and this ledger exist.
  - A local original map-like image loads into React Image Editor.
  - A user can draw, add a shape, add text, save, preview the exact saved output, and download it.
  - Editor load and image load failures have visible recovery states.
  - The production build passes and the downloaded file is manually inspected.

## HB-002 — Establish an early public smoke deployment from the local working tree

- Target: 2026-09-14
- Priority: P0
- Status: [x] DONE
- Outcome: Define and record deployment approach; user will manually push and upload to server, keeping automated CLI tools / git pushes out of agent control.
- Dependencies: HB-001
- GitHub issue: #2
- Acceptance criteria:
  - Hosting and deployment approach recorded; user will manually push and deploy to server.
  - Deployment does not require automated `git push` or expose secrets.
  - The editor tracer bullet verified ready for manual deployment.
  - Deployment strategy recorded.

## HB-003 — Prove the Territory search, 3D view, raster capture, and editor tracer bullet

- Target: 2026-09-14
- Priority: P0
- Status: [x] DONE
- Outcome: Prove that the proposed zero-cost provider stack can turn one submitted place search and locked 3D camera into a legally reusable raster Map Base that survives editor save.
- Dependencies: HB-001
- GitHub issue: #3
- Acceptance criteria:
  - Primary documentation is recorded for Nominatim search policy, MapLibre rendering/capture APIs, OpenFreeMap use and attribution, and OpenStreetMap Produced Work obligations.
  - One explicit-submit search returns disambiguated candidates without autocomplete, stays within the public Nominatim application-wide rate limit, and uses a replaceable endpoint.
  - One selected result opens an interactive MapLibre view with useful pitch, bearing, zoom, and approximate building extrusions where source data supports them.
  - Locking records a reproducible camera state; a fixed-ratio capture renderer produces a nonblank PNG Blob with the same framing after all visible resources load.
  - The captured Blob loads into React Image Editor, accepts one visible mark, saves as the exact Annotated Map, and reaches a representative Dossier composition with legible attribution.
  - Chromium and Firefox prove CORS-safe canvas capture, Blob encoding, cleanup, retry, and provider-failure behavior; Safari/mobile coverage or gaps are recorded honestly.
  - ADR 0006 records the evidence and is accepted, revised, or rejected before HB-004 begins.
  - An original fictional sample map remains available as fallback.
  - No production Territory implementation begins until the tracer bullet and decision are recorded.

## HB-004 — Build Territory search, composition, and camera lock

- Target: 2026-09-15
- Priority: P0
- Status: [x] DONE
- Outcome: Let a user find a place, compose a useful neighborhood-scale Territory Shot, and lock it as the raster Map Base.
- Dependencies: HB-003
- GitHub issue: #4
- Acceptance criteria:
  - City, neighborhood, street, and address searches return disambiguated results.
  - Search runs only on explicit submission and respects provider identification, throttling, attribution, privacy, and endpoint-replacement requirements.
  - User pans, zooms, pitches, and rotates the accepted stylized 3D map, with clear language that building geometry is approximate.
  - `LOCK TERRITORY` captures the selected camera at a stable aspect ratio and the exact decoded PNG Blob enters the editor.
  - Interactive and raster attribution are readable; search, map, WebGL, and capture errors recover through retry or the owned sample path.

## HB-005 — Add Identity creation

- Target: 2026-09-16
- Priority: P0
- Status: [x] DONE
- Outcome: Create a usable Identity with or without a personal portrait.
- Dependencies: HB-001
- GitHub issue: #5
- Acceptance criteria:
  - User enters a bounded alias.
  - Optional portrait upload supports validated image types and size limits.
  - Portrait crop and restrained filter save successfully.
  - A designed silhouette lets users continue without a portrait.

## HB-006 — Guide the Mission Plan inside the editor

- Target: 2026-09-16
- Priority: P0
- Status: [x] DONE
- Outcome: Make the required Mission Plan actions quick and discoverable.
- Dependencies: HB-004
- GitHub issue: #6
- Acceptance criteria:
  - The Last Delivery Operation gives four short editing prompts.
  - Required draw, shapes, and text tools are discoverable.
  - The surrounding UI does not compete with the editor.
  - The locked Map Base remains stable throughout authoring; saving produces its exact Annotated Map and a clear next action.

## HB-007 — Compose the final Dossier

- Target: 2026-09-17
- Priority: P0
- Status: [x] DONE
- Outcome: Produce the deterministic final artifact from the user's exact inputs.
- Dependencies: HB-005, HB-006
- GitHub issue: #7
- Acceptance criteria:
  - Canvas composition produces a 2400 × 1600 image.
  - Map, alias, Identity, Operation copy, fictional-use label, and verified provider attribution fit without clipping; attribution is rendered above user-authored imagery in a protected region.
  - Fonts and images finish loading before export.
  - Preview and download use the same final image.

## HB-008 — Complete workflow state and recovery

- Target: 2026-09-17
- Priority: P0
- Status: [x] DONE
- Outcome: Connect all stages without accidental data loss or leaked resources.
- Dependencies: HB-007
- GitHub issue: #8
- Acceptance criteria:
  - All five stages work in sequence.
  - Back and edit actions preserve compatible work.
  - Territory changes warn before resetting Mission Plan edits.
  - Restart clears object URLs and returns to a valid initial state.

## HB-009 — Apply the final visual system

- Target: 2026-09-18
- Priority: P0
- Status: [ ] TODO
- Outcome: Establish the original Heistboard presentation while keeping the map dominant.
- Dependencies: HB-008
- GitHub issue: —
- Acceptance criteria:
  - The experience uses charcoal, warm paper, deep petrol, faded coral, and restrained mustard accents.
  - The map remains the primary visual element.
  - Typography stays within two families plus a system monospace stack.
  - Grain, tape, shadows, and stamps do not reduce readability.

## HB-010 — Build the cinematic Reveal

- Target: 2026-09-19
- Priority: P0
- Status: [ ] TODO
- Outcome: Transition the authored map into the complete Dossier without faking generation.
- Dependencies: HB-009
- GitHub issue: —
- Acceptance criteria:
  - The exact Annotated Map from the locked Territory Shot pulls back into the Dossier without rerendering the live map.
  - Reveal completes within about two seconds and can be skipped or replayed.
  - Reduced-motion users receive a clear static transition.
  - No fake processing or generated replacement image appears.

## HB-011 — Make the critical path responsive and accessible

- Target: 2026-09-19
- Priority: P0
- Status: [ ] TODO
- Outcome: Keep the complete journey usable across input methods and small screens.
- Dependencies: HB-010
- GitHub issue: —
- Acceptance criteria:
  - The editor receives maximum usable width on small screens.
  - Keyboard focus, labels, contrast, and tap targets are usable.
  - The experience works without sound.
  - Mobile constraints do not hide save or recovery actions.

## HB-012 — Run usability tests and freeze features

- Target: 2026-09-20
- Priority: P0
- Status: [ ] TODO
- Outcome: Validate speed and comprehension, then protect the remaining schedule.
- Dependencies: HB-011
- GitHub issue: —
- Acceptance criteria:
  - Five people attempt the flow without live explanation.
  - At least four complete a Dossier in under five minutes.
  - Repeated confusion is fixed or documented.
  - Feature freeze is recorded at 18:00 UTC and all remaining P1 work is cut unless P0 is stable.

## HB-013 — Harden failures, privacy, and performance

- Target: 2026-09-21
- Priority: P0
- Status: [ ] TODO
- Outcome: Make the frozen critical path safe and resilient under realistic constraints.
- Dependencies: HB-012
- GitHub issue: —
- Acceptance criteria:
  - Large uploads are bounded and normalized.
  - External failures provide retry or sample-path recovery.
  - Raw place queries, exact coordinates, provider payloads, and portraits are not logged, analyzed, persisted, or placed in public URLs.
  - Search is explicit-submit only, duplicate requests are bounded in memory, public Nominatim traffic is throttled application-wide, and provider endpoints remain replaceable.
  - Object URLs, MapLibre instances, WebGL contexts, temporary capture containers, and large canvases are released.
  - Critical-path performance is acceptable on a mid-range phone and desktop.

## HB-014 — Complete browser and export QA

- Target: 2026-09-21
- Priority: P0
- Status: [ ] TODO
- Outcome: Establish honest release confidence in the supported browsers and artifact.
- Dependencies: HB-013
- GitHub issue: —
- Acceptance criteria:
  - Critical path is checked in current Chromium, Firefox, Safari where available, and a real mobile browser.
  - Each available browser is checked for WebGL startup, vector/style loading, camera lock fidelity, missing tiles, nonblank fixed-ratio canvas capture, Blob decoding, and editor ingestion.
  - Downloaded PNG dimensions, locked-shot continuity, attribution, and readability are inspected independently.
  - No completion-blocking defects remain.
  - Known limitations are recorded honestly.

## HB-015 — Create the demo and repository presentation

- Target: 2026-09-22
- Priority: P0
- Status: [ ] TODO
- Outcome: Explain the product and show authentic authoring clearly to judges and developers.
- Dependencies: HB-014
- GitHub issue: —
- Acceptance criteria:
  - A 30–60 second trailer shows location, portrait, real editor actions, Reveal, and download.
  - README explains the product, editor integration, architecture, setup, limitations, credits, and privacy behavior.
  - Screenshots, asset licenses, and attribution are complete.
  - The demo remains understandable when muted.

## HB-016 — Verify production and prepare the user push handoff

- Target: 2026-09-23
- Priority: P0
- Status: [ ] TODO
- Outcome: Confirm production readiness and hand the exact unpublished history to the user.
- Dependencies: HB-015
- GitHub issue: —
- Acceptance criteria:
  - Production links work without login.
  - Map quota and hosting status are checked.
  - Local branch is clean and all required commits are present.
  - Provide the user with the exact branch and local commits that must be pushed, but do not run `git push`.

## HB-017 — Prepare and verify the challenge submission

- Target: 2026-09-23
- Priority: P0
- Status: [ ] TODO
- Outcome: Submit verified public links with one day reserved for critical availability fixes.
- Dependencies: HB-016
- GitHub issue: —
- Acceptance criteria:
  - Public repository requirement is verified after the user pushes.
  - Deployment, repository, demo, and submission links work from a clean session.
  - Submission receipt or confirmation is retained.
  - September 24 is reserved for availability checks and critical fixes only.
