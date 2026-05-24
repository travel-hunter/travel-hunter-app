# Mojibake Visible Text Cleanup And Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair visible Korean mojibake in frontend screens and add a focused source scan that prevents the same class of broken strings from returning.

**Architecture:** Keep the change frontend-only unless rendered backend data proves a database record is broken. Fix UI literals in the existing React/CSS files, add a small Node scanner under `frontend/scripts`, wire it into `npm test`, and record validation in `CHECKLIST.md`. Visual verification is required after Docker rebuild.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, Node.js scripts, Docker Compose, Playwright/browser visual checks.

---

## File Structure

- Modify `frontend/src/pages/PolicyPages.tsx`
  - Responsibility: policy list/detail UI and visible policy-detail section labels.
  - Change: remove corrupted fallback title fragments from benefit and requirement card tone-selection logic. Do not alter API calls or policy data flow.
- Modify `frontend/src/styles/app.css`
  - Responsibility: global/prototype styling and CSS pseudo-content.
  - Change: replace corrupted pseudo-content for trip create labels with correct Korean strings.
- Create `frontend/scripts/check-mojibake.cjs`
  - Responsibility: scan frontend-visible source files for known mojibake fragments.
  - Change: recursively scan selected extensions and fail with file/line snippets when broken patterns are found.
- Modify `frontend/package.json`
  - Responsibility: npm command wiring.
  - Change: add `test:mojibake` and run it before Vitest in `npm test`.
- Modify `CHECKLIST.md`
  - Responsibility: project state and validation record.
  - Change: record source scan, typecheck/test/build, Docker rebuild, health checks, and visual verification result.

---

### Task 1: Add Mojibake Scanner Red Test

**Files:**
- Create: `frontend/scripts/check-mojibake.cjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Create the scanner script with current failing patterns**

Create `frontend/scripts/check-mojibake.cjs`:

```js
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "src");
const extensions = new Set([".css", ".ts", ".tsx"]);

const mojibakePatterns = [
  /\uFFFD/,
  /\?{1,3}\uC1F1\uC819/,
  /\u936E/,
  /\?\uC497\uAE6E/,
  /\?\uBEA4\uC524/,
];

const allowedFiles = new Set([]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

const findings = [];

for (const filePath of walk(root)) {
  const relativePath = path.relative(path.resolve(__dirname, ".."), filePath).replaceAll(path.sep, "/");
  if (allowedFiles.has(relativePath)) continue;
  if (!extensions.has(path.extname(filePath))) continue;

  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (mojibakePatterns.some((pattern) => pattern.test(line))) {
      findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length > 0) {
  console.error("Mojibake-like frontend text found:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("No mojibake-like frontend text found.");
```

- [ ] **Step 2: Wire the scanner into npm scripts**

Modify `frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "typecheck": "tsc --noEmit",
    "test:mojibake": "node scripts/check-mojibake.cjs",
    "test": "npm run test:mojibake && node scripts/run-backend-command.cjs vitest run",
    "test:e2e": "node scripts/run-backend-e2e.cjs",
    "test:watch": "vitest",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview --host 127.0.0.1"
  }
}
```

- [ ] **Step 3: Run the scanner and verify it fails before fixes**

Run:

```bash
cd frontend
npm run test:mojibake
```

Expected: FAIL, listing at least `src/styles/app.css` and `src/pages/PolicyPages.tsx`.

- [ ] **Step 4: Commit the failing guard**

```bash
git add frontend/scripts/check-mojibake.cjs frontend/package.json
git commit -m "test: add frontend mojibake guard"
```

---

### Task 2: Repair CSS Pseudo-Content

**Files:**
- Modify: `frontend/src/styles/app.css`

- [ ] **Step 1: Replace trip-create top-bar pseudo label**

In `.prototype-trip-create-screen .top-bar h1::after`, replace the corrupted `content` value with:

```css
content: "새 일정";
```

- [ ] **Step 2: Replace trip-create eyebrow pseudo label**

In `.prototype-trip-create-screen .page-head .eyebrow::after`, replace the corrupted `content` value with:

```css
content: "일정 빌더";
```

- [ ] **Step 3: Run the scanner and verify CSS findings are gone**

Run:

```bash
cd frontend
npm run test:mojibake
```

Expected: FAIL only if other source files still contain mojibake. `src/styles/app.css` should no longer appear.

- [ ] **Step 4: Commit CSS repair**

```bash
git add frontend/src/styles/app.css
git commit -m "fix: repair trip create Korean labels"
```

---

### Task 3: Repair Policy Detail Fallback Logic

**Files:**
- Modify: `frontend/src/pages/PolicyPages.tsx`

- [ ] **Step 1: Confirm the real broken fragments in the file**

Run this UTF-8-safe Node check instead of relying on PowerShell text rendering:

```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('frontend/src/pages/PolicyPages.tsx','utf8'); console.log(text.includes('\\u003f\\uc497\\uae6e'), text.includes('\\u003f\\ubea4\\uc524'))"
```

Expected before the fix: `true true`.

- [ ] **Step 2: Replace benefit-card tone logic with semantic Korean title checks**

Replace the `SurfaceCard` opening tag inside `benefitSections.map` with:

```tsx
<SurfaceCard
  tone={section.title.includes("혜택") ? "benefit" : "default"}
  className="policy-benefit-group"
  key={section.title}
>
```

Do not change the surrounding list rendering or `section.title` data source.

- [ ] **Step 3: Replace requirement-card tone logic with semantic Korean title checks**

Replace the requirement `SurfaceCard` opening tag with:

```tsx
<SurfaceCard
  tone={section.title.includes("확인") ? "draft" : "default"}
  className="policy-requirement-group"
  key={section.title}
>
```

- [ ] **Step 4: Run scanner and verify all current findings are gone**

Run:

```bash
cd frontend
npm run test:mojibake
```

Expected: PASS with `No mojibake-like frontend text found.`

- [ ] **Step 5: Commit policy detail repair**

```bash
git add frontend/src/pages/PolicyPages.tsx
git commit -m "fix: remove policy detail mojibake fallbacks"
```

---

### Task 4: Run Frontend Validation

**Files:**
- No source changes expected unless validation exposes a concrete bug.

- [ ] **Step 1: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run tests including mojibake guard**

Run:

```bash
cd frontend
npm test
```

Expected: PASS. The first line should include the mojibake guard passing before Vitest runs.

- [ ] **Step 3: Run production build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit any validation-driven fixes**

If validation required additional source changes:

```bash
git add frontend
git commit -m "fix: address mojibake validation issues"
```

If no changes were required, do not create an empty commit.

---

### Task 5: Docker Rebuild And Visual Verification

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Rebuild and restart Docker services**

Run:

```bash
docker compose -f compose.yaml up -d --build
```

Expected: all services start successfully.

- [ ] **Step 2: Check backend health**

Run:

```bash
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

Expected: HTTP 200 with healthy response content.

- [ ] **Step 3: Check frontend availability**

Run:

```bash
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173
```

Expected: HTTP 200.

- [ ] **Step 4: Capture required screens visually**

Use the browser or Playwright against `http://127.0.0.1:4173` and capture:

```text
/home
/policies
/policies/dgtour-%EB%B0%80%EC%96%91-1
/trips
/mypage
```

If a trip detail route is available from `/trips`, open one card and capture that detail page too.

Expected: Korean labels render correctly. Specifically verify policy detail labels for share, organizer metadata, support content, application period, requirements, bullets, and documents. Also verify the trip-create page labels if that route is reachable from the UI.

- [ ] **Step 5: Update CHECKLIST.md**

Append a validation note:

```markdown
## 2026-05-24 Mojibake visible text cleanup

- Source scan: PASS (`cd frontend && npm run test:mojibake`)
- Typecheck: PASS (`cd frontend && npm run typecheck`)
- Frontend tests: PASS (`cd frontend && npm test`)
- Frontend build: PASS (`cd frontend && npm run build`)
- Docker rebuild: PASS (`docker compose -f compose.yaml up -d --build`)
- Backend health: PASS (`http://127.0.0.1:8000/api/health`)
- Frontend health: PASS (`http://127.0.0.1:4173`)
- Visual verification: PASS for `/home`, `/policies`, one policy detail, `/trips`, one trip detail if available, and `/mypage`
- Remaining risk: database policy records were not bulk rewritten; any future rendered DB mojibake should be traced to the exact policy record and source URL before correction.
```

- [ ] **Step 6: Commit validation record**

```bash
git add CHECKLIST.md
git commit -m "docs: record mojibake cleanup validation"
```

---

### Task 6: Final Review

**Files:**
- No source changes expected unless review finds a specific issue.

- [ ] **Step 1: Check final status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing untracked `tmp/` remains, or clean if temporary files were intentionally removed.

- [ ] **Step 2: Review committed diff**

Run:

```bash
git log --oneline -5
git show --stat --oneline HEAD~4..HEAD
```

Expected: commits cover scanner, CSS repair, policy detail repair, and checklist validation.

- [ ] **Step 3: Final response**

Report:

```text
Implemented the visible-text cleanup and prevention guard.
Validation run: test:mojibake, typecheck, npm test, build, Docker rebuild, backend/frontend health, and browser visual check.
Remaining risk: DB policy text was not bulk edited because rendered backend data did not prove stored mojibake.
```

---

## Self-Review

- Spec coverage: covered visible source repair, scanner prevention, Docker rebuild, browser visual verification, and `CHECKLIST.md`.
- Placeholder scan: no task uses deferred placeholders; all code-bearing steps include concrete snippets.
- Type consistency: new scanner is a standalone CommonJS script, package script names are consistent, and the React helper is local to `PolicyPages.tsx`.
