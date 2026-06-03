# 화면별 기능 개발 현황 보고서

이 문서는 Travel Hunter 화면/로직 개발 현황 보고서의 entry point다. 상세 내용은 화면 기준 문서와 로직 설명 문서로 나누어 관리한다.

## 문서 구성

| 문서 | 용도 |
| --- | --- |
| [`screen-feature-status-screens.md`](./screen-feature-status-screens.md) | 사용자가 보는 route/page/button/status 기준의 화면별 기능 개발 현황 |
| [`screen-feature-status-logic.md`](./screen-feature-status-logic.md) | 정책 수집, Kakao 연동, 추천/자동생성, fallback, 저장/선정 기준 같은 내부 로직 설명 |

## 빠른 분류 규칙

- 사용자가 직접 보는 route, page, button, form, status, 오류/로딩 UI는 화면 기준 문서에 추가한다.
- 백엔드 수집, 추천, 외부 API, fallback, 저장/선정 기준, 운영 환경 의존성은 로직 설명 문서에 추가한다.
- 화면과 로직이 모두 관련되면 화면 문서에는 사용자에게 보이는 결과와 조작만 적고, 로직 문서에는 내부 판단 기준과 데이터 흐름을 적는다.
- 문서 대분해를 피하기 위해 화면별 개별 파일은 만들지 않고, 현재는 이 index와 상세 문서 2개 구조를 유지한다.

## 현재 상세 문서 요약

### 화면 기준 기능 개발 현황

- 로그인 페이지
- 홈 페이지
- 정책 목록 페이지
- 정책 상세 페이지
- 일정 상세 페이지

자세한 내용은 [`screen-feature-status-screens.md`](./screen-feature-status-screens.md)를 확인한다.

### 로직/API/추천 설명

- 정책 수집 로직 요약
- Kakao Map API 연결 상태 사전 확인
- 일정 장소 자동생성 및 AI 추천 후보 로직 설명

자세한 내용은 [`screen-feature-status-logic.md`](./screen-feature-status-logic.md)를 확인한다.
