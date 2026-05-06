# Travel Hunter 문서 인덱스

이 폴더는 production 앱 구현 기준 문서만 보관한다. 과거 단계별 계획 문서는 현재 기준 문서에 필요한 내용을 흡수한 뒤 삭제했다.

## 읽는 순서

1. `release-candidate-handoff.md`
   - MVP 릴리즈 후보 범위, 실행 모드, URL, 환경변수, release gate 통과 결과를 확인한다.
2. `current-work-spec.md`
   - 현재 구현 상태, 주요 위치, 완료/미완료 범위, 검증 명령을 확인한다.
3. `mvp-api-contract.md`
   - API request/response/error 계약을 확인한다.
4. `next-work-plan.md`
   - 바로 다음 구현 우선순위를 확인한다.
5. `db-schema-v0.3.sql`
   - ERD v0.3 SQL 기준본을 확인한다.

## 정리된 과거 문서의 대체 위치

| 과거 문서 성격 | 대체 위치 |
|----------------|-----------|
| 초기 production 전환 계획 | `current-work-spec.md`, `next-work-plan.md` |
| ERD/API 확정 전 준비 계획 | `mvp-api-contract.md`, `db-schema-v0.3.sql` |
| 완료된 정책 error path 테스트 계획 | `current-work-spec.md`, `CHECKLIST.md` |
| prototype route/source mapping | `current-work-spec.md`의 route mapping |

## Eval 문서

`.agent/evals` 파일은 삭제 대상이 아니다. 이 파일들은 구현 명세가 아니라 하네스 acceptance 기준이다.
