# Travel Hunter 다음 작업 우선순위

## 기준

- 개발 방향은 기능 구현 우선이다.
- Docker, backend-mode e2e, compose build, release scorecard는 릴리즈 전 게이트로만 본다.
- 기능 작업 중 기본 검증은 frontend typecheck, Vitest, backend pytest로 제한한다.
- API shape 변경 시에만 API 계약, backend schema, frontend type, focused tests를 함께 갱신한다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|----------|------|-----------|
| 1 | 저장 정책 화면화 | `GET/DELETE /api/me/saved-policies`를 지원하고, 마이페이지에서 저장 정책 목록 조회와 저장 해제가 동작한다. |
| 2 | 친구 초대 수락 화면화 | `/invites/:inviteToken/accept` route에서 로그인 유도, 수락, 일정 이동이 동작한다. |
| 3 | 정책 탐색 UX 개선 | 정책 목록에서 검색, 지역, 카테고리 필터가 client-side로 동작한다. |
| 4 | 정책 신청 URL 정밀화 | 실제 정책별 공고 URL이 확정되면 `officialUrl`/`applyUrl` seed 값을 갱신한다. |
| 5 | 릴리즈 게이트 재실행 | 릴리즈 후보 시점에 e2e, backend-mode e2e, build, compose build를 재실행한다. |

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
- 기능 구현 중 Docker Desktop 미실행은 blocker로 보지 않는다.
