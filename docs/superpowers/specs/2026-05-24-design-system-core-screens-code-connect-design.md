# Design System Core Screens And Code Connect Design

## Summary

Travel Hunter already has a Figma DS v1 foundation and code-level primitives for policy and trip screens. The next step is a mixed pass: connect the existing Figma components to code concepts, then apply the same design language to the remaining high-exposure screens.

This work covers `/home`, `/mypage`, auth screens, nickname setup, and `/profile-setup`. It also restores visible Korean copy on those screens where mojibake is currently shown to users.

## Goals

- Define a minimal but useful Figma-to-code mapping for shared primitives and reusable screen patterns.
- Refactor core remaining screens to use design-system primitives instead of one-off `prototype-*` surfaces where practical.
- Keep all data access through `AppDataApi` and existing session APIs.
- Preserve existing routes, API DTOs, backend behavior, and auth flow.
- Restore visible Korean copy on scoped screens.
- Add focused tests that verify behavior and design-system class contracts.

## Non-Goals

- No backend API changes.
- No new runtime mock mode.
- No full visual redesign of policy/trip screens already handled by the previous design-system pass.
- No broad copywriting pass for backend docs, historical specs, or test-only fixtures unless user-visible text is affected.
- No public trip slug or route contract change.

## Figma-Code Mapping

### Primitive Mapping

- Figma `Button` maps to `frontend/src/components/ui.tsx` `Button` and `LinkButton`.
- Figma `Tag Badge` maps to `Tag`.
- Figma `Card` maps to `SurfaceCard`.
- Figma `Status Panel` maps to `StatusPanel`.
- Figma `Bottom Tab Item` maps to `BottomTabs` in `AppLayout`.

The first implementation should add lightweight Code Connect files or equivalent mapping documentation under the frontend/Figma integration area. If the repo has no established Code Connect folder, create a small `frontend/figma/` or `frontend/src/components/*.figma.tsx` structure only after checking current conventions.

### Pattern Mapping

Add named pattern mappings in Figma and code:

- `Pattern / Home Hero` maps to a home hero/search/greeting section component.
- `Pattern / Home Rail` maps to reusable horizontal rail sections on `/home`.
- `Pattern / Profile Panel` maps to the main account summary and stats surfaces on `/mypage`.
- `Pattern / Settings Menu` maps to the My Page settings/action list.
- `Pattern / Auth Form` maps to login, signup, forgot/reset password, and nickname setup shells.
- `Pattern / Profile Setup Step` maps to the three-step onboarding preference form.

Pattern components should be thin rendering helpers. They should not fetch data directly and should receive already prepared props from the page.

## Screen Scope

### Home

- Normalize greeting, search, featured policy, benefit rail, destination rail, and AI trip CTA into DS surfaces.
- Replace visible mojibake with Korean copy:
  - Greeting and subtitle.
  - Search placeholder.
  - Featured policy kicker and CTA.
  - Section labels.
  - AI recommendation labels.
- Keep list policy loading, error, and recommendation data flow unchanged.

### My Page

- Normalize profile card, stats, saved policies, settings rows, info sheets, notification sheet, and profile edit sheet.
- Restore visible Korean copy for labels, errors, buttons, FAQ/terms/privacy content, notification messages, and sheet headings.
- Keep saved policy removal, profile save, nickname suggestion, contact save, verification, notification toggles, logout, and sheet behavior unchanged.
- Prefer `SurfaceCard`, `Button`, `Tag`, and shared form classes over bespoke card styling where the local layout permits.

### Auth And Nickname Setup

- Normalize login, signup, forgot password, reset password, OAuth callback, and nickname setup onto an `AuthFormShell` pattern.
- Keep redirect safety, login/signup/session behavior, OAuth link generation, password reset flow, and email availability flow unchanged.
- Restore visible Korean copy, including the OAuth callback failure action.

### Profile Setup

- Normalize the three-step selection screen into a `ProfileSetupStep` pattern.
- Restore step titles, body text, top bar labels, error text, and action labels.
- Keep `useSession` profile update/save behavior unchanged.

## Component Boundaries

Add reusable components only where they reduce duplication or clarify mapping:

- `HomeSectionHeader`
- `HomeRail`
- `HomePolicyCard`
- `HomeDestinationCard`
- `AuthFormShell`
- `AuthFieldGroup` if it removes repeated form markup without hiding simple form behavior.
- `ProfilePanel`
- `ProfileStatGrid`
- `SettingsMenu`
- `ProfileSetupStep`

Do not move API calls into these components. Pages remain responsible for loading data and passing props.

## Styling Rules

- Use existing semantic tokens in `frontend/src/styles/tokens.css`.
- Add new semantic tokens only if a pattern cannot be expressed with existing surface/status/action tokens.
- Avoid adding new one-off color palettes.
- Preserve mobile-first behavior and verify at 360, 390, 430, 1024, and 1440 px.
- Text must not clip or overlap in cards, buttons, sheets, or rails.

## Testing

Add focused assertions to `frontend/src/App.test.tsx` or targeted tests:

- Home renders DS-backed rail/card surfaces and no visible mojibake in primary headings/actions.
- My Page renders DS-backed profile/settings/saved-policy surfaces and preserves saved policy removal.
- Auth screens preserve login, signup, forgot/reset password, nickname setup, and OAuth callback behavior.
- Profile setup preserves step navigation, profile updates, and final save.
- Code/Figma mapping files exist for primitives and scoped patterns.

Run at minimum:

```powershell
cd frontend
npm run typecheck
npm test -- --run src/App.test.tsx -t "home|my page|login|signup|password|nickname|profile setup|design-system"
npm run build
```

For UI implementation, run responsive browser QA on `/home`, `/mypage`, `/login`, `/signup`, `/nickname-setup`, and `/profile-setup` at 360, 390, 430, 1024, and 1440 px.

## Risks

- `MyPage.tsx` currently contains many user-visible mojibake strings and large inline sheet content. Refactoring should be incremental to avoid breaking settings or notification flows.
- Auth screens mix older prototype-specific classes with shared UI components. The shell extraction must preserve redirect and form semantics.
- Figma Code Connect may require exact component keys or file conventions. If connector access is unavailable, create repo-local mapping files and document the gap instead of blocking UI cleanup.

## Acceptance Criteria

- Scoped screens show readable Korean copy.
- Scoped screens use named DS primitives or pattern components for their main surfaces.
- Figma/code mapping exists for primitives and the scoped patterns.
- Data flow still goes through `AppDataApi` and session boundaries.
- Relevant focused tests and build pass.
- `CHECKLIST.md` records validation results and remaining risks.
