# Travel Hunter Next Work Plan

> Status: reference.
> Use `docs/specs/spec-index.md` as the active source of truth for current local UX priorities. Deployment and CI/CD work remains deferred under `docs/deployment-cicd/` unless explicitly reprioritized.

## Current Priority

The current priority is local functional completion that can be verified without public DNS, Cloudflare, real SMTP sender-domain authentication, OAuth provider redirect registration, or staging infrastructure.

Recently completed local UX work:

- Domain-independent Auth and Account Recovery UX.
- Policy detail no-link CTA clarity.
- Policy detail info-only action blocking and policy-to-trip success feedback.
- MyPage saved/applied policy summary consistency after policy save, remove, link, and unlink actions.

Immediate sequence:

1. Keep the frontend validation baseline green as the entry gate for further UI work.
2. Complete the remaining Policy To Trip Linking local runtime smoke for a normalized policy across save, unsave, link, trip-detail display, unlink, and MyPage refresh.
3. Complete Place Detail and Search local UX.
4. Revisit domain-dependent SMTP, OAuth, Cloudflare, deployment, and CI/CD smoke work after local UX completion.

## Active Planning Sources

- `docs/specs/spec-index.md`
- `docs/specs/local-ux-auth-account.md`
- `docs/specs/local-ux-policy-trip-linking.md`
- `docs/specs/local-ux-place-discovery.md`
- `docs/current-work-spec.md`
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
