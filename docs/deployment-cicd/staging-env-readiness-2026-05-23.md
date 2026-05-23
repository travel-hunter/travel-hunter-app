# Staging Env Readiness Audit - 2026-05-23

## Scope

This audit checks whether OPS-01 from `docs/deployment-cicd/staging-ops-work-orders.md` is ready to move into actual Cloudflare Tunnel staging full-up.

No secret values were copied into this document. The local `deploy/.env.tunnel` file was checked only for key presence, placeholder markers, localhost markers, and domain alignment.

## Result

Status: not ready for OPS-02 actual full-up.

Reason: the local `deploy/.env.tunnel` still contains placeholder values for the staging domain, DB password, backend auth secret, public URLs, Cloudflare tunnel token, and provider credentials.

## Required Runtime Keys

| key | status |
|---|---|
| `STAGING_DOMAIN` | placeholder |
| `VITE_API_BASE_URL` | placeholder |
| `POSTGRES_DB` | set |
| `POSTGRES_USER` | set |
| `POSTGRES_PASSWORD` | placeholder |
| `DATABASE_URL` | placeholder |
| `APP_ENV` | set |
| `AUTH_SECRET_KEY` | placeholder |
| `REFRESH_COOKIE_SECURE` | set |
| `CORS_ORIGINS` | placeholder |
| `TRAVEL_HUNTER_PUBLIC_BASE_URL` | placeholder |
| `CLOUDFLARE_TUNNEL_TOKEN` | placeholder |

## Domain Alignment

The placeholder domain values are internally aligned:

- `VITE_API_BASE_URL` matches `https://<STAGING_DOMAIN>`.
- `CORS_ORIGINS` contains `https://<STAGING_DOMAIN>`.
- `TRAVEL_HUNTER_PUBLIC_BASE_URL` matches `https://<STAGING_DOMAIN>`.
- Kakao and Google redirect URI shapes match the staging domain callback paths.

These checks must be repeated after real values are entered.

## Provider Readiness

| provider group | status | missing or placeholder keys |
|---|---|---|
| SMTP | not ready | `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` |
| Kakao OAuth | not ready | `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI` |
| Google OAuth | not ready | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| SOLAPI | not ready | `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_PF_ID`, `SOLAPI_TEMPLATE_ID_D7`, `SOLAPI_TEMPLATE_ID_D1`, `SOLAPI_WEBHOOK_SECRET` |

Provider keys are not required for the initial OPS-02 health smoke if those features remain disabled, but they are required before SMTP, OAuth, SOLAPI, and SMS smoke checks.

## Commands Run

```powershell
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config --quiet
```

Result: passed. Compose can render with the current file shape, but that does not mean placeholder values are deployable.

```powershell
git check-ignore -v deploy/.env.tunnel deploy/.env.staging deploy/.env.tunnel.example deploy/.env.staging.example
```

Result: `deploy/.env.tunnel` and `deploy/.env.staging` are ignored by Git. Example files are not ignored, as expected.

## Next Steps

1. Replace placeholder values in `deploy/.env.tunnel` on the staging host only.
2. Confirm `STAGING_DOMAIN`, `VITE_API_BASE_URL`, `CORS_ORIGINS`, and `TRAVEL_HUNTER_PUBLIC_BASE_URL` all point to the same public HTTPS hostname.
3. Confirm `REFRESH_COOKIE_SECURE=true` and `APP_ENV=staging` or `production`.
4. Confirm `AUTH_SECRET_KEY`, `POSTGRES_PASSWORD`, and `CLOUDFLARE_TUNNEL_TOKEN` are real secret values.
5. Rerun `docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config --quiet`.
6. Continue with OPS-02 from `docs/deployment-cicd/staging-ops-work-orders.md`.

## Remaining Blockers

- Real staging domain is not present in the local env file.
- Cloudflare tunnel token is not present in the local env file.
- DB/auth runtime secrets are still placeholders.
- Provider smoke checks remain blocked until SMTP, OAuth, and SOLAPI console values are configured.
