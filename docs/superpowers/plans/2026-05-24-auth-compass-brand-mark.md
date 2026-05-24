# Auth Compass Brand Mark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authentication logo's plain `TH` text with a polished compass-style Travel Hunter brand mark.

**Architecture:** Add a small reusable `BrandMark` component in the existing pattern component file and render it from `AuthFormShell`. Keep the change presentational only: no route, API, auth, or data-flow behavior changes.

**Tech Stack:** React, TypeScript, CSS, Vitest, Playwright visual verification.

---

### Task 1: Add BrandMark Component

**Files:**
- Modify: `frontend/src/components/patterns.tsx`
- Modify: `frontend/src/styles/app.css`
- Test: `frontend/src/App.test.tsx`

- [x] Add a regression assertion that the auth form shell renders a compass logo and no longer exposes the literal `TH` marker.
- [x] Implement `BrandMark` as an inline SVG compass using existing auth logo CSS hooks.
- [x] Update `.prototype-login-logo` styling to match the B option: pale surface, red ring, two-tone red/mint compass needle, subtle shadow.
- [x] Run focused auth screen test.
- [x] Run typecheck and build.
- [x] Rebuild Docker and visually verify the login screen.
