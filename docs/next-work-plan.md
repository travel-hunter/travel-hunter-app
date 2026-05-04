# Travel Hunter 다음 작업 우선순위

## 기준

- 기준 브랜치: `feat/prototype-to-react`
- 현재 기준은 profile DB persistence, 정책 담기 sheet, 일정 생성 `region/style/policySlug` payload, backend-mode e2e smoke 변경분까지 포함한다.
- API shape는 `docs/mvp-api-contract.md`를 따른다.
- 현재 정책 담기 저장 기준은 `trip_policies`이며, `saved-policies` DB persistence는 별도 작업이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|----------|------|-----------|
| 1 | 친구 초대 수락 DB-backed 구현 | `/api/invites/{inviteToken}/accept`가 `trip_invites.accepted_at`과 `trip_members` 추가를 실제 DB 기준으로 처리한다. |
| 2 | backend-mode e2e CI 고정 | mock e2e와 backend-mode e2e를 CI에서 분리 실행하고 실패 위치를 명확히 한다. |
| 3 | saved-policies DB persistence | `POST /api/me/saved-policies/{policySlug}`가 사용자별 DB 저장 상태를 유지한다. |
| 4 | 배포 readiness 정리 | staging build, env 분리, container validation 기준을 문서화하고 검증한다. |
| 5 | 정책 신청 deep link 처리 | 정책 상세의 공식 신청 연결을 실제 URL/deep link 기준으로 정리한다. |

## 검증 명령

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config

cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build
```

## 주의사항

- `trips.slug` 컬럼은 추가하지 않는다.
- DB mode `Trip.id`는 계속 `str(trips.id)`를 반환한다.
- `jeju-3-days`는 legacy seed alias일 뿐 public slug가 아니다.
- 새 API shape 변경은 backend schema, frontend type, tests, eval, contract를 함께 갱신한다.
- 새 사용자-facing 한글 문구는 UTF-8로 정상 작성한다.
