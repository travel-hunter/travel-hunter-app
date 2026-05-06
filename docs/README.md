# Travel Hunter 문서 인덱스

## 읽는 순서

1. `release-candidate-handoff.md`
   - MVP 릴리즈 후보 범위, 실행 모드, URL, 환경 변수, 검증 결과.
2. `current-work-spec.md`
   - 현재 구현 상태, 주요 위치, 완료/미완료 범위, 검증 명령.
3. `mvp-api-contract.md`
   - API request/response/error 계약.
4. `next-work-plan.md`
   - 다음 작업 우선순위.
5. `db-schema-v0.3.sql`
   - ERD v0.3 SQL 기준본.
6. `future-deployment.md`
   - Docker Compose 이후 AWS/Terraform/EKS/Argo CD 확장 방향.

## 현재 기준

- 런타임 mock mode는 제거됐다.
- 앱은 FastAPI + PostgreSQL DB-backed-only 기준으로 동작한다.
- `.agent/evals`는 명세가 아니라 acceptance 기준이므로 유지한다.
