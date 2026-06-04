# Local UX Spec: Auth And Account Recovery

## Goal

Complete the local user experience for account access: sign up, log in, recover access, use OAuth entry points, and verify an alert contact without relying on undeclared production deployment work.

Domain-dependent provider smoke is now deferred. The immediate implementation priority is local behavior that can be completed without `travel-hunter.co.kr`, public DNS, sender-domain authentication, or provider redirect registration.

## User Experience Boundary

This spec covers flows a local user can directly attempt from the app:

- Email/password login
- Sign up
- Password reset request and reset token UX
- Kakao OAuth button and missing-env UX
- Google OAuth button and missing-env UX
- Phone contact save and OTP verification smoke

Deployment, public HTTPS, Cloudflare Tunnel, real SMTP sender-domain smoke, and CI/CD are not part of the immediate implementation scope.

## Current State

Implemented or partially implemented:

- Email/password sign up and login are implemented through `AppDataApi` and backend auth routes.
- Password reset screens and backend token logic exist.
- Kakao/Google OAuth start and callback routes exist.
- MyPage contact and OTP request/confirm UI exists.
- OTP has dev/test and SOLAPI provider boundaries.

Domain-dependent blockers deferred to later:

- Password reset email smoke requires SMTP env and public base URL.
- Kakao OAuth smoke requires Kakao client id, secret, and redirect URI.
- Google OAuth smoke requires Google client id, secret, and redirect URI.
- Real phone OTP smoke requires an SMS provider configuration.

## Immediate Missing UX To Complete Locally

1. `/reset-password?token=...` should clearly handle valid, invalid, expired, and already-used token states without relying on email delivery.
2. Password reset request should show a clear success state for account-existence-hidden responses and a clear service-unavailable state when email delivery is not configured.
3. Kakao and Google OAuth entry points should show user-safe missing-provider-env messaging instead of looking like broken login buttons.
4. Phone OTP UI should clearly distinguish dev OTP mode from real provider OTP mode.
5. Auth forms should keep loading, error, retry, and navigation states clear across login, signup, forgot password, reset password, and OAuth callback screens.

## Deferred Domain-Dependent UX

1. Password reset email should complete from request to inbox/link to successful password change in a local or local-like environment.
2. Kakao OAuth should complete a full start/callback/login smoke with configured local redirect values.
3. Google OAuth should complete a full start/callback/login smoke with configured local redirect values.
4. Phone OTP should complete a real send/confirm smoke with configured provider credentials.
5. Brevo sender-domain authentication and `no-reply@travel-hunter.co.kr` password reset delivery should be verified after DNS setup is ready.

## Immediate Local Completion Criteria

- `/reset-password?token=...` accepts a valid token and rejects invalid or expired tokens.
- `POST /api/auth/password-reset/request` keeps account existence hidden and reports configured/unconfigured email delivery states clearly.
- Kakao and Google login buttons do not leave the user on a blank or stuck screen when provider env is missing.
- Contact verification can request and confirm an OTP through dev provider mode, or clearly explains that real provider mode is not configured.
- Missing provider env produces user-safe messaging and no blank or stuck screen.

## Deferred Completion Criteria

- `POST /api/auth/password-reset/request` succeeds for an existing email with configured Brevo SMTP and produces a usable reset link.
- Kakao login button reaches provider authorization and returns to `/oauth/callback` with registered redirect values.
- Google login button reaches provider authorization and returns to `/oauth/callback` with registered redirect values.
- Contact verification can request and confirm an OTP through the selected real provider mode.

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
