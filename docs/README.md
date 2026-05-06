# Travel Hunter 문서 인덱스

## 읽는 순서

1. `release-candidate-handoff.md`
   - MVP RC 범위, 실행 모드, 검증 결과, VPS 배포 상태.
2. `deployment-vps.md`
   - Docker VPS staging 실행 절차, env, Caddy routing, smoke test.
3. `current-work-spec.md`
   - 현재 구현 상태, 기준 커밋, 완료/미완료 범위, 검증 결과.
4. `mvp-api-contract.md`
   - API request/response/error 계약.
5. `next-work-plan.md`
   - 다음 작업 우선순위.
6. `db-schema-v0.3.sql`
   - ERD v0.3 SQL 기준본.
7. `future-deployment.md`
   - Docker VPS 이후 AWS/Terraform/EKS/Argo CD 확장 방향.

## 현재 기준

- runtime mock mode는 제거됐다.
- 앱은 FastAPI + PostgreSQL DB-backed-only 기준으로 동작한다.
- MVP RC 배포 방향은 Docker VPS 기반 내부 테스트용 staging이다.
- `.agent/evals`는 명세 문서가 아니라 acceptance 기준으로 유지한다.
