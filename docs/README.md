# Travel Hunter 문서 인덱스

## 먼저 읽을 문서

1. `requirements.md`
   - 제품 요구사항, 사용자 역할, 기능/비기능 요구사항, 조건부/후속 범위.
2. `current-work-spec.md`
   - 현재 구현 상태의 단일 요약 명세.
3. `implemented-feature-spec.md`
   - 실제 구현된 사용자 동작과 API/DB 연결 명세.
4. `feature-implementation-status.md`
   - 기능군별 Complete/Conditional/Partial 상태표.
5. `mvp-api-contract.md`
   - API request/response/error 계약.
6. `deployment-tunnel.md`
   - NAT 제한 환경 Cloudflare Tunnel staging runbook.
7. `deployment-vps.md`
   - public VPS 직접 노출 staging runbook.
8. `next-work-plan.md`
   - 다음 작업 우선순위.

## 운영/배포 보조 문서

- `release-candidate-handoff.md`: MVP RC 범위, 실행 모드, 테스트 계정, 검증 결과.
- `vps-staging-inputs.md`: VPS staging 입력값과 secret 처리 기준.
- `local-lan-access.md`: 같은 네트워크에서 개발 서버를 공유하는 LAN runbook.
- `password-reset-smtp-smoke.md`: password reset SMTP staging smoke 절차와 blocker.
- `codex-model-workflow.md`: planning `gpt-5.5/xhigh` + implementation `gpt-5.3-codex/high` 실행 규칙.

## 기능/설계 보조 문서

- `notification-delivery-plan.md`: 마감 알림 발송 기반 설계(대상 계산, scheduler, SOLAPI).
- `frontend-feature-work-plan.md`: 배포 smoke 이후 진행할 frontend 기능 추가 후보와 첫 구현 순서.
- `pwa-offline-strategy.md`: service worker/offline cache 도입 안전 기준.
- `draft-autosave-next-scope.md`: draft autosave 2차 범위와 개인정보 저장 제외 기준.
- `benchmark-ildan-checkin.md`: 벤치마크 분석과 적용 후보.

## 디자인/구조 보조 문서

- `project-structure-audit.md`: 폴더/파일 구조 점검과 정리 후보.
- `design-system-map.md`: Wanted Design System과 코드 토큰/컴포넌트 매핑.
- `figma-import-checklist.md`: Wanted `.fig` import와 component 확인표.
- `figma-component-values.md`: Figma component 수치 원본.
- `db-schema-v0.3.sql`: ERD v0.3 SQL 기준본.

## 현재 기준

- 앱은 DB-backed-only로 동작하며 runtime mock mode는 제거된 상태다.
- 배포 기준은 Docker Compose staging이며, VPS direct mode와 Tunnel mode를 분리해 운영한다.
- 실제 secret, DB password, tunnel token, staging env 파일은 repo에 커밋하지 않는다.
- 협업/기여 규칙은 루트 `CONTRIBUTING.md`를 기준으로 한다.
