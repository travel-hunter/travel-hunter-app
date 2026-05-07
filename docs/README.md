# Travel Hunter 문서 인덱스

## 먼저 읽을 문서

1. `release-candidate-handoff.md`
   - MVP RC 범위, 실행 모드, 테스트 계정, 검증 결과, blocker.
2. `current-work-spec.md`
   - 현재 구현 상태의 단일 요약 명세.
3. `notification-delivery-plan.md`
   - 마감 알림 발송 기반 설계. 카카오 알림톡, FastAPI 내부 scheduler, D-7/D-1 대상 계산 기준.
4. `deployment-tunnel.md`
   - NAT 제한 환경의 Cloudflare Tunnel staging runbook.
5. `deployment-vps.md`
   - public VPS 직접 노출 staging runbook.
6. `mvp-api-contract.md`
   - API request/response/error 계약.
7. `next-work-plan.md`
   - 다음 작업 우선순위.

## 보조 문서

- `vps-staging-inputs.md`: VPS staging 입력값과 secret 처리 기준.
- `collaboration-handoff.md`: 협업자가 처음 볼 브랜치, 실행, 주의사항 요약.
- `design-system-map.md`: Wanted Design System과 코드 토큰/컴포넌트 매핑.
- `design-qa.md`: 브라우저 디자인 QA와 Figma handoff 상태.
- `figma-import-checklist.md`: Wanted `.fig` import와 component 확인표.
- `figma-component-values.md`: Figma component 수치 원본.
- `figma-team-project-workflow.md`: Figma 팀/프로젝트 handoff 절차.
- `db-schema-v0.3.sql`: ERD v0.3 SQL 기준본.
- `future-deployment.md`: Jenkins, AWS, Terraform, EKS, Argo CD 등 후속 배포 확장 메모.

## 현재 기준

- 앱은 DB-backed-only로 동작하며 runtime mock mode는 제거됐다.
- MVP RC 배포는 Docker Compose staging을 기준으로 한다.
- Public VPS 직접 노출이 가능하면 `deployment-vps.md`를 사용한다.
- 학교/온프레미스 NAT 제한 환경이면 `deployment-tunnel.md`를 사용한다.
- 실제 secret, DB password, tunnel token, staging env 파일은 repo에 커밋하지 않는다.
