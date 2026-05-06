# Travel Hunter Figma Import Checklist

## 목적

- `Wanted Design System (Community).fig`를 Figma에 import한 뒤, 현재 앱의 디자인 토큰과 실제 Wanted component 수치를 대조한다.
- 이 문서는 Figma 앱/웹에서 수행해야 하는 수동 import와, import 이후 Codex/개발자가 확인해야 할 항목을 고정한다.
- `.fig` 원본은 repo에 커밋하지 않는다.

## 기준 파일

- Local source: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- Current app baseline commit: `16e15f4 docs: record wanted design qa`
- Current mapping doc: `docs/design-system-map.md`
- Browser QA doc: `docs/design-qa.md`

## Figma Import Steps

1. Figma 앱 또는 웹에서 `Wanted Design System (Community).fig`를 import한다.
2. Community 원본 파일을 직접 수정하지 않고, 팀/프로젝트 소유 파일로 복제한다.
3. Travel Hunter 디자인 파일에 다음 페이지를 만든다.
   - `00 Wanted Reference`
   - `01 Token Map`
   - `02 Current App Screens`
   - `03 Redesigned Screens`
   - `04 Handoff`
4. `00 Wanted Reference`에는 import한 Wanted 원본 frame/component를 배치한다.
5. `01 Token Map`에는 `docs/design-system-map.md`의 token mapping을 Figma variable/style 이름과 나란히 정리한다.
6. `02 Current App Screens`에는 현재 앱 캡처를 배치한다.
7. `03 Redesigned Screens`에는 실제 보정 대상 화면을 만든다.
8. `04 Handoff`에는 최종 token/component 결정과 code mapping을 기록한다.

## Component Variant 확인표

| Component | Figma node/link | 확인할 값 | 현재 앱 기준 | 상태 |
| --- | --- | --- | --- | --- |
| Button | Pending | variant name, height, padding, radius, primary/disabled/focus color | `Button`, `.btn` | Pending |
| Text Field/Input | Pending | height, border, focus ring, placeholder color, error state | `.field input`, `.search-field` | Pending |
| Badge/Tag | Pending | radius, padding, border, tone colors | `Tag`, `.tag` | Pending |
| Card/List Item | Pending | surface, border, radius, shadow, title/meta spacing | `Policy*Card`, `ItineraryCard` | Pending |
| Navigation/Tab | Pending | active state, item height, icon/text gap, desktop/mobile behavior | `ServiceLayout`, `BottomTabs` | Pending |
| Sheet/Modal | Pending | overlay, radius, max height, panel padding, row spacing | policy trip select sheet | Pending |
| Toast/Alert | Pending | surface, border, text color, icon usage | `Toast`, `ErrorState` | Pending |

## Current App Screens to Compare

Use the current app routes below as browser capture targets.

- `/login`
- `/signup`
- `/home`
- `/policies`
- `/policies/local-vacation`
- `/trips`
- `/trips/new`
- `/mypage`

Recommended viewport:

- Mobile: `390 x 844`
- Desktop narrow: `1024 x 900`
- Desktop wide: `1440 x 1000`

## 보정 기준

- Figma 수치와 앱 수치가 다르면 먼저 `tokens.css`와 `app.css`의 token/component rule에서 해결한다.
- 화면별 one-off CSS는 마지막 선택지로 둔다.
- 새 UI framework는 도입하지 않는다.
- 현재 API, DB schema, route 구조는 변경하지 않는다.
- 모바일 touch target은 44px 이상을 유지한다.
- `/home`의 horizontal card scroll은 현재 의도된 UX로 유지한다. Figma에서 grid로 확정된 경우에만 별도 작업으로 분리한다.

## Codex/Figma MCP 사용 조건

- Figma에서 구체 node를 선택하거나 node URL을 제공해야 structured design context를 추출할 수 있다.
- root/page node만 제공되면 component variant 수치가 불충분할 수 있다.
- 추출 가능한 node 우선순위:
  1. Button component set
  2. Input/Text Field component set
  3. Badge/Tag component set
  4. Card/List Item component
  5. Navigation/Tab component
  6. Sheet/Modal component

## 완료 기준

- Figma 파일이 import됐고 Travel Hunter 페이지 구조가 만들어졌다.
- Component Variant 확인표의 `Figma node/link`와 상태가 갱신됐다.
- `docs/design-system-map.md`가 실제 Figma variant/token 이름 기준으로 보강됐다.
- 필요한 경우 2차 token/component 보정이 적용됐고 Fast Lane 검증이 통과했다.
