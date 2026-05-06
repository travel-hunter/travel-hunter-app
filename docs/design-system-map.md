# Travel Hunter Wanted Design System 적용 기준

## 기준 자료

- 원본 파일: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- 파일 상태: Figma export ZIP 구조이며 `canvas.fig`, `thumbnail.png`, `meta.json`, `images/*`를 포함한다.
- 적용 방식: `.fig`를 repo에 커밋하지 않고 Figma에 import한 뒤, 앱에는 토큰/컴포넌트 스타일만 반영한다.
- 현재 앱 적용 범위: Wanted Design System의 white surface, blue primary, neutral text, compact radius, thin border 중심 스타일을 Travel Hunter UI 토큰으로 매핑했다.

## Token Mapping

| Wanted 기준 | Travel Hunter token | 적용값 | 사용처 |
| --- | --- | --- | --- |
| Primary Blue | `--primary-500` | `#3366ff` | 주요 CTA, active tab, focus ring |
| Primary Dark | `--primary-600`, `--primary-700` | `#2456e8`, `#1748c9` | 링크, hover, gradient end |
| Primary Surface | `--primary-50`, `--primary-100` | `#f4f7ff`, `#e8efff` | active nav, secondary button |
| Neutral Ink | `--ink`, `--gray-900` | `#111827`, `#0f172a` | 본문/제목 |
| Neutral Border | `--gray-200` | `#e5e7eb` | card, input, divider |
| Accent Mint | `--accent-500`, `--accent-600` | `#00c7ae`, `#008f7d` | 혜택/절감 강조 |
| Support Coral | `--secondary-500`, `--secondary-600` | `#ff4b6e`, `#d9365b` | 보조 marker, 경고성 강조 |
| Compact Radius | `--radius-xs` ~ `--radius-xl` | `6px` ~ `16px` | button, input, card, sheet |
| Light Shadow | `--shadow-xs`, `--shadow-sm`, `--shadow-md` | low elevation | cards, shell, modal |

## Component Mapping

| Figma component 기준 | 현재 코드 기준 | 적용 방향 |
| --- | --- | --- |
| Button | `frontend/src/components/ui.tsx`의 `Button`, `LinkButton` | variant 이름은 유지하고 색상, radius, focus, border 스타일을 Wanted 기준으로 조정 |
| Badge/Label | `Tag` | pill 성격을 줄이고 compact label 형태로 조정 |
| Text Field | `.field input`, `.search-field` | 48px 높이, 8px radius, blue focus ring 적용 |
| Card/List Item | `PolicyListCard`, `PolicyMiniCard`, `ItineraryCard` | white surface, 얇은 border, 낮은 shadow, 12px radius 기준 |
| Navigation/Tab | `ServiceLayout`, `BottomTabs` | active state는 primary surface, neutral inactive text 기준 |
| Modal/Sheet | policy add sheet, trip select sheet | white surface, compact radius, neutral border/shadow 기준 |
| Toast/Alert | `Toast`, `ErrorState`, `LoadingState` | accent surface와 neutral/error state 유지 |

## 화면 적용 기준

1. 인증 화면: `/login`, `/signup`
   - input, button, auth card surface를 Wanted form 스타일에 맞춘다.
2. 핵심 서비스 화면: `/home`, `/policies`, `/policies/local-vacation`, `/trips`, `/trips/new`, `/trips/:tripId`
   - 카드, 목록, search/filter, CTA, sticky action을 같은 토큰으로 맞춘다.
3. 보조 화면: `/profile-setup`, `/mypage`, `/invites/:inviteToken/accept`
   - 선택 chip, 설정 row, empty/error/success state를 같은 component rule로 유지한다.

## Figma Handoff 규칙

- Figma에는 원본 Wanted 파일을 import한 뒤 Travel Hunter 전용 파일에서 `Token Map`, `Redesigned Screens`, `Handoff` 페이지를 분리한다.
- 실제 import와 component variant 확인 절차는 `docs/figma-import-checklist.md`를 따른다.
- Figma component variant 이름이 확정되면 이 문서의 token/component mapping을 실제 이름으로 갱신한다.
- Code Connect는 앱 스타일 적용이 안정화된 뒤 `Button`, `Tag`, `Card`, `Input`부터 연결한다.
- Figma 원본과 실제 앱이 다른 경우, 앱의 접근성, 모바일 touch area, 현재 API/route 구조를 우선한다.

## 남은 Design Debt

- `.fig` 내부 컴포넌트의 정확한 variant명과 수치 토큰은 Figma import 후 선택 node 기준으로 재확인해야 한다.
- 현재 1차 적용은 코드 토큰 중심의 Wanted 스타일 pass이며, Figma에 Travel Hunter redesigned screen을 실제로 생성하는 작업은 별도 단계다.
- 화면별 픽셀 비교는 dev server와 Figma frame을 나란히 둔 뒤 보정한다.
