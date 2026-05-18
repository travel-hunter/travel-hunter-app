# Claude.ai/design Frontend Design Handoff

## Purpose

Use this document when asking Claude.ai/design to refine the Travel Hunter frontend. The goal is to improve the current React UI against the Prototype mobile-app direction while preserving all DB-backed product behavior.

Claude may change JSX visual structure, CSS classes, component layout, visual hierarchy, and Korean UI copy. Claude must not change API behavior, database schema, route URLs, authentication/session behavior, or working feature logic.

## Current Frontend Structure

Travel Hunter is a React + Vite frontend.

Main files:

- `frontend/src/app/App.tsx`: route definitions.
- `frontend/src/components/AppLayout.tsx`: `PublicLayout`, `ServiceLayout`, and bottom tab shell.
- `frontend/src/pages/HomePage.tsx`: `/home`.
- `frontend/src/pages/PolicyPages.tsx`: `/policies`, `/policies/:policyId`.
- `frontend/src/pages/ItineraryPages.tsx`: `/trips`, `/trips/new`, `/trips/:tripId`, `/ai-results`, `/friend-invite`.
- `frontend/src/pages/MyPage.tsx`: `/mypage`.
- `frontend/src/styles/tokens.css`: design tokens.
- `frontend/src/styles/app.css`: most screen-level visual styling.

Current design direction:

- Prototype HTML based mobile-app UI.
- Primary color: `#ff5e5b`.
- Soft red backgrounds: `#fff5f4`, `#ffe5e4`.
- Dark text: `#1a1a2e` or the current ink token.
- App background: `#f5f5f7`, unless a specific Prototype screen requires another background.
- Bottom tab height: `83px`.
- Auth screens use a centered `440px` frame.
- Service screens use mobile `100vw` and desktop `760px` to `820px` centered app frame.

## Allowed Changes

Claude may freely change:

- Visual JSX structure and section ordering.
- CSS class names and styles.
- `app.css` and `tokens.css` values when they improve design consistency.
- Card, button, tab, sheet, dialog, timeline, hero, rail, and CTA hierarchy.
- Korean UI copy.
- Duplicate UI that conflicts with Prototype hierarchy.
- Mobile and desktop responsive layout.

Claude should keep changes frontend-only unless explicitly instructed otherwise.

## Do Not Change

Claude must not change:

- Backend API.
- Database schema or Alembic migrations.
- Route URLs.
- The meaning of `appDataApi` calls.
- Login, signup, session, OAuth, password reset, and redirect behavior.
- Actual save, delete, edit, invite, notification, favorite, policy attach, and trip-place logic.
- Drag-and-drop place movement behavior.
- Mock data, mock login, or fake API flows.

The source of truth remains the backend API and PostgreSQL. Prototype mock data and mock navigation must not be copied into the production React app.

## Screen Priorities

1. `/trips/:id`
   - Match Schedule Detail V2.
   - Refine hero, connected policy, matching policy rail, Day tab, List/Map toggle, and timeline.
   - Preserve place CRUD, DnD movement, invite, AI recommendation, and list/map URL state.

2. `/trips` and `/trips/new`
   - Refine trip list cards, status chips, delete button, new trip entry, and the three-step create wizard.
   - Preserve draft autosave, trip creation, policy attach, status save, and delete confirmation.

3. `/policies` and `/policies/:policyId`
   - Refine policy list cards, filters, category tabs, favorite button, detail hero, sections, and sticky CTA.
   - Preserve search/filter, save, share, official/apply CTA semantics, and trip picker.

4. `/mypage`
   - Refine profile card, stats, saved policies, settings rows, and sheets.
   - Preserve profile editing, nickname suggestion, contact save, deadline notification toggle, saved policy removal, and logout.

5. `/home`
   - Refine search pill, hero, policy rail, destination rail, and AI recommendation card.
   - Preserve links to policy detail, trip creation, my page, and real policy-driven destination data.

## Recommended Claude Prompt

```text
Travel Hunter 프론트 디자인을 Prototype 기준으로 개선해줘.

현재 프로젝트는 React + Vite이고, 주요 화면은 다음 파일에 있어:
- frontend/src/pages/HomePage.tsx
- frontend/src/pages/PolicyPages.tsx
- frontend/src/pages/ItineraryPages.tsx
- frontend/src/pages/MyPage.tsx
- frontend/src/components/AppLayout.tsx
- frontend/src/styles/app.css
- frontend/src/styles/tokens.css

변경 가능:
- JSX 구조의 시각적 재배치
- CSS 클래스/스타일 수정
- 카드, 버튼, 탭, sheet, dialog, timeline, hero, rail, CTA의 시각 위계 수정
- 문구 정리
- 화면 섹션 순서 조정
- Prototype과 맞지 않는 중복 UI 제거
- 모바일/데스크톱 반응형 조정

변경 금지:
- Backend API
- DB schema/migration
- route URL
- appDataApi의 기능 의미
- auth/session/redirect 로직
- 실제 저장/삭제/수정 기능
- DnD 장소 이동 기능
- mock data/mock login 도입

디자인 기준:
- Prototype HTML 기반 모바일 앱 UI
- primary color는 #ff5e5b
- bottom tab은 83px
- 서비스 화면은 모바일 100vw, 데스크톱 760~820px 중앙 프레임
- 기능보다 시각 위계와 사용 흐름을 정리하는 것이 목표

우선순위:
1. /trips/:id 상세 일정 화면
2. /trips 목록/생성 화면
3. /policies 목록/상세 화면
4. /mypage
5. /home

작업 결과는 다음 기준을 만족해야 해:
- 기존 기능이 사라지지 않아야 함
- typecheck/test/build가 통과해야 함
- 화면은 390x844, 440x900, 1440x1000에서 깨지지 않아야 함
- Prototype과 다른 색상/간격/카드 위계를 최대한 줄여야 함
```

## What To Attach

Attach only the context needed for the current design pass:

- Current screen screenshot.
- Target Prototype screenshot.
- Current DevTools selector when pointing at a precise element.
- Target `outerHTML` or copied style when exact spacing/color is needed.
- Prototype HTML files when needed:
  - `Travel Hunter Prototype (Bundle).html`
  - `Schedule Detail V2 - Toggle View.html`

Good issue examples:

- `Day tab 배경이 주변과 다름`.
- `추천 정책 카드가 2열이라 Prototype rail과 다름`.
- `hero 날짜 이모지가 Prototype과 다름`.
- `하단 tab과 sticky CTA가 겹침`.

Avoid vague requests such as `이거 똑같이 해줘` without a URL, screenshot, selector, or expected result.

## Design Code Packet

Do not give Claude the whole repository as the first input. Build a screen-level packet instead. Each packet should contain the target Prototype code, the current React code boundary, the current CSS boundary, the exact selector or copied style for the issue, screenshots, and the protected behavior list.

Use this order when pasting context into Claude:

1. Target screen and expected result.
2. Current visual problem.
3. Target Prototype code excerpt.
4. Current React code excerpt.
5. Current CSS excerpt.
6. DevTools selector, `outerHTML`, or copied style.
7. Allowed visual changes.
8. Protected behavior.
9. Verification commands.

### Target Prototype Code

Attach the full Prototype HTML file when useful, but paste only the relevant screen block into the prompt. For `Schedule Detail V2 - Toggle View.html`, the important blocks are:

- Color constants: `const C = {...}`.
- Mock display data: `schedule`, `linkedPolicies`, `matchingPolicies`.
- Hero area.
- Connected policy card.
- Matching policy horizontal rail.
- List/Map toggle.
- Timeline item.
- Map placeholder and bottom sheet if the task touches map view.

Example note:

```text
Target design file:
C:/Users/HP/Documents/프로젝트/진행중/Schedule Detail V2 - Toggle View.html

Focus areas:
- hero area
- connected policy
- matching policy rail
- List/Map toggle
- timeline item
```

### Current React Code

Limit the current app code to the files that Claude needs for the selected screen.

```text
/trips/:id
- frontend/src/pages/ItineraryPages.tsx
- frontend/src/styles/app.css

/trips, /trips/new
- frontend/src/pages/ItineraryPages.tsx
- frontend/src/styles/app.css

/policies, /policies/local-vacation
- frontend/src/pages/PolicyPages.tsx
- frontend/src/styles/app.css

/mypage
- frontend/src/pages/MyPage.tsx
- frontend/src/styles/app.css

/home
- frontend/src/pages/HomePage.tsx
- frontend/src/styles/app.css

Common shell
- frontend/src/components/AppLayout.tsx
- frontend/src/styles/tokens.css
```

Prefer a focused excerpt over a whole file when the requested issue is small. For example, for itinerary detail work, provide `ItineraryDetailPage`, related local components, and `.prototype-trip-detail-screen` selectors.

### DevTools Copy Priority

When pointing to a precise visual issue, copy these in this order:

1. CSS selector.
2. `outerHTML`.
3. Copied style.
4. Target Prototype element `outerHTML` or inline style.
5. Current screenshot.
6. Target Prototype screenshot.

Example:

```text
Current element:
#root > div > main > section > div.day-tabs

Current issue:
The day-tabs wrapper background is slightly different from the surrounding screen.

Current copied style:
background: #f5f5f7;
padding: 14px 16px 12px;

Expected result:
Make the wrapper blend into the surrounding Prototype background. Keep the Day button style and behavior unchanged.
```

### Screen Packet Examples

For `/trips/:id`:

```text
Target:
Match Schedule Detail V2.

Current files:
- frontend/src/pages/ItineraryPages.tsx
- frontend/src/styles/app.css

Allowed:
- Visual JSX structure inside ItineraryDetailPage.
- .prototype-trip-detail-screen CSS.
- Hero, policy sections, rail, timeline, button hierarchy, Korean copy.

Protected:
- appDataApi.getTrip/addTripPlace/updateTripPlace/deleteTripPlace/moveTripPlace meaning.
- DnD movement.
- List/Map URL state.
- Friend invite link.
- AI recommendation behavior.
```

For `/policies/local-vacation`:

```text
Target:
Match the Prototype PolicyDetailScreen.

Current files:
- frontend/src/pages/PolicyPages.tsx
- frontend/src/styles/app.css

Allowed:
- Hero structure.
- Tag row.
- Support, period, target, documents sections.
- Sticky CTA.
- Favorite/share button placement and style.

Protected:
- getPolicy.
- save/remove favorite.
- share flow.
- trip picker sheet.
- applyUrl/officialUrl CTA semantics.
```

For `/mypage`:

```text
Target:
Match the Prototype MyPageScreen.

Current files:
- frontend/src/pages/MyPage.tsx
- frontend/src/styles/app.css

Allowed:
- Profile card.
- Stats cards.
- Saved policy list.
- Settings rows.
- Notification and profile edit sheet styling.

Protected:
- profile save.
- nickname suggestion/save.
- contact save.
- notification settings save.
- saved policy remove.
- logout.
```

## Do Not Attach

Do not attach these unless the task explicitly requires them:

- Backend source tree.
- Alembic migrations.
- Full DB schema.
- Docker compose files.
- Full test logs.
- Old or unrelated docs.
- Secret or `.env` files.
- Real local database data.

Attach only when needed:

- `frontend/src/api/types.ts` if a visual card depends on a type field.
- `frontend/src/data/displayConfig.ts` if an emoji, gradient, destination, or display helper is involved.
- A utility file if a visible UI action depends on it, for example share or draft autosave.

## Verification

Run these after applying design changes:

```powershell
cd frontend
npm run typecheck
npm test -- --run
npm run build

cd ..
git diff --check
```

Manual QA URLs:

```text
http://127.0.0.1:5173/home
http://127.0.0.1:5173/policies
http://127.0.0.1:5173/policies/local-vacation
http://127.0.0.1:5173/trips
http://127.0.0.1:5173/trips/new
http://127.0.0.1:5173/trips/36
http://127.0.0.1:5173/mypage
```

Viewport checks:

- `390x844`: mobile.
- `440x900`: Prototype reference width.
- `1440x1000`: desktop centered app frame.

## Default Assumptions

- Claude.ai/design is responsible for visual design structure, not backend feature implementation.
- Design work should remain frontend-only.
- Real product behavior must continue using the current DB-backed React app flow.
- If a visual improvement requires new product behavior or backend data, document it as a follow-up instead of implementing it inside the design pass.
