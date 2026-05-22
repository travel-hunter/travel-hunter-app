# Official Benefit Policy Unification Design

## Summary

Travel Hunter의 사용자 노출 정책은 모두 공식 출처 기반 혜택으로 통합한다. 사용자가 보는 화면에서 `internal`, `external`, `공식 수집`, `내부 정책` 같은 구현 구분은 제거한다.

제품 기준은 다음과 같다.

- 사용자에게 노출되는 모든 정책은 official benefit이다.
- `external_source_records`는 공식 페이지에서 가져온 원문, 파싱 근거, freshness, confidence를 보존하는 수집 증거 테이블이다.
- `policies`는 저장, 일정 연결, 마이페이지, 알림, 추천 카드에 쓰는 정규화된 공식 혜택 테이블이다.
- 수집 원문은 사용자 화면에 바로 노출하지 않고, 검증/정규화 후 `policies`로 승격된 항목만 사용자 기능에 연결한다.

## Product Rules

- `/policies`, `/home`, `/trips/{id}`, `/trips/new`에서 노출되는 정책/혜택은 모두 공식 출처 기반으로 간주한다.
- 출처가 공식이라는 사실은 기본 전제이므로 정책 카드 tag로 반복 표시하지 않는다.
- 정책 카드 tag는 출처가 아니라 비교 가능한 혜택 정보만 표시한다.
  - 1순위: 혜택 금액 또는 할인율, 예: `최대 5만원`, `30% 할인`
  - 2순위: 혜택 유형, 예: `교통`, `숙박`, `지역할인`
  - 3순위: 상태 또는 마감, 예: `D-7`, `진행중`
- 정책 상세 CTA는 신청과 안내를 구분한다.
  - `applyUrl`이 있으면 `신청하러 가기`
  - `officialUrl`만 있으면 `혜택 안내 보기`
  - 둘 다 없으면 사용자 노출 대상에서 제외한다.
- `sourceType`은 API 호환을 위해 당장은 유지할 수 있지만 사용자 화면의 문구, 저장 가능 여부, 일정 연결 가능 여부를 가르는 기준으로 사용하지 않는다.

## Data Model Direction

현재 구조의 의미를 다음처럼 재정의한다.

- `external_source_records`
  - 공식 페이지 수집 원문을 보관한다.
  - 목록/상세 원문, 수집 URL, 공식 상세 URL, canonical key, 지역, 기간, 혜택 금액, 추론 style, freshness, confidence를 유지한다.
  - 운영 품질 확인과 정규화 입력으로 사용한다.
- `policies`
  - 앱 사용자 기능에 쓰는 official benefit 저장소다.
  - 정책 목록, 상세, 저장, 일정 연결, 알림, 마이페이지, 추천 정책 카드의 기준 데이터다.
  - 수동 seed 또는 수집 기반 여부와 관계없이 사용자에게 노출되는 항목은 공식 출처 URL을 가져야 한다.

목표 데이터 흐름은 다음과 같다.

```text
공식 페이지 수집
-> external_source_records 저장
-> 검증/정규화
-> policies upsert
-> /api/policies 노출
-> /home 추천
-> /trips/new 일정 생성
-> /trips/{id} 추천 정책 카드
-> /policies/{policySlug} 상세
```

## User-Facing Behavior

Phase 1에서는 사용자 경험을 먼저 정리한다.

- 카드와 상세에서 `공식 수집`, `내부 정책`, `external` 문구를 제거한다.
- 모든 정책 카드는 같은 official benefit 카드처럼 보인다.
- 상세 CTA의 `공식 안내 확인` 문구는 `혜택 안내 보기`로 바꾼다.
- 사용자가 보는 tag는 금액, 혜택 유형, 마감 상태 중 하나로 계산한다.
- 외부 수집 여부가 화면의 시각적 계층이나 문구를 바꾸지 않는다.

정규화가 끝나기 전까지 저장/일정 담기는 `policies`에 존재하는 항목만 안정적으로 지원한다. 이 제한은 사용자가 `internal/external` 차이를 느끼지 않도록 노출 기준과 기능 기준을 맞춰 해결한다.

## Migration Work

후속 migration은 수집 원문 직접 노출을 제거하고, 정규화된 official benefit만 사용자 화면에 노출하기 위한 작업이다.

포함 작업:

1. `external_source_records`에서 `policies`로 승격하는 service를 추가한다.
2. 중복 방지를 위한 canonical key와 slug 생성 규칙을 확정한다.
3. `policies`에 출처 추적 필드를 추가할지 검토한다.
   - `sourceName`
   - `sourceRecordId`
   - `sourceUrl`
   - `verificationStatus`
   - `lastVerifiedAt`
4. 기존 `travelmonth-{id}` 상세 route 처리 방침을 결정한다.
   - 단기: 기존 상세 유지 또는 정규화 정책으로 redirect
   - 장기: raw external 상세 직접 노출 제거
5. `/api/policies`에서 raw `external_source_records` 직접 병합을 제거한다.
6. 추천 API와 일정 상세 추천 카드가 정규화된 `policies`만 사용자 링크로 반환하도록 변경한다.
7. 저장, 일정 연결, 마이페이지, 알림이 모든 노출 정책에 동일하게 적용되는지 검증한다.
8. API 계약과 `.agent/evals`에서 `sourceType=external` 사용자 노출 설명을 제거하거나 deprecated 처리한다.
9. 수집 품질 Ops API는 유지하되 사용자 정책 목록과 분리한다.
10. 기존 테스트의 `travelmonth-{id}` 직접 노출 기대값을 정규화 정책 slug 기준으로 갱신한다.

## Implementation Phases

### Phase 1. User-Facing Cleanup

- `/policies`, `/policies/{slug}`, `/home`, `/trips/{id}`, `/trips/new`에서 출처 구분 문구를 제거한다.
- 정책 카드 tag 계산을 금액, 혜택 유형, 상태 중심으로 바꾼다.
- 상세 CTA 문구를 `혜택 안내 보기`로 조정한다.
- 공식 URL이 없는 정책은 사용자 목록에서 제외하는 기준을 문서화하고 테스트한다.

### Phase 2. Normalized Official Benefit Model

- `external_source_records -> policies` 승격 service를 추가한다.
- TravelMonth 수집 결과를 검증/정규화해 `policies`에 upsert한다.
- `policies` 출처 추적 필드와 migration 필요 여부를 확정한다.
- `/api/policies`를 `policies` 기준 반환으로 단순화한다.
- `travelmonth-{id}` route를 redirect 또는 deprecated 처리한다.

### Phase 3. Feature Consistency

- 모든 노출 정책에서 저장, 일정 담기, 마이페이지, 알림 기준을 동일하게 맞춘다.
- 일정 상세 추천 정책은 정규화된 `policies`만 반환한다.
- 지역 추천은 `external_source_records`의 품질/수집 근거를 활용할 수 있지만, 사용자에게 보여주는 정책 링크는 `policies.slug`로 연결한다.
- Ops API는 수집 품질 확인용으로 유지한다.

## Testing Strategy

Backend:

- `GET /api/policies`가 공식 URL이 있는 official benefit만 반환하는지 검증한다.
- raw `external_source_records`가 직접 정책 목록에 섞이지 않는지 검증한다.
- 승격 service가 중복 없이 `policies`를 upsert하는지 검증한다.
- 저장과 일정 연결이 정규화된 TravelMonth 혜택에서도 동작하는지 검증한다.
- 기존 `travelmonth-{id}` route의 redirect 또는 deprecated 동작을 검증한다.

Frontend:

- `/policies` 카드에 `공식 수집`, `내부 정책`, `external` 문구가 없는지 검증한다.
- 정책 tag가 금액, 카테고리, 상태 기준으로 표시되는지 검증한다.
- 상세 CTA가 `혜택 안내 보기`로 표시되는지 검증한다.
- 일정 상세 추천 정책 카드가 실제 상세 페이지로 이동하는지 검증한다.

E2E:

- 수집 실행, 정규화, 정책 목록 노출, 상세 이동, 일정 생성, 추천 정책 상세 이동까지 smoke한다.
- 360/390/430px 모바일 폭에서 정책 카드, 탭, 상세 CTA가 깨지지 않는지 확인한다.

Docs and evals:

- `docs/current-work-spec.md`
- `docs/mvp-api-contract.md`
- `docs/next-work-plan.md`
- `.agent/evals/api-contract-golden.json`
- `CHECKLIST.md`

## Risks And Controls

- 수집 원문을 바로 숨기면 정책 수가 줄어 보일 수 있다. Phase 1에서는 화면 문구를 먼저 정리하고, Phase 2에서 승격 service로 노출량을 회복한다.
- `sourceType` 제거를 한 번에 하면 API 소비자와 테스트가 크게 흔들릴 수 있다. 우선 deprecated/internal diagnostic 필드로 유지하고 화면 분기에서 제거한다.
- `travelmonth-{id}` 링크가 이미 일정 추천이나 smoke에 쓰인다. migration 동안 redirect 또는 backward-compatible 상세 처리를 둔다.
- 공식 URL이 없는 seed 정책은 노출 기준에서 빠질 수 있다. seed 검증에서 official/apply URL 품질을 강제한다.

## Next Step

이 설계가 승인되면 `superpowers:writing-plans`를 사용해 구현 계획을 작성한다. 구현은 Phase 1 사용자 노출 정리부터 시작하고, 데이터 승격 migration은 별도 task로 분리한다.
