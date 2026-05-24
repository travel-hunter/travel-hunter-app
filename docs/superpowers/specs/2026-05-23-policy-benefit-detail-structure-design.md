# Policy Benefit Detail Structure Design

## Context

Some collected policy summaries contain several benefit facts in one long sentence. Rendering that text directly in the policy detail highlight box makes the support content hard to scan, especially when the summary mixes period, discount, evidence, and caution notes.

## Decision

Use a hybrid approach:

- Keep the existing API shape and source data unchanged.
- Structure the policy detail display in the frontend from the existing `Policy.summary` and `Policy.amount` fields.
- Split long benefit text on source separators such as `·`, `※`, and numbered clauses.
- Classify display fragments into `핵심 혜택`, `운영 기간`, `이용 조건`, and `유의사항`.
- Keep the original amount as the top visual anchor.

## Classification Rules

- Period signals include words such as `기간`, `매주`, `주말`, `평일`, `사전예약`, `이용일`, and `예약`.
- Condition signals include words such as `제시`, `캡쳐`, `캡처`, `조건`, `대상`, `확인`, and `필요`.
- Notice signals include leading `※` notes, except capture/evidence notes that are better understood as conditions.
- Benefit signals include discount, support, free, cashback, refund, price, amount, percent, and point wording.
- If no benefit item is detected, fall back to the policy amount as a benefit item.

## UI

The support section remains in the existing policy detail order. The old single `.meta` paragraph is replaced by grouped list cards inside the highlight box, so each item can be scanned independently without losing the existing visual emphasis.

## Testing

Add a frontend regression test with a long real-world style summary. The test verifies that the support section exposes the amount, the four expected groups, representative fragments, and no longer renders the old `.highlight-box .meta` blob.

## Future Work

Backend/source normalization can later store structured benefit fields directly. This frontend helper should then become a compatibility fallback for older or partially normalized records.
