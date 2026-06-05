# Travel Hunter Next Work Plan

> Status: active execution queue.
> Use this document as the source of truth for current next-work priority. `docs/specs/spec-index.md` is a local UX spec index. Deployment and CI/CD work remains deferred under `docs/deployment-cicd/` unless explicitly reprioritized.

## Current Priority

The current priority is local functional completion that can be verified without public DNS, Cloudflare, real SMTP sender-domain authentication, OAuth provider redirect registration, or staging infrastructure.

Recently completed local UX work:

- Frontend validation baseline is green in the current WSL/local environment.
- Domain-independent Auth and Account Recovery UX.
- Policy detail no-link CTA clarity.
- Policy detail info-only action blocking and policy-to-trip success feedback.
- MyPage saved/applied policy summary consistency after policy save, remove, link, and unlink actions.
- Policy To Trip Linking local runtime smoke for a normalized policy across save, unsave, link, trip-detail display, unlink, and MyPage refresh.
- Map bottom-sheet place detail opens an inspectable local detail dialog with day context, address, memo, coordinates, category, and Kakao Maps link.
- Place Search/Add local UX from the itinerary editing flow uses recommendation candidates through `AppDataApi` and preserves Kakao place metadata when saving.

Immediate sequence:

1. Keep the frontend validation baseline green as the entry gate for further UI work.
2. Smoke Kakao Local candidate fetching locally with configured env and record candidate/fallback behavior.
3. Prepare policy list server search/pagination only when local policy volume makes client filtering uncomfortable.
4. Revisit domain-dependent SMTP, OAuth, Cloudflare, deployment, and CI/CD smoke work after local UX completion.

## Active Planning Sources

- `docs/specs/spec-index.md`
- `docs/specs/local-ux-auth-account.md`
- `docs/specs/local-ux-policy-trip-linking.md`
- `docs/specs/local-ux-place-discovery.md`
- `docs/implemented-feature-spec.md`
- `docs/mvp-api-contract.md`
- `docs/db-schema-current.md`
- `docs/db-schema-current.sql`

## Deferred Work

The following work is intentionally lower priority for now:

- Cloudflare Tunnel staging full-up.
- Public HTTPS route smoke.
- Brevo sender-domain authentication and real password reset email smoke.
- Kakao and Google OAuth provider smoke with public redirect URIs.
- SOLAPI SMS or Kakao AlimTalk real-provider smoke.
- Jenkins or other CI/CD automation.

## Guardrails

- Do not reintroduce runtime mock mode.
- Keep frontend pages behind the `AppDataApi` boundary.
- Keep API DTO fields in `camelCase` and database fields in `snake_case`.
- Keep trip route handles as numeric string `Trip.id`; do not add `trips.slug`.
- Do not commit secrets, real `.env` files, tunnel tokens, DB passwords, OAuth secrets, SMTP passwords, or auth secrets.
