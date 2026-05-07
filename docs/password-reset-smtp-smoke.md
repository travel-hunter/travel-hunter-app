# Password Reset SMTP Smoke

## Purpose

Verify that the password reset flow works in a real staging environment:

```text
/forgot-password -> reset email received -> /reset-password?token=... -> new password login
```

This is a smoke test, not a unit test. It confirms that runtime SMTP settings, public URL generation, email delivery, reset token validation, password update, and login recovery work together.

## Current Status

- Local backend health: passed.
- Unknown email request: passed, returns `{"requested": true}`.
- Existing test account request without SMTP env: blocked as expected with `503`.
- Real email delivery smoke: not run yet.

Reason: no SMTP runtime env and no public HTTPS staging base URL were available in the current session.

## Required Runtime Values

Do not commit real values.

```env
TRAVEL_HUNTER_PUBLIC_BASE_URL=https://<staging-domain>
PASSWORD_RESET_EXPIRE_MINUTES=30
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM_EMAIL=<sender-email>
SMTP_USE_TLS=true
```

For Cloudflare Tunnel staging, put these in `deploy/.env.tunnel`.

For public VPS staging, put these in `deploy/.env.staging`.

## Backend Restart

Tunnel mode:

```powershell
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d backend
```

VPS mode:

```powershell
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d backend
```

## Smoke Steps

1. Open the frontend:

```text
https://<staging-domain>/forgot-password
```

2. Submit an unknown email.

Expected result:

- User-facing message does not reveal whether the account exists.
- API response is success-shaped.

3. Submit the seeded test account or another known account:

```text
test.user@example.com
```

Expected result:

- Reset email arrives.
- Reset URL uses `https://<staging-domain>/reset-password?token=...`.
- The URL must not use `localhost` or `127.0.0.1`.

4. Open the reset link and set a new password.

Expected result:

- Valid token succeeds.
- Used token cannot be reused.
- Invalid or expired token fails.

5. Verify login.

Expected result:

- Old password fails.
- New password succeeds.
- Existing refresh token sessions are revoked by the backend.

## Local Preflight Commands

Health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

Unknown email enumeration guard:

```powershell
$body = @{ email = "does-not-exist@example.com" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/auth/password-reset/request `
  -ContentType "application/json" `
  -Body $body
```

Existing email without SMTP config should fail clearly:

```powershell
$body = @{ email = "test.user@example.com" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/auth/password-reset/request `
  -ContentType "application/json" `
  -Body $body
```

Expected local result without SMTP env:

```text
503 Email delivery is not configured
```

## Completion Criteria

- Real email is received.
- Reset link points to the staging HTTPS domain.
- Password reset succeeds.
- Old password fails.
- New password login succeeds.
- Result is recorded in `docs/current-work-spec.md`, `docs/next-work-plan.md`, and `CHECKLIST.md`.
