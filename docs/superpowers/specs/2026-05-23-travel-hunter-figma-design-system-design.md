# Travel Hunter Figma Design System 통합 설계

## 목적

현재 `/trips`와 일정 상세 화면에서 작성 중/확정 상태, 혜택 태그, 카드 색상, bottom tabs 정렬 등 UI 언어가 조금씩 어긋나고 있다. Figma 디자인 시스템 파일을 만들어 코드 토큰과 핵심 컴포넌트 기준을 먼저 고정한 뒤, 이후 코드 UI 정리를 같은 기준으로 진행한다.

## 기준 소스

- 코드 토큰: `frontend/src/styles/tokens.css`
- 기존 디자인 맵: `docs/design-system-map.md`
- 현재 Figma 파일: `Travel Hunter DS v1`
- Figma URL: `https://www.figma.com/design/bvSkBGlFoFvgnlnVoWYfEk`

## v1 범위

1. Foundations
   - 색상 primitive: primary, secondary, accent, neutral, semantic status
   - spacing: 4, 8, 12, 16, 20, 24
   - radius: 6, 8, 10, 12, 16
   - typography styles: mobile app 중심의 title, section title, body, meta, badge
   - shadow styles: xs, sm, md

2. Component Library
   - Button: primary, secondary, quiet, danger
   - Tag/Badge: draft, confirmed, benefit, neutral
   - Card: base, draft status, confirmed status, benefit summary
   - Bottom tab item
   - Status panel

3. Screen Handoff
   - `/trips` 목록 상태 비교
   - 일정 상세 작성 중/확정 상태 비교
   - 향후 코드 반영 시 CSS 토큰과 컴포넌트 이름을 맞춘다.

## 디자인 결정

- Travel Hunter의 기본 브랜드 색은 기존 red primary 계열을 유지한다.
- 작성 중 상태는 노랑 계열, 확정 상태는 초록 계열로 명확하게 분리한다.
- 같은 의미의 태그와 카드는 같은 semantic token을 사용한다.
- Figma의 token 이름은 slash naming을 사용하되, Dev Mode code syntax는 실제 CSS 변수명 또는 도입 예정 CSS 변수명으로 연결한다.
- Figma 작업은 코드 변경보다 먼저 시각 기준을 고정하는 용도이며, API 계약이나 데이터 흐름은 변경하지 않는다.

## 제외 범위

- 이번 단계에서 앱 전체 리디자인은 하지 않는다.
- 외부 UI kit을 그대로 도입하지 않는다.
- API DTO, backend schema, trip/policy 데이터 흐름은 변경하지 않는다.
