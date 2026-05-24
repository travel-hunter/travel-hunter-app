# Policy Source Audit Design

> Superseded on 2026-05-23: legacy dummy policies were removed from runtime seed data instead of being corrected in place. Keep this document only as historical source-audit design context; current runtime should not seed `sokcho-stay`, `local-vacation`, or `busan-cashback`.

## Goal

Replace the inaccurate `sokcho-stay` demo policy with the closest verified Sokcho official source and add a repeatable way to audit whether currently loaded policy records are backed by suitable official source URLs.

## Problem

`sokcho-stay` currently points to `https://www.sokcho.go.kr/sc/portal`, which is the Sokcho city portal root, not a detailed policy notice. The stored title and requirements describe a generic accommodation discount, but the closest official Sokcho page found in the city site is the 2025 Sokcho workation press release at `https://www.sokcho.go.kr/sc/portal/sokchonews/pressrelease?articleSeq=806017`.

This is a data integrity issue, not only a bad URL. A policy should not look verified when its source URL is a root page, placeholder, unrelated page, or missing detailed notice.

## Scope

- Update the `sokcho-stay` seed/fallback policy to describe the verified Sokcho workation accommodation support source.
- Add a backend audit utility that scores static policy records for source quality.
- Keep API shape unchanged.
- Avoid DB schema changes. This is a validation and seed correction step.
- Record validation results in `CHECKLIST.md`.

## Data Correction

`sokcho-stay` remains the slug for compatibility, but its displayed data becomes:

- title: `속초 워케이션 숙박 지원`
- org: `속초시`
- region: `강원`
- category: `숙박`
- amount: `숙박비 및 관광콘텐츠 체험비 지원`
- summary: `속초시 워케이션 참여자가 지정 숙소와 체험콘텐츠를 연계한 주중 3박 4일 또는 2박 3일 프로그램을 이용할 수 있도록 지원합니다.`
- requirements: `주중 워케이션`, `참여 숙소`, `사전 신청`, `여행자 보험 가입 시 할인`
- documents: `신청 내역`, `숙박 예약 정보`, `여행자 보험 가입 여부`
- officialUrl: `https://www.sokcho.go.kr/sc/portal/sokchonews/pressrelease?articleSeq=806017`
- applyUrl: `https://naver.me/FK5QrxZe`

## Audit Model

The audit utility classifies each policy record as one of:

- `verified`: detailed official URL and enough title/source keyword alignment.
- `needs_review`: usable URL exists, but source text alignment is weak or unknown.
- `invalid_source`: URL is a root page, placeholder, local URL, malformed URL, or otherwise unsuitable as evidence.
- `missing_source`: neither `officialUrl` nor `applyUrl` exists.

The utility is deterministic and offline by default. It does not fetch remote pages during normal tests. It evaluates:

- URL shape and host.
- Root/path-only official pages such as `/sc/portal`.
- Placeholder/local hosts.
- Whether title and summary tokens appear in supplied source text when source text is available.

## Files

- `backend/app/data/seed.py`: update the DB seed source policy.
- `frontend/src/data/seedData.ts`: update fallback policy to match backend seed.
- `backend/scripts/audit_policy_sources.py`: new CLI and reusable audit functions.
- `backend/tests/test_policy_source_audit.py`: deterministic audit tests.
- `CHECKLIST.md`: validation evidence and residual risk.

## Testing

- Unit tests cover missing source, invalid root URL, placeholder URL, weak alignment, and verified Sokcho source.
- Existing policy data validation tests continue to cover URL shape.
- Targeted seed assertions confirm `sokcho-stay` no longer points to the portal root and contains workation-specific fields.

## Risks

- The existing DB may already contain the old seed row. Updating seed data fixes fresh seed runs; existing local DBs require reseeding or a small data repair command.
- The audit utility is evidence scoring, not a legal guarantee. It flags likely bad records and helps keep manual review focused.
