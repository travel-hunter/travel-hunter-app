# Travel Hunter Local LAN Access

## Purpose

Use this runbook only after development is complete enough to share the app with other people on the same classroom, office, or lab network.

This is not the default development runtime. During active UI development, use `docs/local-dev-runtime.md` and check the app on `http://127.0.0.1:5173/`.

## When To Use

- Use this only when classmates need to open the app from their own phones or PCs.
- Use Docker frontend `4173` when sharing a final production-build preview.
- Use Vite `5173` for short local demos only when fast refresh is still needed.
- Use Cloudflare Tunnel instead if the network blocks device-to-device access.

## Current Example LAN IP

Current host PC IPv4:

```text
192.168.32.22
```

Confirm it before sharing:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '169.254*' } |
  Select-Object InterfaceAlias, IPAddress
```

## Option A: Share Final Docker Frontend

Use this after the frontend work is ready.

1. Add the LAN origins to backend CORS for the sharing session:

```yaml
CORS_ORIGINS: http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173,http://192.168.32.22:4173
```

2. Recreate backend and frontend:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app
docker compose up -d --build backend frontend
```

3. Share this URL:

```text
http://192.168.32.22:4173/
```

## Option B: Share Vite Dev Server Temporarily

Use this only when fast UI refresh is still needed during a short demo.

1. Add the LAN dev origin to backend CORS for the sharing session:

```yaml
CORS_ORIGINS: http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173,http://192.168.32.22:5173
```

2. Recreate backend:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app
docker compose up -d --no-deps backend
```

3. Start Vite with LAN binding:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app\frontend
$env:VITE_API_BASE_URL="http://192.168.32.22:8000"
npm run dev -- --host 0.0.0.0
```

4. Share this URL:

```text
http://192.168.32.22:5173/
```

## Windows Firewall

If other devices cannot connect, open the needed ports from an administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Travel Hunter Frontend 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173
New-NetFirewallRule -DisplayName "Travel Hunter Frontend 4173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4173
New-NetFirewallRule -DisplayName "Travel Hunter Backend 8000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000
```

## Troubleshooting

- If the frontend loads but API calls fail, confirm `VITE_API_BASE_URL` points to `http://192.168.32.22:8000`.
- If CORS fails, confirm the exact frontend origin is included in `CORS_ORIGINS`.
- If cookies do not persist on local HTTP, confirm `REFRESH_COOKIE_SECURE=false`.
- If no other device can reach the host despite correct ports, the classroom network may have client isolation enabled. Use `docs/deployment-tunnel.md` instead.

## Reset To Development Default

After the sharing session, remove LAN origins from `compose.yaml` and return to local-only development:

```yaml
CORS_ORIGINS: http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173
```
