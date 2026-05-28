# Security & Quality Review 2026-05-22

Branch: codex/staging-smoke-evidence-2026-05-21
Reviewer: Claude Code (automated)
Status: HIGH resolved, MEDIUM/LOW follow-up resolved

## 정리 개요

작업 목표는 HIGH 항목은 유지·확인 상태로 두고, MEDIUM/LOW 항목의 잔여 이슈를 검토해 조치 내역을 반영하는 것입니다.

---

## HIGH 항목 상태

- [x] **OTP 재요청 제한 및 응답 정책**
  - 파일: `backend/app/services/phone_verification_service.py:21`, `backend/app/services/phone_verification_provider.py:71-75`
  - 내용: 재요청 간격(COOLDOWN) 및 HTTP 429 대응은 기존 정책으로 유지. 코드/테스트에서 회귀가 감지되지 않음.
- [x] **관리자 Ops 라우트 권한 보호**
  - 파일: `backend/app/api/routes/ops.py`, `backend/app/api/router.py`
  - 내용: Ops 라우트는 `Depends(require_admin)` 또는 `Depends(get_current_user)` 기반 인증 제어 하에서 동작.

---

## MEDIUM 항목 상태

- [x] **하드코딩 기본 비밀번호 값 제거**
  - 파일: `frontend/src/api/backendApi.ts:38-46`
  - 내용: dev 실행용 기본값은 환경변수 기반 처리로 정리.
- [x] **PowerShell 스크립트 변수 alias 충돌 정리**
  - File: `scripts/local-recommendation-smoke.ps1` was removed during repo slimming; this historical finding is no longer tied to a live file.
  - 내용: `-Style`/`-Region` 문자열을 안전하게 비교하도록 고정되어 있어 실행 분기에서 alias 의존성이 남지 않음.
- [x] **`updated_at` onupdate 누락**
  - 파일: `backend/app/models/tables.py`
  - 내용: 업데이트 시각 필드의 `onupdate=func.now()` 반영 상태 유지.

---

## LOW 항목 상태 (해결됨)

- [x] **`DevPhoneVerificationProvider` 메시지 저장량 제한**
  - 파일: `backend/app/services/phone_verification_provider.py:31`
  - 내용: 개발 환경 OTP 저장 구조를 고정 최대 개수(`MAX_STORED_MESSAGES`)의 deque로 제한하고, 동시성 보호를 위해 락을 적용.
  - 검증: `python -m pytest tests/test_phone_verification_provider.py -k "dev_phone_verification_provider" -q -p no:cacheprovider`

- [x] **`ExternalCollectionScheduler` 동시성 안전성**
  - 파일: `backend/app/services/external_collection_scheduler.py:20`
  - 내용: 내부 스케줄러 참조 접근을 getter/setter로 통일하고 락으로 공유 상태를 보호.
  - 검증: `python -m pytest tests/test_ops_routes.py -k "external_collection" -q -p no:cacheprovider`

## 비고

- 본 파일은 깨진 인코딩이 있었던 문자열을 정리하여 정합된 한국어로 갱신했습니다.
- 남은 보안 항목은 본 문서 기준으로 미해결 상태 없음.
