# React Image Editor is the core authoring surface

- **Status:** Accepted
- **Date:** 2026-09-13

## Context

The challenge rewards meaningful use of React Image Editor, and Heistboard's central fantasy depends on a person marking recognizable streets themselves. A superficial filter or optional editor would not create authorship or satisfy the product premise.

## Decision

Use `@unlayer/react-image-editor` as the primary Mission Plan surface for draw, shapes, and text. Treat its supported save result as a flattened Annotated Map. Do not promise editable project restoration, layer serialization, or custom sticker injection unless the installed package later proves supported interfaces.

## Alternatives considered

- Build a custom canvas editor: more control, but high schedule and reliability risk.
- Use the editor only for portrait filters: insufficiently central to the product.
- Automatically generate the final map: erases the user's authored Mission Plan.

## Consequences

The integration is client-only and needs a visible load-recovery path. The final pipeline consumes a flattened image, while surrounding workflow state remains owned by Heistboard.

## Risks

Browser behavior, hosted editor availability, output resolution, and package API differences may constrain the experience. A real-browser tracer bullet is required before deeper work.

## Reversal trigger

Revisit if the installed editor cannot reliably load an owned image, expose draw/shapes/text, save a usable flattened result, or meet challenge licensing and availability requirements.
