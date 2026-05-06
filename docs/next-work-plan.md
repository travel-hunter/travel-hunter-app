# Travel Hunter 다음 작업 우선순위

## 기준

- 현재 MVP 기능과 Docker-backed release gate는 완료됐다.
- 다음 작업의 단일 소스는 이 문서다.
- 실제 배포 플랫폼이 정해지기 전까지 기준 배포 방향은 Docker Compose staging-ready 구성이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|----------|------|-----------|
| 완료 | 저장 정책 화면화 | `GET/DELETE /api/me/saved-policies`를 지원하고, 마이페이지에서 저장 정책 목록 조회와 저장 해제가 동작한다. |
| 완료 | 친구 초대 수락 화면화 | `/invites/:inviteToken/accept` route에서 로그인 유도, 수락, 일정 이동이 동작한다. |
| 완료 | 정책 탐색 UX 개선 | 정책 목록에서 검색, 지역, 카테고리 필터가 client-side로 동작한다. |
| 완료 | 정책 신청 URL 정밀화 | 실제 정책별 공고 URL이 확정되면 `officialUrl`/`applyUrl` seed 값을 갱신한다. |
| 완료 | Docker-backed 릴리즈 게이트 재실행 | Docker Desktop 실행 후 backend-mode e2e, compose build, compose DB migration/seed를 재실행했다. |
| 완료 | 릴리즈 후보 인수인계 | 통과한 release gate 결과, 실행 방법, 남은 미구현 범위, Docker Compose staging 방향을 한 묶음으로 정리했다. |
| 완료 | 루트 구조 간소화 | 미래 Terraform/Kubernetes placeholder를 `docs/future-deployment.md`로 흡수하고 루트 구조를 단순화했다. |
| 1 | 실제 staging 환경 선택 및 배포 실행 | Docker Compose 기준을 바탕으로 실제 배포 플랫폼, domain, HTTPS, secret, DB 운영 값을 확정하고 배포한다. |

## Fast Lane 검증

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

Migration이 변경된 경우에만:

```bash
cd backend
alembic upgrade head --sql
```

## 주의사항

- `trips.slug` 컬럼은 추가하지 않는다.
- DB mode `Trip.id`는 계속 `str(trips.id)`를 반환한다.
- `jeju-3-days`는 legacy seed alias이며 public slug가 아니다.
- Docker-backed release gate는 2026-05-06에 통과한 상태다.
