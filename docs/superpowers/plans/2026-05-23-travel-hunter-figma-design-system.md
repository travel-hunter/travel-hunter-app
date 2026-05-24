# Travel Hunter Figma Design System 통합 계획

## 목표

Figma에 Travel Hunter v1 디자인 시스템을 만들고, 이후 `/trips`와 일정 상세 화면의 상태 카드/태그/버튼/탭 디자인을 같은 기준으로 정리할 수 있게 한다.

## 실행 순서

1. Discovery
   - `frontend/src/styles/tokens.css`와 `docs/design-system-map.md`를 기준으로 현재 토큰을 확정한다.
   - 새 Figma 파일 `Travel Hunter DS v1`의 기존 페이지, 변수, 스타일, 라이브러리를 확인한다.
   - 외부 라이브러리 재사용 가능성이 낮으면 자체 v1 라이브러리로 진행한다.

2. Foundations
   - Figma variable collections를 만든다.
   - primitive color, semantic color, spacing, radius 변수를 생성한다.
   - 모든 변수에 scope와 WEB code syntax를 지정한다.
   - text style과 effect style을 생성한다.
   - 결과를 검증하고 `CHECKLIST.md`에 기록한다.

3. File Structure
   - Cover, Getting Started, Foundations, Components, Screens 페이지를 만든다.
   - 색상/타입/간격/그림자 문서화 프레임을 만든다.

4. Components
   - Button, Tag/Badge, Card, Status Panel, Bottom Tab Item 순서로 하나씩 만든다.
   - 각 컴포넌트는 variable binding, variant, screenshot 검증 후 다음으로 넘어간다.

5. Screen Comparison
   - `/trips` 목록과 일정 상세 화면의 작성 중/확정 상태 비교 시안을 만든다.
   - 코드 반영 전 사용자 확인을 받는다.

## 검증 기준

- Figma 변수에 `ALL_SCOPES`가 남지 않는다.
- semantic color는 primitive variable alias를 사용한다.
- WEB code syntax는 `var(--token-name)` 형식을 사용한다.
- text/effect style 이름이 중복되지 않는다.
- 각 단계 후 Figma에서 생성 결과를 읽어 실제 개수와 이름을 확인한다.

## 리스크

- 현재 코드에는 작성 중/확정 semantic CSS 변수가 일부 직접 색상으로 들어가 있어, Figma 토큰을 먼저 만든 뒤 별도 CSS 정리가 필요하다.
- Figma 계정/플랜의 variable mode 제한이 있으면 Light 단일 모드로 축소한다.
- 현재 worktree에 이전 작업 변경이 많으므로 이번 작업은 문서와 Figma 파일 중심으로 제한한다.
