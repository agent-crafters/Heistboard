# Avoid persistent user data for P0

- **Status:** Accepted
- **Date:** 2026-09-13

## Context

Territories and portraits can reveal sensitive personal information. Accounts, databases, cloud uploads, and galleries add privacy and operational work without being required for a short downloadable artifact.

## Decision

Keep P0 workflow data in the browser session. Do not add authentication, database storage, cloud galleries, or server persistence. Keep image payloads and Blobs out of serializable form state and do not log them.

## Alternatives considered

- User accounts and saved projects: useful later but far beyond P0.
- Anonymous server storage: still creates retention and abuse obligations.
- Public gallery: conflicts with location and portrait privacy by default.

## Consequences

Refresh may lose work, and users own the downloaded artifact. The application has no recovery promise beyond explicit P0 behavior and optional later local restoration.

## Risks

The editor or future map provider may make network requests; the product cannot claim fully local processing until those behaviors are verified.

## Reversal trigger

Revisit after submission only when a validated user need justifies retention, consent, deletion, access control, and operating cost.
