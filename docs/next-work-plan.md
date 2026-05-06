# Travel Hunter 다음 작업 우선순위

## 기준

- MVP 기능 구현은 완료됐다.
- runtime mock mode는 제거됐고, 앱은 DB-backed-only로 동작한다.
- Wanted/Figma 1차 디자인 적용과 주요 화면 handoff frame 생성은 완료됐다.
- Public VPS direct mode와 Cloudflare Tunnel mode 배포 산출물은 모두 준비됐다.
- Jenkinsfile은 이번 단계에서 구현하지 않고 후속 배포 자동화로 미룬다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Tunnel staging 입력값 확보 | Cloudflare 도메인, tunnel token, 실제 `deploy/.env.tunnel`, repo clone 권한이 준비된다. |
| 2 | Cloudflare Tunnel staging 배포 | `docs/deployment-tunnel.md` 절차로 외부 HTTPS URL이 열리고 `/api/health`가 200을 반환한다. |
| 3 | 내부 smoke 검증 | 로그인, 정책 탐색, 정책 저장/삭제, 일정 생성/삭제, 정책 담기, 초대 수락, 로그아웃이 외부 URL에서 통과한다. |
| 4 | 배포 결과 문서화 | staging URL, 배포 커밋, 실행 명령 결과, blocker를 `docs/release-candidate-handoff.md`와 `CHECKLIST.md`에 기록한다. |
| 5 | 공개 테스트 전 운영 기준 수립 | 개인정보/약관, 로그, 백업, 모니터링, 장애 대응 기준을 별도 계획으로 확정한다. |
| 6 | Jenkins 배포 자동화 기준 추가 | Tunnel smoke 이후 `Jenkinsfile` 또는 Jenkins pipeline을 후속 작업으로 설계한다. |

## Fast Lane

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

## Release Gate

```bash
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```

## 주의사항

- `trips.slug`는 추가하지 않는다.
- `jeju-3-days`는 legacy seed alias이며 public slug가 아니다.
- staging에서는 HTTPS와 `REFRESH_COOKIE_SECURE=true`가 함께 필요하다.
- mock mode를 다시 추가하지 않는다.
- 실제 secret과 `deploy/.env.tunnel`은 커밋하지 않는다.
