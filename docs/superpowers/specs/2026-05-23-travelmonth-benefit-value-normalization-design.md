# TravelMonth Benefit Value Normalization Design

## Context

`travelmonth-44` displays a long condition sentence as the benefit amount. The collected record title is `웰촌 체험상품 30% 할인`, but the detail benefit text contains conditions and period wording without a `%`, `원`, or `무료` value. Because the normalizer only inspected `benefit_text`, `benefit_value_text` stayed empty and policy promotion fell back to the full condition sentence for `benefit_detail`.

## Decision

Use the title as a secondary benefit-value signal during TravelMonth normalization and policy promotion.

- Future collection parses benefit value from `title + benefit_text`.
- Existing stored source records are repaired when `promote_external_benefits_to_policies` runs again.
- The policy detail UI splits a trailing Korean period phrase from a mixed condition sentence, so condition and period content do not remain as one long list item.
- API shape and database schema stay unchanged.
- Policy summaries keep the source condition text; only the amount-style display field becomes concise.

## Expected Result

For records like `웰촌 체험상품 30% 할인`:

- `benefit_detail` becomes `최대 30%`.
- `policy_comment` can remain the descriptive condition text.
- Policy detail and list cards no longer show the full condition sentence as the primary benefit amount.
- The detail benefit card separates `온라인 체험상품 예약 결제 후 사용 완료 참여자` from `26년 4월 중순부터 5월 말`.

## Validation

Add regression tests for:

- The normalizer reading a percent from title when the detail text only contains conditions.
- Policy promotion deriving a missing percent value from title for already-collected records.
- Policy detail grouping separating condition text from trailing period text.
