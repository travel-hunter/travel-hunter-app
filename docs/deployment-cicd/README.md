# 배포/CICD 문서

이 폴더에는 배포와 릴리스 판정에 꼭 필요한 문서만 남긴다.

## 유지 문서

1. `dev-deployment-architecture.md`
   - 개발 서버 배포 구조, Docker/Cloudflare Tunnel/Caddy 라우팅 설명, 운영 Runbook.
2. `09-release-checklist.md`
   - 배포 전후 smoke, rollback, 운영 확인 기준.
3. `dev-rc-handoff.md`
   - 개발 서버 release candidate 검증 결과와 운영 전환 담당자 인수인계 기준.

## 현재 기준

- 과거 handoff, staging 운영 메모, 개별 개발 가이드는 정리했다.
- 개발 서버 구조 이해와 Runbook은 `dev-deployment-architecture.md`를 먼저 보고, RC 판단은 `dev-rc-handoff.md`와 `09-release-checklist.md`를 따른다.
- 배포 실행과 현재 구현 기준은 `docs/implemented-feature-spec.md`, `docs/mvp-api-contract.md`, `docs/db-schema-current.md`, `deploy/.env.staging.example`, `deploy/.env.tunnel.example`를 따른다.
