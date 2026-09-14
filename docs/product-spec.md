# Heistboard product specification

## Product promise

**Tagline:** Your neighborhood. Your next fictional mission.

Heistboard lets a person turn streets they recognize and their chosen Identity into an original cinematic mission file. React Image Editor is the core authoring surface: removing it removes the product's main interaction.

The Territory promise is: **Find a place, compose the Territory, lock the shot, then plan the mission.** The interactive map is a short composition step; the locked raster Map Base is what the user authors on.

## Primary experience

The first Operation, **The Last Delivery**, asks the user to identify a pickup, draw a route, mark a meeting point, and add a short note before sunrise. The journey should take two to five minutes:

1. Open the file and understand the fictional-use premise.
2. Search for a Territory, compose a useful neighborhood-scale 3D view, and lock the Territory Shot.
3. Add an alias and optionally crop and filter a portrait.
4. Author the Mission Plan on the Map Base with draw, shapes, and text.
5. Reveal, inspect, and download a 2400 × 1600 landscape PNG Dossier.

## P0 acceptance

- One reliable search, interactive Territory composition, camera lock, raster capture, sample-map fallback, and recovery path.
- Identity works with a bounded alias and either a validated portrait or designed silhouette.
- Mission Plan guidance makes draw, shapes, and text discoverable without competing with the editor.
- The exact saved Annotated Map appears in the fixed Dossier with Operation copy, Identity, fictional-use label, and required attribution.
- Reveal is brief, skippable or replayable, and honors reduced motion.
- Preview and download use the same final image; export is a readable 2400 × 1600 PNG.
- Critical actions remain usable on small screens and in supported current browsers.
- Documentation, deployment, demo, licenses, attribution, and honest limitations are ready for submission.

## Priority boundaries

P1 may begin only after the feature-freeze checklist passes: verified custom editor stickers, two additional Operations, optional sound, before/after comparison, and native file sharing. P2 is alternate map treatment, portrait export, and local draft restoration; cut it whenever P0 slips.

Authentication, accounts, databases, cloud storage, multiplayer, galleries, AI generation, real route calculation, live police or traffic data, photorealistic 3D reconstruction, satellite or street-level imagery, a live map inside the editor, simulations, arbitrary Dossier layout editing, and multiple export formats are excluded.

## Experience and visual guardrails

The universe may draw from crime thrillers, paper dossiers, cinematic intelligence files, street culture, and restrained tropical nightlife. It must not copy GTA or Rockstar names, branding, characters, maps, artwork, typography, UI, or audio. The map remains dominant; visual texture must preserve readability. Territory language and visuals stay clearly fictional: the product does not present precise building models, surveillance capability, navigation, operational advice, or safety claims.

## Accessibility

- Every non-decorative control has a visible name, keyboard focus, and usable target size.
- Status, errors, and recovery do not rely on color alone; focus moves or is announced when workflow context changes.
- Editing and export work without sound, and motion respects `prefers-reduced-motion`.
- Small screens retain save, cancel, retry, and navigation actions without obscuring the editor.

## Privacy and security

- Portraits, place-search queries, exact coordinates, image payloads, tokens, and Blobs are not logged or persisted for P0.
- Search requests occur only after explicit submission; P0 does not implement typeahead or autocomplete against a public geocoder.
- Search results and camera state live only for the current browser session, except for bounded in-memory request deduplication needed to respect provider limits.
- Uploaded images are validated by decoded type and bounded size, not extension alone.
- Provider endpoints are replaceable without a client release. Public provider tokens, if a later adapter needs them, use origin restrictions; server-only credentials never enter client bundles.
- The product does not claim fully local processing until editor and provider network behavior is verified.
- Neighborhood scale is the default, and users inspect the artifact before download.

## Performance

Keep the critical path acceptable on a mid-range phone and desktop. Load the client-only editor only when needed, bound input images and canvas allocation, release object URLs and large canvases, and avoid dependencies that do not materially improve the P0 experience.

## Submission constraints

The final project requires a public deployment and public GitHub repository, a muted-readable 30–60 second demo, setup and architecture documentation, screenshots, licenses, and attribution. Codex creates local commits only; the user pushes reviewed work.
