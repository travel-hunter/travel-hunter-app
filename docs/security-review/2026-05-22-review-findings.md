# Security & Quality Review — 2026-05-22

Branch: codex/staging-smoke-evidence-2026-05-21
Reviewer: Claude Code (automated)
Status: HIGH resolved — MEDIUM/LOW follow-up remains

## 사용 방법

각 항목을 수정한 뒤 `- [ ]` → `- [x]`로 변경하고, 확인 명령을 실행해 결과를 기록한다.
모든 HIGH 항목이 `[x]`가 되어야 main 병합이 허용된다. MEDIUM/LOW는 후속 개선 항목으로 추적한다.

---

## HIGH — 병합 전 필수 수정

- [x] **OTP 재전송 서버 쿨다운 미적용**
  파일: `backend/app/services/phone_verification.py:21,71-75`
  문제: `RESEND_COOLDOWN_SECONDS = 60`이 응답에만 반환되고 서버에서 검증되지 않음. SMS 플러딩 가능.
  수정: 마지막 전송 시각을 DB 또는 Redis에 기록하고 60초 이내 재전송 요청은 HTTP 429 반환.
  확인:
  ```bash
  grep -n "RESEND_COOLDOWN" backend/app/services/phone_verification.py
  # send_otp() 안에 cooldown 검사 로직이 있어야 한다
  cd backend && python -m pytest tests/ -k "phone_verification" -v
  ```
  결과: `python -m pytest tests/test_phone_verification_service.py tests/test_profile_db_routes.py tests/test_phone_verification_provider.py -q -p no:cacheprovider` → 21 passed.

- [x] **운영 Ops 엔드포인트 인증 없음**
  파일: `backend/app/api/routes/ops.py`, `backend/app/api/router.py`
  문제: `GET /api/ops/external-collection` 및 `GET /api/ops/external-collection/quality`에 auth 의존성 없음. 스케줄러 상태·에러 메시지가 공개 노출.
  수정: 두 엔드포인트 또는 ops 라우터에 `Depends(require_admin)` 또는 `Depends(get_current_user)` 추가.
  확인:
  ```bash
  grep -n "require_admin\|get_current_user\|Depends" backend/app/api/routes/ops.py
  # 적어도 한 줄 이상 결과가 있어야 한다
  cd backend && python -m pytest tests/ -k "ops" -v
  ```
  결과: `python -m pytest tests/test_ops_routes.py tests/test_external_collection_scheduler.py -q -p no:cacheprovider` → 19 passed.

---

## MEDIUM — 권장 수정

- [ ] **프론트엔드 번들에 하드코딩된 password123**
  파일: `frontend/src/api/backendApi.ts:38-46`
  문제: `defaultLogin`·`defaultSignup` 객체의 `"password123"` 리터럴이 프로덕션 번들에 포함됨.
  수정: `import.meta.env.VITE_DEV_PASSWORD` 등 환경 변수로 대체하거나 기본값 객체를 dev 빌드에서만 포함.
  확인:
  ```bash
  grep -rn "password123" frontend/src/
  # 결과가 없어야 한다 (테스트/주석 파일 외)
  cd frontend && npm run build 2>&1 | tail -5
  ```

- [x] **PowerShell 스모크 스크립트 코드 인젝션 위험**
  파일: `scripts/local-recommendation-smoke.ps1:147-192`
  문제: `-Style`/`-Region` 인자가 alias 사전에 없을 때 Python heredoc에 직접 보간됨. 악의적 값으로 임의 Python 코드 실행 가능.
  수정: alias 사전에 없는 값은 스크립트 초반에 `throw "Unknown style: $Style"` 처리.
  확인:
  ```powershell
  Select-String -Path scripts/local-recommendation-smoke.ps1 -Pattern "Unknown style|Unknown region|throw.*Style|throw.*Region"
  # 결과가 있어야 한다
  ```

- [ ] **updated_at 컬럼 onupdate 누락**
  파일: `backend/app/models/tables.py`
  문제: `updated_at` 컬럼이 `server_default=func.now()`만 있고 `onupdate=func.now()` 없음. 행 갱신 시 자동 업데이트 안 됨.
  수정: 각 테이블 `updated_at` 컬럼에 `onupdate=func.now()` 추가.
  확인:
  ```bash
  grep -n "updated_at" backend/app/models/tables.py
  # onupdate 가 포함된 줄이 보여야 한다
  ```

---

## LOW — 개선 권장 (병합 차단 아님)

- [ ] **프로필 지역 랭킹 우선순위 낮음**
  파일: `backend/app/services/region_recommendations.py:109-117`
  문제: `_ranking_key` 튜플에서 `profile_region_match`가 `style_matched_count`보다 낮은 우선순위. 사용자 선호 지역이 스타일보다 덜 반영됨.
  확인:
  ```bash
  grep -A 10 "_ranking_key" backend/app/services/region_recommendations.py
  ```

- [ ] **DevPhoneVerificationProvider 모듈 수준 싱글톤**
  파일: `backend/app/services/phone_verification_provider.py:31`
  문제: `dev_phone_verification_provider`가 모듈 수준에 생성됨. 테스트 간 `sent_messages` 공유 위험.
  확인:
  ```bash
  grep -n "dev_phone_verification_provider" backend/app/services/phone_verification_provider.py
  cd backend && python -m pytest tests/ -k "phone" --tb=short
  ```

- [ ] **ExternalCollectionScheduler 전역 상태**
  파일: `backend/app/services/external_collection_scheduler.py:20`
  문제: `_active_external_collection_scheduler` 모듈 수준 전역 변수. 테스트 격리 문제 가능성.
  확인:
  ```bash
  grep -n "_active_external_collection_scheduler" backend/app/services/external_collection_scheduler.py
  ```
