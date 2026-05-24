# Mojibake Visible Text Cleanup And Prevention Design

## Goal

Fix Korean text that appears broken in the UI, then add a small prevention gate so mojibake strings do not quietly re-enter frontend-visible code.

The first pass is visible-screen focused. Backend data and database records are changed only when a real rendered screen proves that stored policy data is broken.

## Current Findings

Recent Docker-backed visual checks showed the main rendered screens mostly display Korean normally:

- `/home`
- `/mypage`
- `/policies`
- one real policy detail route
- `/trips`

Code search still found latent frontend mojibake candidates:

- `frontend/src/styles/app.css`: CSS pseudo content contains a broken Korean phrase for the itinerary builder label.
- `frontend/src/pages/PolicyPages.tsx`: fallback checks include two broken Korean title fragments.

These are risky even if they are not always visible, because they can surface after a route, state, or data variation changes.

## Scope

In scope:

- Frontend visible copy in React components and CSS pseudo content.
- Korean text literals used by page rendering logic.
- A lightweight scanner or test that catches common mojibake fragments in frontend source.
- Browser visual verification after Docker rebuild.
- `CHECKLIST.md` validation notes.

Out of scope for this pass:

- Changing API DTO shapes.
- Reclassifying policies or changing policy collection flow.
- Bulk rewriting database records without rendered evidence.
- Reintroducing mock runtime behavior.

## Approach

Use a two-layer fix.

First, repair known code-level mojibake. Replace broken Korean literals with correct Korean or remove them from logic where semantic checks are available. CSS pseudo content should either use correct Korean text or be removed if the text is decorative and redundant.

Second, add prevention. A small source scan should fail when common mojibake fragments appear in frontend-visible files. The scan should cover `frontend/src/**/*.ts`, `frontend/src/**/*.tsx`, and `frontend/src/**/*.css`. It should avoid broad rules that flag valid punctuation or intentional placeholder text.

## Visual Verification

Every implementation pass must include browser verification against the Docker-served app.

Required screens:

- `/home`
- `/policies`
- one policy detail page with real backend data
- `/trips`
- one trip detail page when available
- `/mypage`
- login/profile setup screens if touched by the scan or fixes

The check is visual-first: capture screenshots and inspect rendered Korean text. DOM text extraction may be used as a helper, but it cannot replace screenshots because previous PowerShell inline fixture data corrupted Korean strings during testing.

## Testing

Run the normal frontend validation affected by the change:

- `cd frontend && npm run typecheck`
- `cd frontend && npm test`
- `cd frontend && npm run build`

Run Docker validation:

- `docker compose -f compose.yaml up -d --build`
- Health check backend and frontend URLs.
- Browser screenshot check for the required screens.

If the prevention scanner is implemented as an npm script or test, include it in the relevant frontend test path so future runs catch regressions.

## Risks

- Some visible text may come from database policy records rather than source code. Those should be fixed only after identifying the exact record and original source.
- Overly broad scanner rules can create noise. The scanner should target known mojibake fragments and visible frontend source paths first.
- Browser automation scripts must avoid PowerShell inline Korean fixtures unless encoded safely, because the shell can corrupt Korean before it reaches the browser.

## Acceptance Criteria

- Known mojibake candidates in frontend source are removed or corrected.
- Main user-facing screens pass visual inspection after Docker rebuild.
- A prevention check catches the same class of broken Korean strings in frontend-visible source.
- `CHECKLIST.md` records commands run, visual verification result, and any remaining risk.
