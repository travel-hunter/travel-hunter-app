# Travel Hunter 문서 인덱스

## 먼저 읽을 문서

1. `requirements.md`
   - 제품 요구사항, 사용자 역할, 기능/비기능 요구사항, 조건부/후속 범위.
2. `release-candidate-handoff.md`
   - MVP RC 범위, 실행 모드, 테스트 계정, 검증 결과, blocker.
3. `current-work-spec.md`
   - 현재 구현 상태의 단일 요약 명세.
4. `feature-implementation-status.md`
   - 기능군별 완료/조건부 완료/미구현 상태표.
5. `deployment-tunnel.md`
   - NAT 제한 환경의 Cloudflare Tunnel staging runbook.
6. `deployment-vps.md`
   - public VPS 직접 노출 staging runbook.
7. `mvp-api-contract.md`
   - API request/response/error 계약.
8. `next-work-plan.md`
   - 다음 작업 우선순위.

## 보조 문서

- `vps-staging-inputs.md`: VPS staging 입력값과 secret 처리 기준.
- `notification-delivery-plan.md`: 마감 알림 발송 기반 설계. 카카오 알림톡, FastAPI 내부 scheduler, D-7/D-1 대상 계산 기준.
- `design-system-map.md`: Wanted Design System과 코드 토큰/컴포넌트 매핑.
- `figma-import-checklist.md`: Wanted `.fig` import와 component 확인표.
- `figma-component-values.md`: Figma component 수치 원본.
- `db-schema-v0.3.sql`: ERD v0.3 SQL 기준본.

## 현재 기준

- 앱은 DB-backed-only로 동작하며 runtime mock mode는 제거됐다.
- MVP RC 배포는 Docker Compose staging을 기준으로 한다.
- Public VPS 직접 노출이 가능하면 `deployment-vps.md`를 사용한다.
- 학교/온프레미스 NAT 제한 환경이면 `deployment-tunnel.md`를 사용한다.
- 실제 secret, DB password, tunnel token, staging env 파일은 repo에 커밋하지 않는다.
- 협업 규칙은 루트 `CONTRIBUTING.md`를 기준으로 한다.
