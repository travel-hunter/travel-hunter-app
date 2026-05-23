# 배포/CICD 문서

이 폴더는 Travel Hunter 팀의 GitHub 협업, 개발 환경, Docker 배포, Jenkins CD 계획, 운영 점검 절차를 한곳에 모은 실행 문서다.

기존 `docs/` 루트 문서는 제품/API/기능 명세의 원본으로 유지한다. 팀원이 배포나 개발 환경을 세팅할 때는 이 폴더부터 읽고, 세부 근거가 필요할 때 기존 문서를 참조한다.

## 추천 읽는 순서

1. `01-github-workflow.md`
   - 브랜치, PR, push, release 기준.
2. `02-local-dev-setup.md`
   - WSL, Docker Engine, 로컬 실행.
3. `03-frontend-guide.md`
   - 프론트 작업 규칙과 검증.
4. `04-backend-guide.md`
   - 백엔드 작업 규칙과 검증.
5. `05-db-guide.md`
   - PostgreSQL, Alembic, seed, backup.
6. `06-ai-workflow.md`
   - AI/Codex 작업 분리와 검증.
7. `07-infrastructure.md`
   - 개발 PC, 운영 PC, 도메인, Cloudflare Tunnel.
8. `08-jenkins-pipeline.md`
   - Jenkins credentials, pipeline, 배포 흐름.
9. `09-release-checklist.md`
   - 배포 전후 점검, smoke test, rollback.
10. `release-handoff-2026-05-20.md`
   - 현재 `develop` staging smoke 후보의 검증 증거, 실행 순서, 남은 위험.
11. `staging-ops-work-orders.md`
   - 외주/인프라 담당자용 남은 운영 검증 작업지시서.
12. `staging-env-readiness-2026-05-23.md`
   - 실제 secret 값을 노출하지 않는 Cloudflare Tunnel staging env 준비 상태 점검 기록.

## 역할별 빠른 경로

- 프론트 개발자: `01` -> `02` -> `03` -> `09`
- 백엔드 개발자: `01` -> `02` -> `04` -> `05` -> `09`
- DB 담당자: `01` -> `05` -> `07` -> `09`
- AI 작업 담당자: `01` -> `06` -> 변경 영역의 프론트/백엔드 문서 -> `09`
- 배포 담당자: `01` -> `07` -> `staging-ops-work-orders` -> `09` -> `08`

## 기본 운영 결정

- 목표 브랜치 전략: `feature/*` -> `develop` -> `main`
- 현재 전환 상태: 기존 작업 브랜치에서 진행 중인 변경은 `develop`으로 합류시킨 뒤 위 전략을 적용한다.
- CI: GitHub Actions가 PR/push 검증을 담당한다.
- CD 계획: Jenkins는 다음 단계에서 개발 PC에 설치하고 운영 PC에 SSH로 배포하도록 구현한다.
- 공개 방식: Cloudflare Tunnel을 기본으로 한다.
- 서버 구성: 개발 PC와 운영 PC를 분리한다.
- secret 관리: 실제 `.env`, DB password, OAuth secret, tunnel token은 repo에 커밋하지 않는다.

## GitHub 배포 기준 흐름

GitHub에는 Docker 이미지 archive가 아니라 이미지를 재생성할 수 있는 원본을 올린다.

```text
프로젝트 폴더 정리
-> .env, secret, 임시 이미지 파일 제외 확인
-> source code, Dockerfile, compose, docs push
-> 서버 또는 Jenkins가 repo pull/checkout
-> docker compose build
-> migration
-> docker compose up -d
```

`travel-server-images.tar.gz` 같은 파일은 임시 이미지 전달물이다. 운영 PC에서 빠른 확인용으로 `docker load` 할 수는 있지만, 장기 배포 기준은 GitHub source와 Dockerfile/Compose build다.

## 원본 문서

- API 계약: `../mvp-api-contract.md`
- 현재 구현 명세: `../current-work-spec.md`
- 로컬 개발 런타임: `../local-dev-runtime.md`
- 현재 DB schema: `../db-schema-current.md`, `../db-schema-current.sql`

## 최근 Handoff

- `release-handoff-2026-05-20.md`: numeric trip id 정책 정리 이후 `develop` staging smoke 후보.
- `staging-ops-work-orders.md`: 실제 domain/provider/env 준비 후 남은 운영 검증 지시서.
- `staging-env-readiness-2026-05-23.md`: local `deploy/.env.tunnel`의 placeholder 상태와 OPS-02 전 blocker 점검 기록.
