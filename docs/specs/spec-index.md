# Travel Hunter Spec Index

## Purpose

This index defines which specification documents should be treated as active sources of truth for the current local UX completion work. It also separates deferred deployment/CI/CD work from local product completion work.

## Current Priority Boundary

Local functional completion is the current priority. Work that requires a purchased domain, DNS propagation, public HTTPS, Cloudflare, external SMTP sender authentication, OAuth provider redirect registration, or staging smoke is deferred unless a later task explicitly changes that priority.

The next implementation pass should prioritize domain-independent local UX first: clear missing-env states, token validation flows, dev-provider OTP clarity, and backend/frontend behavior that can be verified without public DNS.

## Active Specs

| Document | Status | Role |
| --- | --- | --- |
| [local-ux-auth-account.md](local-ux-auth-account.md) | active | Local auth, account recovery, OAuth, and contact verification UX completion spec. |
| [local-ux-policy-trip-linking.md](local-ux-policy-trip-linking.md) | active | Local policy discovery, saved policy, official link, and trip linking UX completion spec. |
| [local-ux-place-discovery.md](local-ux-place-discovery.md) | active | Local place detail, map/search, recommendation candidate, and fallback quality UX completion spec. |
| [../current-work-spec.md](../current-work-spec.md) | active | Current project work summary and source priority bridge. |
| [../mvp-api-contract.md](../mvp-api-contract.md) | active | API wire contract. |
| [../db-schema-current.md](../db-schema-current.md) | active | Human-readable current DB schema reference. |
| [../db-schema-current.sql](../db-schema-current.sql) | active | SQL schema snapshot. |

## Reference Docs

| Document | Status | Role |
| --- | --- | --- |
| [../requirements.md](../requirements.md) | reference | Product requirements history and acceptance baseline. |
| [../implemented-feature-spec.md](../implemented-feature-spec.md) | reference | Implemented feature inventory and conditional scope summary. |
| [../screen-feature-status-screens.md](../screen-feature-status-screens.md) | reference | Screen-by-screen status ledger. |
| [../screen-feature-status-logic.md](../screen-feature-status-logic.md) | reference | Internal logic, collection, fallback, and recommendation status ledger. |
| [../local-dev-runtime.md](../local-dev-runtime.md) | reference | Local runtime commands and environment setup. |
| [../brevo-cloudflare-email-guide.md](../brevo-cloudflare-email-guide.md) | reference | Cloudflare DNS/email routing and Brevo SMTP setup guide for password reset smoke tests. |
| [../next-work-plan.md](../next-work-plan.md) | reference | Historical next-work planning notes; use active specs for current local UX execution. |
| [../repo-slimming-work-spec.md](../repo-slimming-work-spec.md) | reference | Repository slimming work spec. |

## Removed Archive Candidates

These files were removed after confirming their current guidance role is covered by active or reference documents:

| Removed file | Replacement source |
| --- | --- |
| `docs/screen-feature-status-report.md` | `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`, and this index. |
| `docs/superpowers/plans/2026-05-28-ai-results-inline-day-selector-compact-copy.md` | `docs/specs/local-ux-place-discovery.md` and current implementation/tests. |
| `docs/superpowers/plans/2026-05-28-ai-results-map-first-redesign.md` | `docs/specs/local-ux-place-discovery.md` and current implementation/tests. |
| `docs/superpowers/plans/2026-05-28-ai-results-preview-day-selector-v3.md` | `docs/specs/local-ux-place-discovery.md` and current implementation/tests. |

## Deployment Deferred

| Document | Status | Role |
| --- | --- | --- |
| [../deployment-cicd/README.md](../deployment-cicd/README.md) | deployment-deferred | Deployment and CI/CD documentation root. |

Deployment-deferred work includes Cloudflare Tunnel staging, Jenkins CD, production/staging provider smoke, and public HTTPS validation. Keep these out of the local UX completion specs unless a local flow requires a documented placeholder or env boundary.

Domain-dependent deferred work includes Brevo domain authentication, real SMTP password reset email smoke, public OAuth redirect smoke, public map-domain validation, and any flow that requires `travel-hunter.co.kr` DNS to be active.

## Cleanup Rules

1. Do not delete a legacy document until its useful content is represented in an active or reference document.
2. Record removed legacy documents in this index with their replacement source.
3. Keep API shape authority in `docs/mvp-api-contract.md`.
4. Keep DB authority in `docs/db-schema-current.md` and `docs/db-schema-current.sql`.
5. Keep deployment and CI/CD work in `docs/deployment-cicd/` until it becomes the active priority.
