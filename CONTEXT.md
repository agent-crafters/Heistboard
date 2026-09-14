# Heistboard

Heistboard turns a familiar neighborhood into a personalized fictional mission dossier through user-authored map editing. The challenge deadline is 24 September 2026 at 23:59 UTC.

## Journey

The two-to-five-minute journey has five stages: open the file, choose Territory, add Identity, mark the Mission Plan, then Reveal and export the Dossier. In the Territory stage, the user finds a place, composes the Territory, locks the shot, then plans the mission.

## Language

**Territory**: The geographic area the user searches for and composes as a stylized map view.
_Avoid_: Location, area selection

**Territory Shot**: The confirmed center, zoom, pitch, bearing, scale, and style that are locked before raster capture.
_Avoid_: Screenshot, camera preset

**Map Base**: The unedited raster map loaded into React Image Editor.
_Avoid_: Raw map, source map

**Mission Plan**: The route, marks, shapes, labels, and note authored by the user.
_Avoid_: Drawing, annotations

**Annotated Map**: The flattened image returned after the user saves the Mission Plan.
_Avoid_: Export, edited map

**Identity**: An alias plus an optional edited portrait, with a silhouette fallback.
_Avoid_: Profile, character

**Operation**: The fictional scenario and user-selected title.
_Avoid_: Mission, quest

**Dossier**: The fixed final composition containing the Annotated Map, Identity, Operation, and attribution.
_Avoid_: Poster, card

**Reveal**: The short transition from the saved Annotated Map to the complete Dossier.
_Avoid_: Loading, generation

## Invariants

- The Dossier uses the exact Annotated Map the user saved.
- A locked Territory Shot becomes one stable raster Map Base before editor authoring begins.
- Changing Territory after editing requires an explicit warning because it resets the Mission Plan.
- A missing portrait never blocks completion.
- Preview and downloaded PNG come from the same final image.
- Required map attribution remains legible and uncovered.
- Heistboard never claims to calculate a real or safe route.
- Building extrusions are stylized context from available map data, not photorealistic or survey-accurate models.
- Place searches are user-triggered and ephemeral; raw queries and exact coordinates are not logged or persisted in P0.
- An external map failure never blocks the owned sample-map path.

## Scope boundary

P0 delivers one scenario, one stylized map treatment with an interactive 3D Territory preview, a locked raster Map Base, alias, optional portrait, guided Mission Plan editing, fixed Dossier composition, Reveal, PNG download, recovery, responsive access, documentation, deployment, and submission assets. Authentication, databases, cloud storage, multiplayer, public galleries, AI generation, route calculation, live civic data, photorealistic 3D reconstruction, a live map inside the editor, street-level imagery, game simulation, arbitrary layout editing, and multiple export formats are outside P0.
