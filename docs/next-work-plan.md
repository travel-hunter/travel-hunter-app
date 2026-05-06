# Travel Hunter 다음 작업 우선순위

## 기준

- MVP 기능 구현은 완료 상태다.
- runtime mock mode는 제거됐고, 앱은 DB-backed-only 기준으로 동작한다.
- 실제 staging 방향은 Docker VPS 기반 내부 테스트용 배포로 결정했다.
- Wanted Design System `.fig` 기반 1차 UI pass가 적용됐고 브라우저 기준 시각 QA가 완료됐다.
- Figma import와 VPS staging 입력값 준비 절차는 각각 `docs/figma-import-checklist.md`, `docs/vps-staging-inputs.md`에 정리됐다.
- 다음 작업은 기능 추가가 아니라 Figma import/variant 확인을 끝낸 뒤 외부 staging URL에서 RC를 검증하는 것이다.
- Docker VPS 배포 산출물 기준 커밋은 `91df9e9 chore: add docker vps staging artifacts`다.
- VPS blocker는 VPS 접속 정보, staging domain/DNS, repo clone 권한, 실제 staging env 값 미제공이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Figma import 및 component variant 확인 | Button/Input/Badge/Card/Navigation은 `docs/figma-component-values.md`에 원본 수치를 기록했다. Figma 앱/웹 import 후 복제 파일 node URL을 보강하고 Sheet/Modal, Toast/Alert 수치를 추가한다. |
| 2 | Figma 비교 기반 2차 보정 | Figma 수치와 현재 앱이 충돌하는 부분만 token/component 중심으로 보정한다. |
| 3 | VPS 배포 입력값 확보 | `docs/vps-staging-inputs.md`의 Required Inputs가 모두 준비된다. |
| 4 | Docker VPS staging 배포 및 내부 smoke | `docs/deployment-vps.md` 절차에 따라 외부 URL에서 로그인, 정책 탐색, 일정 생성/삭제, 정책 담기, 초대 수락, 로그아웃이 통과한다. |
| 5 | 공개 테스트 전 운영 기준 수립 | 개인정보/약관, 로그, 백업, 모니터링, 장애 대응 범위를 별도 계획으로 확정한다. |

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
