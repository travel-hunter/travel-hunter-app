# Policy Region Filter Simplification Design

## Decision

Use **B. 주요 지역 + 전체 보기** for the policy list region filter.

## Problem

The current policy list builds region filters from every `policy.region` value and renders all of them as horizontal chips. This is accurate, but collected official benefits can create too many region choices, making the filter hard to scan and awkward on mobile.

## User Experience

The collapsed filter row keeps the existing `지역`, `기간`, and `금액` controls.

When the user opens `지역`, show a compact "주요 지역" group first:

- `전체`
- `전국`
- the user's profile region when available in the current policy set
- high-signal regions with the most visible policies, up to a small fixed count

Below that group, show an `전체 지역 보기` control. Expanding it reveals the full region list sorted in a predictable order. This keeps common choices immediately available while preserving access to every region.

## Filtering Rules

- `전체` means no region filter.
- `전국` matches policies whose region is exactly `전국`.
- A city/province chip matches policies whose `policy.region` exactly equals that value.
- Opening and closing the expanded region list must not reset the selected category, period, amount, or saved-only filters.

## Data Source

The frontend continues to derive available region values from `appDataApi.listPolicies()` results. No backend API shape change is needed.

## Component Scope

Modify only the policy list filter UI in `frontend/src/pages/PolicyPages.tsx` and related styles/tests.

Add small frontend helpers in the same file unless the logic grows enough to justify extraction. The current task does not require a new shared module.

## Testing

Add frontend tests that prove:

- the default region panel shows a compact primary region set instead of every available region;
- `전체 지역 보기` reveals the remaining regions;
- selecting a revealed region filters policies correctly;
- existing category filtering still works with the simplified region filter.

## Non-Goals

- Do not change policy DTOs or backend filtering.
- Do not make region state URL-backed in this task.
- Do not introduce fuzzy matching or district-level normalization.
- Do not redesign category, period, amount, or saved-only filters.
