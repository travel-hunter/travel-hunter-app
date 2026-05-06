# Travel Hunter 다음 작업 우선순위

## 기준

- 기준 브랜치: `feat/prototype-to-react`
- 현재 기준은 profile DB persistence, 정책 담기 sheet, 일정 생성 `region/style/policySlug` payload, 친구 초대 수락 DB-backed 처리, backend-mode e2e CI 분리 실행, saved-policies DB persistence, 배포 readiness 문서 정리까지 포함한다.
- API shape는 `docs/mvp-api-contract.md`를 따른다.
- 현재 정책 담기 저장 기준은 `trip_policies`이며, `saved-policies` DB persistence는 별도 작업이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|----------|------|-----------|
| 1 | 정책 신청 deep link 처리 | 정책 상세의 공식 신청 연결을 실제 URL/deep link 기준으로 정리한다. |

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
