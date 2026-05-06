# Travel Hunter 다음 작업 우선순위

## 기준

- MVP 기능 구현은 완료 상태다.
- runtime mock mode는 제거됐고, 앱은 DB-backed-only 기준으로 동작한다.
- 실제 staging 방향은 Docker VPS 기반 내부 테스트용 배포로 결정했다.
- Wanted Design System `.fig` 기반 1차 UI pass가 적용됐다.
- 다음 작업은 기능 추가가 아니라 디자인 적용 기준을 고정하고, Figma import/시각 QA를 끝낸 뒤 외부 staging URL에서 RC를 검증하는 것이다.
- Docker VPS 배포 산출물 기준 커밋은 `91df9e9 chore: add docker vps staging artifacts`다.
- VPS blocker는 VPS 접속 정보, staging domain/DNS, repo clone 권한, 실제 staging env 값 미제공이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Wanted Design System 1차 적용분 커밋 | 토큰/공통 스타일/문서/e2e selector 수정이 검증 통과 상태로 기준점 커밋된다. |
| 2 | Figma import 및 화면 기준 정리 | `.fig`를 Figma에 import하고 Travel Hunter 파일에 `Token Map`, `Current Screens`, `Redesigned Screens`, `Handoff` 페이지가 정리된다. |
| 3 | 주요 화면 시각 QA 및 2차 보정 | `/login`, `/signup`, `/home`, `/policies`, `/trips`, `/mypage`가 390/1024/1440px에서 overflow, CTA 잘림, nav 겹침 없이 확인된다. |
| 4 | VPS 배포 입력값 확보 | VPS SSH, domain/DNS, repo clone 권한, `deploy/.env.staging` 값이 준비된다. |
| 5 | Docker VPS staging 배포 및 내부 smoke | `docs/deployment-vps.md` 절차에 따라 외부 URL에서 로그인, 정책 탐색, 일정 생성/삭제, 정책 담기, 초대 수락, 로그아웃이 통과한다. |
| 6 | 공개 테스트 전 운영 기준 수립 | 개인정보/약관, 로그, 백업, 모니터링, 장애 대응 범위를 별도 계획으로 확정한다. |

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
```

## 주의사항

- `trips.slug`는 추가하지 않는다.
- `jeju-3-days`는 legacy seed alias일 뿐 public slug가 아니다.
- staging에서는 HTTPS와 `REFRESH_COOKIE_SECURE=true`가 같이 필요하다.
- mock mode를 다시 추가하지 않는다.
