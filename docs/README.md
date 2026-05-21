# Travel Hunter 문서 인덱스

`docs/` 루트는 현재 개발과 운영에 바로 필요한 핵심 문서만 유지한다. 과거 분석, 완료된 계획, 일회성 감사 문서는 삭제했고 필요하면 Git history에서 확인한다.

## 핵심 문서

1. `requirements.md`
   - 제품 요구사항, 사용자 역할, 기능/비기능 요구사항, 조건부/후속 범위.
2. `current-work-spec.md`
   - 현재 구현 상태, 조건부 항목, 다음 작업 방향의 단일 요약.
3. `implemented-feature-spec.md`
   - 실제 구현된 사용자 동작과 API/DB 연결 명세.
4. `mvp-api-contract.md`
   - API request/response/error 계약.
5. `next-work-plan.md`
   - 다음 작업 우선순위.
6. `db-schema-current.md`, `db-schema-current.sql`
   - 현재 Alembic head 기준 DB schema 문서와 SQL 산출물.

## 실행과 배포

- `local-dev-runtime.md`: 개발 중 기본 실행 방식. Docker는 `db/backend`만 실행하고 frontend는 `127.0.0.1:5173` Vite dev server로 확인한다.
- `deployment-cicd/README.md`: GitHub, WSL/Docker 개발 환경, 프론트/백/DB/AI 작업 설명서, Jenkins 계획, Cloudflare Tunnel 기준 release checklist.

## 회의와 보고

- `meeting-briefs/travel-hunter-dev-status-2026-05-20.md`: Notion에 붙여넣기 위한 대표/PM 회의용 개발 현황 상세 보고서.

## 디자인 기준

- `design-system-map.md`: 현재 UI token과 주요 컴포넌트 매핑.

## 현재 기준

- 앱은 DB-backed-only로 동작하며 runtime mock mode는 제거된 상태다.
- 배포 문서는 `docs/deployment-cicd/`만 기준으로 유지한다.
- 기본 공개 방식은 Cloudflare Tunnel이다.
- 실제 secret, DB password, tunnel token, staging env 파일은 repo에 커밋하지 않는다.
- 작업/기여 규칙은 루트 `CONTRIBUTING.md`를 따른다.
