# Travel Hunter Figma Import Checklist

## 목적

- `Wanted Design System (Community).fig`를 Figma에 import한 뒤, 현재 앱의 디자인 토큰과 실제 Wanted component 수치를 대조한다.
- 이 문서는 Figma 앱/웹에서 수행해야 하는 수동 import와, import 이후 Codex/개발자가 확인해야 할 항목을 고정한다.
- `.fig` 원본은 repo에 커밋하지 않는다.

## 기준 파일

- Figma project URL: `https://www.figma.com/files/team/1631977620101471167/project/594946224?fuid=1631977617264528913`
- Figma plan: `travle-hunter`
- Figma plan key: `team::1631977620101471167`
- Local source: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- Travel Hunter handoff file: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
- Travel Hunter handoff file key: `6qxML42kKtZWIwLUU1YDpX`
- Current app baseline commit: `af1615b style: align buttons with wanted figma values`
- Current mapping doc: `docs/design-system-map.md`
- Browser QA doc: `docs/design-qa.md`
- Component values doc: `docs/figma-component-values.md`
- Team/project workflow doc: `docs/figma-team-project-workflow.md`

## Figma Import Steps

1. Figma 앱 또는 웹에서 Travel Hunter project URL을 연다.
2. 해당 프로젝트 안에서 `Wanted Design System (Community).fig`를 import한다.
3. import된 파일 이름을 `Wanted Design System - Imported Reference`로 정리한다.
4. Community 원본 파일을 직접 수정하지 않고, 팀/프로젝트 소유 reference로만 사용한다.
5. Travel Hunter 디자인 handoff 파일을 연다.
   - 생성 완료: `Travel Hunter Design System Handoff`
   - URL: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
6. Travel Hunter handoff 파일의 다음 페이지 구조를 확인한다.
   - `00 Wanted Reference`
   - `01 Token Map`
   - `02 Current App Screens`
   - `03 Redesigned Screens`
   - `04 Handoff`
7. `00 Wanted Reference`에는 import한 Wanted 원본 frame/component 링크 또는 복제본을 배치한다.
8. `01 Token Map`에는 `docs/design-system-map.md`의 token mapping을 Figma variable/style 이름과 나란히 정리한다.
9. `02 Current App Screens`에는 현재 앱 캡처를 배치한다.
10. `03 Redesigned Screens`에는 실제 보정 대상 화면을 만든다.
11. `04 Handoff`에는 최종 token/component 결정과 code mapping을 기록한다.

기존 `Travel Hunter Sprint 1 HTML Flow`는 유지할 수 있지만, 디자인 시스템 handoff는 새 파일로 분리하는 것을 기본값으로 한다.

## Component Variant 확인표

| Component | Figma node/link | 확인할 값 | 현재 앱 기준 | 상태 |
| --- | --- | --- | --- | --- |
| Button | `16215:37602` / `Button/Button` | variant name, height, padding, radius, primary/disabled/focus color | `Button`, `.btn` | Captured from source Figma |
| Text Field/Input | `16215:31385` / `Textinput/Textfield` | height, border, focus ring, placeholder color, error state | `.field input`, `.search-field` | Captured from source Figma |
| Badge/Tag | `16215:25365` / `Content Badge`, `16215:42078` / `Chip` | radius, padding, border, tone colors | `Tag`, `.tag` | Captured from source Figma |
| Card/List Item | `16215:29264` / `Card`, `16215:29433` / `List Card`, `16215:26404` / `List Cell` | surface, border, radius, shadow, title/meta spacing | `Policy*Card`, `ItineraryCard` | Captured from source Figma |
| Navigation/Tab | `16215:21806` / `Tab`, `16215:22000` / `Tab Item` | active state, item height, icon/text gap, desktop/mobile behavior | `ServiceLayout`, `BottomTabs` | Captured from source Figma |
| Sheet/Modal | Manual node required | overlay, radius, max height, panel padding, row spacing | policy trip select sheet | Pending manual Figma selection |
| Toast/Alert | Manual node required | surface, border, text color, icon usage | `Toast`, `ErrorState` | Pending manual Figma selection |

Captured 수치의 상세 내용은 `docs/figma-component-values.md`를 기준으로 한다. Figma 앱/웹 import 이후 node ID가 복제 파일 기준으로 바뀌면, 원본 node ID와 복제 파일 node link를 나란히 기록한다.

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
- 현재 원본 Figma URL 기준으로 일부 component set은 추출 완료했다. import된 복제 파일에서는 node ID가 달라질 수 있으므로, 다음 순서로 복제 파일 node URL을 보강한다.
  1. Button component set
  2. Input/Text Field component set
  3. Badge/Tag component set
  4. Card/List Item component
  5. Navigation/Tab component
  6. Sheet/Modal component
  7. Toast/Alert component

## 완료 기준

- Figma 파일이 import됐고 Travel Hunter 페이지 구조가 만들어졌다. 현재 handoff page 구조는 생성 완료, Wanted `.fig` import는 수동 대기 중이다.
- Component Variant 확인표의 `Figma node/link`와 상태가 갱신됐다.
- `docs/design-system-map.md`가 실제 Figma variant/token 이름 기준으로 보강됐다.
- 필요한 경우 2차 token/component 보정이 적용됐고 Fast Lane 검증이 통과했다.
