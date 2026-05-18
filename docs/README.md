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
6. `next-work-plan.md`
   - 다음 작업 우선순위.

## 개발/공유 런타임

- `local-dev-runtime.md`: 개발 중 기본 실행 방식. Docker는 `db/backend`만 실행하고 frontend는 `127.0.0.1:5173` Vite dev server로 확인한다.
- `local-lan-access.md`: 개발 완료 후 강의실 같은 네트워크에 공유할 때만 사용하는 LAN 접근 runbook.

## 운영/배포 문서

- `deployment-tunnel.md`: NAT 제한 환경 Cloudflare Tunnel staging runbook.
- `deployment-vps.md`: public VPS 직접 노출 staging runbook.
- `vps-staging-inputs.md`: VPS staging 입력값과 secret 처리 기준.
- `password-reset-smtp-smoke.md`: password reset SMTP staging smoke 절차와 blocker.
- `codex-model-workflow.md`: planning `gpt-5.5/xhigh` + implementation `gpt-5.3-codex/high` 실행 규칙.

## 기능/설계 보조 문서

- `notification-delivery-plan.md`: 마감 알림 발송 기반 설계.
- `frontend-feature-work-plan.md`: frontend 기능 추가 후보와 구현 순서.
- `pwa-offline-strategy.md`: service worker/offline cache 도입 기준.
- `draft-autosave-next-scope.md`: draft autosave 2차 범위.
- `service-readiness-hardcoding.md`: seed/demo 데이터, 고정 날짜, 표시값, 운영 설정 guard 정리 기준.
- `benchmark-ildan-checkin.md`: 일단체크인 벤치마크 분석과 적용 후보.
- `prototype-ux-flow-analysis.md`: 업로드 HTML 프로토타입의 사용자 경험 흐름 분석.

## 디자인/구조 보조 문서

- `project-structure-audit.md`: 폴더/파일 구조 점검과 정리 후보.
- `claude-design-handoff.md`: Claude.ai/design frontend design handoff, allowed visual changes, protected behavior, and verification checklist.
- `design-system-map.md`: Wanted Design System과 코드 토큰/컴포넌트 매핑.
- `figma-import-checklist.md`: Wanted `.fig` import와 component 확인 결과.
- `figma-component-values.md`: Figma component 수치 원본.
- `db-schema-v0.3.sql`: ERD v0.3 SQL 기준본.

## 현재 기준

- 앱은 DB-backed-only로 동작하며 runtime mock mode는 제거된 상태다.
- 개발 중 화면 확인은 `docs/local-dev-runtime.md` 기준으로 진행한다.
- 강의실 공유/LAN 노출은 개발 완료 후 `docs/local-lan-access.md` 기준으로 별도 적용한다.
- 실제 secret, DB password, tunnel token, staging env 파일은 repo에 커밋하지 않는다.
- 작업/기여 규칙은 루트 `CONTRIBUTING.md`를 따른다.
