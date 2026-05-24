# My Page Favorite Emoji Thumbnails Implementation Plan

**Goal:** Restore policy-nature thumbnail icons on `/mypage` favorite policy cards while preserving the no-overflow DS card layout.

**Scope:** Frontend-only. No API, saved-policy, or backend changes.

## Requirements

- Favorite policy thumbnails should use compact emoji symbols, not Korean one-character category labels.
- The thumbnail must still fit inside `.ds-favorite-policy-thumb` without wrapping or overflowing.
- Category and title signals should map to intuitive policy icons, with pass/ticket-style benefits taking priority over secondary discount targets:
  - 관광주민증, 입장료, 체험, 할인권, 이용권, 티켓 text: 🎫
  - 숙박 or 숙소/호텔 text: 🏨
  - 교통, KTX, 기차, 버스, 렌터카, 항공 text: 🚆
  - 맛집 or 식사/음식 text: 🍽️
  - 지역할인 category or 지역/관광 text: 🏷️
  - 기타/default: 🎁
- Existing favorite card title/amount truncation and remove button behavior must remain unchanged.

## Implementation Steps

1. Update the `/mypage` saved-policy regression test so the thumbnail is asserted as an emoji-like symbol and not the old `"혜"` label.
2. Update `policyIcon(policy)` in `frontend/src/pages/MyPage.tsx` to score policy `category`, `title`, `tag`, and `amount` text into the emoji mappings above.
3. Keep `.ds-favorite-policy-thumb` CSS as a fixed square icon slot; only adjust if visual QA shows emoji clipping.
4. Run focused frontend tests, typecheck, build, Docker rebuild, and Playwright visual verification on `/mypage`.
5. Record validation in `CHECKLIST.md` and commit the scoped change.
