# Local UX Spec: Auth And Account Recovery

## Goal

Complete the local user experience for account access: sign up, log in, recover access, use OAuth entry points, and verify an alert contact without relying on undeclared production deployment work.

Domain-dependent public-provider smoke is deferred, but local OAuth smoke is supported once the user creates provider apps and supplies localhost credentials. The immediate implementation priority is local behavior that can be completed without `travel-hunter.co.kr`, public DNS, sender-domain authentication, or staging infrastructure.

## User Experience Boundary

This spec covers flows a local user can directly attempt from the app:

- Email/password login
- Sign up
- Password reset request and reset token UX
- Kakao OAuth button, missing-env UX, and local credential smoke command
- Google OAuth button, missing-env UX, and local credential smoke command
- Phone contact save and OTP verification smoke

Deployment, public HTTPS, Cloudflare Tunnel, real SMTP sender-domain smoke, and CI/CD are not part of the immediate implementation scope.

## Current State

Implemented or partially implemented:

- Email/password sign up and login are implemented through `AppDataApi` and backend auth routes.
- Password reset screens and backend token logic exist.
- Kakao/Google OAuth start and callback routes exist.
- OAuth account linking requires verified provider email for same-email auto-link.
- Google requires `email_verified=true`; Kakao can create a `kakao_{providerId}@oauth.local` account when email is absent or unverified.
- OAuth callback failures redirect to `/oauth/callback?error={code}&redirect={safePath}` with closed error codes.
- MyPage contact and OTP request/confirm UI exists.
- OTP has dev/test and SOLAPI provider boundaries.

Domain-dependent blockers deferred to later:

- Password reset email smoke requires SMTP env and public base URL.
- Kakao OAuth live browser smoke requires a Kakao provider app, client id, secret, and localhost redirect URI.
- Google OAuth live browser smoke requires a Google OAuth client id, secret, and localhost redirect URI.
- Real phone OTP smoke requires an SMS provider configuration.

## Immediate Missing UX To Complete Locally

1. `/reset-password?token=...` should clearly handle valid, invalid, expired, and already-used token states without relying on email delivery.
2. Password reset request should show a clear success state for account-existence-hidden responses and a clear service-unavailable state when email delivery is not configured.
3. Kakao and Google OAuth entry points should show user-safe missing-provider-env messaging instead of looking like broken login buttons.
4. Phone OTP UI should clearly distinguish dev OTP mode from real provider OTP mode.
5. Auth forms should keep loading, error, retry, and navigation states clear across login, signup, forgot password, reset password, and OAuth callback screens.

## Deferred Domain-Dependent UX

1. Password reset email should complete from request to inbox/link to successful password change in a local or local-like environment.
2. Kakao OAuth should complete a full start/callback/login smoke with configured localhost redirect values after the user supplies provider credentials.
3. Google OAuth should complete a full start/callback/login smoke with configured localhost redirect values after the user supplies provider credentials.
4. Phone OTP should complete a real send/confirm smoke with configured provider credentials.
5. Brevo sender-domain authentication and `no-reply@travel-hunter.co.kr` password reset delivery should be verified after DNS setup is ready.

## Immediate Local Completion Criteria

- `/reset-password?token=...` accepts a valid token and rejects invalid or expired tokens.
- `POST /api/auth/password-reset/request` keeps account existence hidden and reports configured/unconfigured email delivery states clearly.
- Kakao and Google login buttons do not leave the user on a blank or stuck screen when provider env is missing.
- OAuth callback failures show provider/email-policy-specific user-safe messages.
- `scripts/oauth_local_smoke.py {kakao|google}` validates configured start-route readiness without printing secrets.
- Contact verification can request and confirm an OTP through dev provider mode, or clearly explains that real provider mode is not configured.
- Missing provider env produces user-safe messaging and no blank or stuck screen.

## Deferred Completion Criteria

- `POST /api/auth/password-reset/request` succeeds for an existing email with configured Brevo SMTP and produces a usable reset link.
- Kakao login button reaches provider authorization and returns to `/oauth/callback` with registered localhost redirect values.
- Google login button reaches provider authorization and returns to `/oauth/callback` with registered localhost redirect values.
- Contact verification can request and confirm an OTP through the selected real provider mode.

## Local OAuth Setup And Smoke

Provider app setup is outside repository authority, but the app is ready for these localhost redirect URIs:

- Kakao: `http://127.0.0.1:8000/api/auth/oauth/kakao/callback`
- Google: `http://127.0.0.1:8000/api/auth/oauth/google/callback`

Required backend env:

- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `TRAVEL_HUNTER_PUBLIC_BASE_URL` or the default frontend base URL expected by backend settings

Provider account policy:

- Google same-email sign-in/link requires `email_verified=true`.
- Kakao same-email sign-in/link requires `kakao_account.is_email_verified=true` and `is_email_valid` not false.
- Kakao accounts without a usable verified email use an internal `kakao_{providerId}@oauth.local` email and do not attach to an existing email/password account.

Smoke commands after env is present:

```bash
python scripts/oauth_local_smoke.py kakao
python scripts/oauth_local_smoke.py google
```

The script checks that `/api/auth/oauth/{provider}/start?redirect=/home` returns a provider redirect and state cookie. It does not print client secrets or tokens. After a browser login succeeds, verify:

```bash
curl -i -X POST http://127.0.0.1:8000/api/auth/refresh --cookie 'travel_hunter_refresh=<browser-cookie>'
psql "$DATABASE_URL" -c "select provider, provider_id, user_id from social_accounts order by id desc limit 5;"
```

## Relevant Files And APIs

Frontend:

- `frontend/src/pages/AuthPages.tsx`
- `frontend/src/pages/MyPage.tsx`
- `frontend/src/app/session.tsx`
- `frontend/src/api/appDataApi.ts`
- `frontend/src/api/backendApi.ts`
- `frontend/src/api/types.ts`

Backend:

- `backend/app/api/routes/auth.py`
- `backend/app/services/auth.py`
- `backend/app/services/oauth.py`
- `backend/app/services/email.py`
- `backend/app/api/routes/me.py`
- `backend/app/services/phone_verification.py`

Contracts and references:

- `docs/mvp-api-contract.md`
- `docs/implemented-feature-spec.md`
- `docs/screen-feature-status-screens.md`
- `docs/brevo-cloudflare-email-guide.md`

## Non-Goals

- Do not implement Cloudflare/public deployment in this spec.
- Do not treat domain-dependent provider smoke as part of the immediate local completion scope.
- Do not change the auth DTO shape without updating `docs/mvp-api-contract.md`.
- Do not commit real provider secrets.
