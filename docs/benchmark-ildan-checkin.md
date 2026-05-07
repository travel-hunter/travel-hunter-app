# 일단체크인 벤치마크 분석

## 기준

- 분석 대상: `https://gotrip.dothome.co.kr/`
- 원본 보고서: `C:\Users\HP\Desktop\일단체크인_분석보고서.md`
- 확인일: 2026-05-07
- 목적: Travel Hunter에 적용할 수 있는 UX/엔지니어링 패턴을 선별한다.

이 문서는 벤치마크 참고 자료다. Travel Hunter의 제품 요구사항 source of truth는 `docs/requirements.md`, 현재 구현 상태는 `docs/current-work-spec.md`와 `docs/feature-implementation-status.md`를 따른다.

## 실제 접속 확인

- `https://gotrip.dothome.co.kr/`: `200 OK`.
- title: `일단체크인 - 여행의 시작`.
- description: `숙소 중심 여행 일정 플래너`.
- `manifest.json`: `200 OK`, standalone/portrait PWA 설정 존재.
- `asset-manifest.json`: `200 OK`.
- `/static/js/main.1a22d3dd.js.map`: `200 OK`, 약 1.14MB sourcemap 공개 노출.
- HTML에는 `noindex, nofollow` robots meta와 GA4 script가 포함되어 있다.

## 적용할 인사이트

| 우선순위 | 항목 | Travel Hunter 적용 방향 |
|---:|---|---|
| 1 | Production sourcemap 비공개 명시 | Vite build 설정에 `sourcemap: false`를 명시해 release/security 기준을 고정한다. |
| 2 | PWA manifest/meta | `manifest.json`, theme color, Apple mobile web app meta를 추가해 모바일 홈화면 설치 경험을 개선한다. |
| 3 | 공유 fallback | `navigator.share` → `clipboard.writeText` → legacy textarea copy 순서로 정책/초대 링크 공유 안정성을 높인다. |
| 4 | 작성 중 draft autosave | `/trips/new`, 장소 편집 sheet, profile edit draft에 localStorage 임시 저장을 적용한다. 최종 저장소는 계속 DB다. |
| 5 | 카테고리 인터리빙 | 정책/추천 리스트가 한 카테고리로 쏠리지 않게 라운드로빈 정렬을 검토한다. |

## 후속으로 둘 항목

- Kakao Maps/Local API 기반 장소 검색.
- geolocation 기반 주변 장소 추천.
- 실제 이동 시간/경로 계산.
- 지도 SDK 실패 시 SVG fallback map.

위 항목은 외부 API와 provider 설정이 필요하므로 현재 1순위 작업에는 포함하지 않는다.

## 피해야 할 항목

- 가짜 별점이나 난수 평점을 실제 데이터처럼 표시하지 않는다.
- 이동 시간/체류 시간 추정치를 사실처럼 단정하지 않는다.
- production sourcemap을 공개 서버에 배포하지 않는다.
- 공유 URL만으로 편집 가능한 약한 소유권 모델을 도입하지 않는다. Travel Hunter는 기존 auth와 viewer/editor role enforcement를 유지한다.

## 1순위 구현 결정

- `frontend/vite.config.ts`에 `build.sourcemap = false`를 명시한다.
- 검증 기준:
  - `cd frontend && npm run build`
  - `Get-ChildItem dist -Recurse -Filter *.map` 결과가 없어야 한다.

## 적용 완료

- Production sourcemap 비공개 명시 완료.
- PWA manifest/meta 1차 적용 완료.
- 현재 PWA 범위는 manifest, theme color, Apple mobile web app meta, 192/512/maskable icon 제공까지다.
- Service worker, offline cache, push notification은 후속 작업으로 분리한다.
