# Design System Core Screens And Code Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Connect Figma DS v1 concepts to code and align `/home`, `/mypage`, auth, nickname setup, and profile setup screens with the design system while restoring visible Korean copy.

**Scope:** Frontend only. Do not change API data flow, backend routes, schemas, repositories, or seed behavior. Page data still comes through `AppDataApi` and session boundaries.

**Architecture:** Add thin presentational pattern components under `frontend/src/components/patterns.tsx`, add repo-local Figma mapping files under `frontend/figma/`, then migrate the scoped screens to those patterns and shared primitives. Fix existing mojibake and syntax breakage in the touched frontend files.

---

## Task 1: Add Mapping And Pattern Contracts

**Files:**
- Create `frontend/figma/README.md`
- Create `frontend/figma/travel-hunter-ds-v1.figma.tsx`
- Create `frontend/src/components/patterns.tsx`
- Modify `frontend/src/App.test.tsx`

- [ ] Add a failing `design-system pattern contracts` test that imports `AuthFormShell`, `HomeRail`, `ProfilePanel`, and `ProfileSetupStep`, renders them, and asserts stable classes:
  - `.ds-auth-form-shell`
  - `.ds-home-rail`
  - `.ds-profile-panel`
  - `.ds-profile-setup-step`
- [ ] Add a test that asserts `frontend/figma/README.md` and `frontend/figma/travel-hunter-ds-v1.figma.tsx` exist.
- [ ] Run `cd frontend; npm test -- --run src/App.test.tsx -t "design-system pattern"` and confirm the expected failure.
- [ ] Create pattern components:
  - `HomeSectionHeader`
  - `HomeRail`
  - `AuthFormShell`
  - `ProfilePanel`
  - `ProfileSetupStep`
- [ ] Create Figma mapping docs/files with these mappings:
  - `Button`, `LinkButton`, `Tag`, `SurfaceCard`, `StatusPanel`, `BottomTabs`
  - `HomeRail`, `ProfilePanel`, `AuthFormShell`, `ProfileSetupStep`
- [ ] Re-run the focused test and commit as `Add design system pattern mappings`.

## Task 2: Normalize Home Screen

**Files:**
- Modify `frontend/src/pages/HomePage.tsx`
- Modify `frontend/src/styles/app.css`
- Modify `frontend/src/App.test.tsx`

- [ ] Add regression assertions to the existing home rail test for readable Korean and DS classes:
  - `어디로 떠나나요?`
  - `마이페이지`
  - `안녕,`
  - `이번 주 혜택`
  - `인기 국내 여행지`
  - `AI 추천 맞춤 일정`
  - `.ds-home-rail`
- [ ] Replace broken copy in `HomePage.tsx` with readable Korean:
  - fallback user name: `여행자`
  - search placeholder: `어디로 떠나나요?`
  - avatar label: `마이페이지`
  - greeting: `안녕, {name}님`
  - greeting body: `이번 주 놓치면 아쉬운 혜택이 있어요`
  - loading: `혜택을 불러오는 중입니다`
  - error: `혜택을 불러오지 못했어요`
  - featured kicker: `이번 주 인기 정책`
  - CTA: `지금 확인하기`
  - rail title: `이번 주 혜택`
  - rail action: `더보기`
  - destination title/list label: `인기 국내 여행지`
  - AI title: `AI 추천 맞춤 일정`
  - AI fallback: `정책과 일정을 함께 추천`
  - AI detail: `추천 지역으로 새 일정 만들기`
- [ ] Use `HomeSectionHeader` and `HomeRail` where they fit without changing data loading.
- [ ] Add scoped CSS for `.ds-section-header`, `.ds-home-rail`, and `.ds-home-rail-items`.
- [ ] Run `cd frontend; npm test -- --run src/App.test.tsx -t "home rails"` and commit as `Align home screen with design patterns`.

## Task 3: Normalize Auth And Profile Setup Screens

**Files:**
- Modify `frontend/src/pages/AuthPages.tsx`
- Modify `frontend/src/pages/ProfileSetupPage.tsx`
- Modify `frontend/src/styles/app.css`
- Modify `frontend/src/App.test.tsx`

- [ ] Add regression assertions for `.ds-auth-form-shell`, `.ds-profile-setup-step`, and readable Korean on login/signup/password/nickname/profile setup routes.
- [ ] Wrap auth hero/form areas with `AuthFormShell` while preserving existing submit, OAuth, redirect, and error behavior.
- [ ] Restore the OAuth callback failure button to `로그인으로 돌아가기`.
- [ ] Restore profile setup steps:
  - `어디로 떠나고 싶나요?`
  - `관심 지역을 기준으로 정책과 일정을 먼저 추천합니다.`
  - `어떤 여행을 선호하나요?`
  - `장소와 동선을 맞출 때 여행 스타일을 반영합니다.`
  - `예산 범위를 알려주세요`
  - `예산에 맞는 혜택과 예약 옵션을 보여드립니다.`
- [ ] Restore profile setup labels:
  - `뒤로`
  - `정보 입력`
  - `맞춤 추천 설정`
  - `저장 중입니다`
  - `추천 홈 보기`
  - `다음`
  - `나중에 설정`
- [ ] Use `ProfileSetupStep`.
- [ ] Add scoped CSS for `.ds-auth-form-shell`, `.ds-auth-form-head`, and `.ds-profile-setup-step`.
- [ ] Run `cd frontend; npm test -- --run src/App.test.tsx -t "login|signup|password|nickname|profile setup"` and commit as `Align auth and profile setup screens`.

## Task 4: Normalize My Page And Shared UI Copy

**Files:**
- Modify `frontend/src/pages/MyPage.tsx`
- Modify `frontend/src/components/ui.tsx`
- Modify `frontend/src/styles/app.css`
- Modify `frontend/src/App.test.tsx`

- [ ] Add My Page regression assertions for readable Korean and DS classes:
  - `마이`
  - `프로필`
  - `내 일정`
  - `즐겨찾기`
  - `신청 정책`
  - `즐겨찾기 정책`
  - `알림 설정`
  - `.ds-profile-panel`
  - `.ds-settings-menu`
- [ ] Replace broken My Page visible copy and error messages with readable Korean.
- [ ] Use `ProfilePanel` for the top profile card and add `ds-settings-menu` to the settings section.
- [ ] Restore notification sheet, profile editor, FAQ, terms, and privacy visible copy.
- [ ] Fix shared UI mojibake in `LoadingState`, `ErrorState`, and `ConfirmDialog` labels touched by these screens.
- [ ] Add scoped CSS for `.ds-profile-panel`, `.ds-profile-panel-head`, and `.ds-settings-menu`.
- [ ] Run `cd frontend; npm test -- --run src/App.test.tsx -t "my page"` and commit as `Align my page with design patterns`.

## Task 5: Final Verification And Documentation

**Files:**
- Modify `CHECKLIST.md`

- [ ] Run `cd frontend; npm run typecheck`.
- [ ] Run focused regression tests:
  - `cd frontend; npm test -- --run src/App.test.tsx -t "design-system pattern|home rails|my page|login|signup|password|nickname|profile setup"`
- [ ] Run `cd frontend; npm run build`.
- [ ] Run responsive browser QA for `/home`, `/mypage`, `/login`, `/signup`, `/nickname-setup`, and `/profile-setup` at 360, 390, 430, 1024, and 1440 widths.
- [ ] Update `CHECKLIST.md` with pass/fail validation results and remaining risks.
- [ ] Commit as `Record core screen design-system validation`.

## Self-Review

- The corrected plan avoids preserving mojibake as expected copy.
- The task order keeps mapping/pattern contracts first, then migrates visible screens incrementally.
- Data flow remains unchanged: no backend/API contract changes are planned.
- Shared UI copy is included because scoped screens currently consume `LoadingState`, `ErrorState`, and `ConfirmDialog`.
