# Travel Hunter Local LAN Access

## Purpose

Use this runbook when the app must be reachable from other devices on the same classroom, office, or lab network. This is a local development sharing mode, not a public staging deployment.

Current example LAN IP:

```text
192.168.32.22
```

Replace this value if the host PC gets a different IPv4 address.

## When To Use

- Use `localhost` or `127.0.0.1` when only the host PC needs access.
- Use the LAN IP when phones, tablets, or other PCs on the same network need access.
- Use Cloudflare Tunnel or another tunnel when the network blocks device-to-device traffic.

## 1. Confirm LAN IP

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '169.254*' } |
  Select-Object InterfaceAlias, IPAddress
```

Use the Ethernet IPv4 address. For the current classroom setup, that is:

```text
192.168.32.22
```

## 2. Start PostgreSQL

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app
docker compose -f compose.yaml up -d db
```

## 3. Start Backend For LAN Access

Run the backend on `0.0.0.0` so other devices can connect.

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app\backend

$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
$env:CORS_ORIGINS="http://192.168.32.22:5173,http://localhost:5173,http://127.0.0.1:5173"
$env:REFRESH_COOKIE_SECURE="false"
$env:TRAVEL_HUNTER_PUBLIC_BASE_URL="http://192.168.32.22:5173"

alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 4. Start Frontend For LAN Access

`npm run dev` binds to `127.0.0.1` in this project, so use Vite directly for LAN access.

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app\frontend

$env:VITE_API_BASE_URL="http://192.168.32.22:8000"
npx vite --host 0.0.0.0 --port 5173
```

## 5. Access URLs

Other devices on the same network should use:

```text
http://192.168.32.22:5173
http://192.168.32.22:8000/docs
http://192.168.32.22:8000/api/health
```

## 6. Windows Firewall

If other devices cannot connect, open the frontend and backend ports from an administrator PowerShell.

```powershell
New-NetFirewallRule -DisplayName "Travel Hunter Frontend 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173
New-NetFirewallRule -DisplayName "Travel Hunter Backend 8000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000
```

## Troubleshooting

- If `http://192.168.32.22:8000/api/health` works on the host PC but not on another device, check Windows Firewall.
- If the frontend loads but API calls fail, confirm `VITE_API_BASE_URL` uses `http://192.168.32.22:8000`.
- If login fails due to CORS, confirm `CORS_ORIGINS` includes `http://192.168.32.22:5173`.
- If cookies do not persist on local HTTP, confirm `REFRESH_COOKIE_SECURE=false`.
- If no other device can reach the host despite correct ports, the classroom network may have client isolation enabled. Use `docs/deployment-tunnel.md` instead.
