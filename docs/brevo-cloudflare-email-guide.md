# Brevo And Cloudflare Email Guide

## Purpose

This guide describes how to prepare `travel-hunter.co.kr` for password reset email smoke tests using:

- Cloudflare for DNS and email routing
- Brevo for SMTP sending
- `no-reply@travel-hunter.co.kr` as the password reset sender

Cloudflare Email Routing handles inbound forwarding only. Brevo handles outbound SMTP delivery.

## 1. Create The Cloudflare Account

1. Sign up for Cloudflare with the representative or organization-owned email.
2. Enable 2FA on the Cloudflare account.
3. Store the account in a shared password manager if the project is team-managed.
4. Add future operators through Cloudflare Members instead of sharing the password.

## 2. Add The Domain To Cloudflare

1. Open the Cloudflare dashboard.
2. Select `Add a website`.
3. Enter `travel-hunter.co.kr`.
4. Select the Free plan unless the project has a separate paid requirement.
5. Let Cloudflare scan existing DNS records.
6. Copy the two Cloudflare nameservers shown at the end of setup.

Example nameserver shape:

```text
example-a.ns.cloudflare.com
example-b.ns.cloudflare.com
```

## 3. Change Nameservers In Gabia

1. Log in to Gabia.
2. Open `My Gabia` -> domain management.
3. Select `travel-hunter.co.kr`.
4. Open nameserver settings.
5. Replace the current nameservers with the two Cloudflare nameservers.
6. Save the change.

DNS propagation can take from several minutes to several hours.

## 4. Confirm Cloudflare Activation

1. Return to the Cloudflare dashboard.
2. Wait until `travel-hunter.co.kr` is shown as active.
3. Manage DNS records from Cloudflare after activation.

## 5. Configure Cloudflare Email Routing

1. Open `travel-hunter.co.kr` in Cloudflare.
2. Open `Email` or `Email Routing`.
3. Enable Email Routing.
4. Add the destination address that will receive forwarded mail.
5. Confirm the destination verification email.
6. Add custom addresses.

Recommended custom addresses:

```text
no-reply@travel-hunter.co.kr
support@travel-hunter.co.kr
```

Recommended routing:

```text
no-reply@travel-hunter.co.kr -> representative inbox
support@travel-hunter.co.kr -> representative inbox
```

## 6. Create The Brevo Account

1. Sign up for Brevo.
2. Open the transactional email or SMTP area.
3. Open `SMTP and API settings`.
4. Create or copy the SMTP credentials.

Required values:

```text
SMTP host: smtp-relay.brevo.com
SMTP port: 587
SMTP login: Brevo SMTP username
SMTP key: Brevo SMTP key
```

Use the Brevo SMTP key as `SMTP_PASSWORD`. Do not use the Brevo web login password.

## 7. Authenticate The Domain In Brevo

1. Open `Senders & Domains` in Brevo.
2. Add `travel-hunter.co.kr` as a domain.
3. Copy the DNS records that Brevo provides.
4. Add those records in Cloudflare DNS.

Typical records include:

- DKIM
- DMARC
- Brevo verification code
- SPF/TXT if Brevo asks for it

After adding the DNS records, return to Brevo and run verification.

## 8. Configure The Local Backend

Create or update:

```text
backend/.env
```

Use these values, replacing the Brevo credentials:

```env
TRAVEL_HUNTER_PUBLIC_BASE_URL=http://127.0.0.1:5173
PASSWORD_RESET_EXPIRE_MINUTES=30

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=<Brevo SMTP login>
SMTP_PASSWORD=<Brevo SMTP key>
SMTP_FROM_EMAIL=no-reply@travel-hunter.co.kr
SMTP_USE_TLS=true
```

The backend reads `backend/.env` at startup, so restart FastAPI after changing the file.

## 9. Configure Staging Or Tunnel Later

For staging or tunnel smoke tests, copy the same SMTP values into:

```text
deploy/.env.staging
deploy/.env.tunnel
```

In staging-like environments, `TRAVEL_HUNTER_PUBLIC_BASE_URL` must be a public HTTPS URL, not localhost.

Example:

```env
TRAVEL_HUNTER_PUBLIC_BASE_URL=https://travel-hunter.co.kr
SMTP_FROM_EMAIL=no-reply@travel-hunter.co.kr
```

## 10. Run The Password Reset Smoke Test

1. Restart the backend.
2. Open the frontend.
3. Go to `/forgot-password`.
4. Enter an email that already exists in the local database.
5. Confirm that the reset email arrives.
6. Open the reset link.
7. Set a new password at `/reset-password?token=...`.
8. Log in with the new password.

API-level request:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/auth/password-reset/request `
  -ContentType "application/json" `
  -Body '{"email":"user@example.com"}'
```

## Notes

- Use port `587` because the backend currently calls `SMTP(...).starttls()`.
- Port `465` usually requires implicit TLS through `SMTP_SSL`, which the current backend does not use.
- Do not commit real SMTP credentials.
- Keep `SMTP_FROM_EMAIL` aligned with the Brevo-authenticated sender or domain.
