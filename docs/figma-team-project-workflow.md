# Travel Hunter Figma Team Project Workflow

## 기준

- Figma project URL: `https://www.figma.com/files/team/1631977620101471167/project/594946224?fuid=1631977617264528913`
- Figma team plan: `travle-hunter`
- Figma plan key: `team::1631977620101471167`
- Local Wanted source: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- Imported reference file: `https://www.figma.com/design/6X5t38FCiVoIdRdi3C2olj/Wanted-Design-System---Imported-Reference`
- Imported reference file key: `6X5t38FCiVoIdRdi3C2olj`
- Travel Hunter handoff file: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
- Travel Hunter handoff file key: `6qxML42kKtZWIwLUU1YDpX`
- Current app branch: `feat/prototype-to-react`

## 가능 여부

Travel Hunter 디자인 작업은 제공된 Figma 팀 기준으로 진행할 수 있다.

Codex/Figma 도구가 확인한 사용 가능 범위:

- `team::1631977620101471167` 팀 plan 사용 가능
- 새 Figma file 생성 또는 기존 file 편집 가능
- 최근 접근 가능한 파일 중 `Travel Hunter Sprint 1 HTML Flow` 확인 가능
- Figma file key와 node ID가 있으면 component metadata/context 확인 가능
- 웹 화면 capture를 새 파일 또는 기존 Figma 파일에 추가 가능
- 이번 작업에서 `Travel Hunter Design System Handoff` 파일 생성과 5개 page 구조 세팅 완료

제한:

- Codex는 로컬 `.fig` 파일을 Figma 프로젝트 폴더에 직접 import할 수 없다.
- `project/594946224` URL은 Figma file key가 아니라 프로젝트 폴더 URL이므로 직접 편집 대상이 아니다.
- 프로젝트 안으로 `.fig`를 넣거나 파일을 이동하는 작업은 Figma 앱/웹에서 수행해야 한다. 현재 `Wanted Design System - Imported Reference` import는 완료됐다.

## 권장 파일 구성

Figma 프로젝트 안에서 다음 두 파일을 분리해 관리한다.

| 파일 | 목적 |
|---|---|
| `Wanted Design System - Imported Reference` | `Wanted Design System (Community).fig` import 원본 보관 및 component node 확인. 완료: `https://www.figma.com/design/6X5t38FCiVoIdRdi3C2olj/Wanted-Design-System---Imported-Reference` |
| `Travel Hunter Design System Handoff` | Travel Hunter 전용 token map, 현재 화면, redesign, handoff 기록. 생성 완료: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX` |

이미 존재하는 `Travel Hunter Sprint 1 HTML Flow`는 과거 Sprint 1/HTML flow 기준 파일이므로, 새 디자인 시스템 handoff와 섞지 않는 것을 기본값으로 한다.

## Figma 앱/웹에서 수행할 단계

1. Figma project URL을 연다.
2. `Wanted Design System (Community).fig`를 import한다. 완료.
3. import된 파일 이름을 `Wanted Design System - Imported Reference`로 정리한다. 완료.
4. `Travel Hunter Design System Handoff` 파일을 확인한다.
   - 생성 완료 URL: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
5. handoff 파일의 다음 page 구조를 확인한다.
   - `00 Wanted Reference`
   - `01 Token Map`
   - `02 Current App Screens`
   - `03 Redesigned Screens`
   - `04 Handoff`
6. `Wanted Design System - Imported Reference`에서 필요한 component set을 선택하고 node link를 복사한다. 완료.
7. 복사한 node link를 repo 문서의 원본 node ID와 나란히 기록한다. 완료.

## Codex가 이어서 할 수 있는 일

Figma import 이후 file URL 또는 component node URL이 제공되면 Codex는 다음을 수행한다.

- Figma 수치와 `tokens.css`/`app.css` 비교
- 필요한 경우 token/component 중심 추가 보정
- 변경 후 `npm run typecheck`, `npm test`, `npm run build` 검증

## Node Link 수집 기준

root/page URL은 사용하지 않는다. 반드시 component set 또는 실제 component node를 선택한 상태로 링크를 복사한다.

우선순위:

1. `Sheet/Modal` 완료. Dedicated Sheet는 없고 `Alert/Resource/Dialog`를 참고 기준으로 기록.
2. `Toast/Alert` 완료.
3. Button 완료.
4. Text Field/Input 완료.
5. Badge/Tag 완료.
6. Card/List Item 완료.
7. Navigation/Tab 완료.

기록할 값:

- 복제 파일 node URL
- component set 이름
- variant property와 option
- 주요 size, padding, radius
- fill/stroke/shadow
- typography
- app component mapping

## 완료 기준

- Figma 프로젝트 안에 `Wanted Design System - Imported Reference`가 존재한다.
- Figma 프로젝트 안에 `Travel Hunter Design System Handoff`가 존재한다. 완료: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
- handoff 파일에 5개 page가 만들어졌다. 완료.
- `Sheet/Modal`, `Toast/Alert` node URL이 확보됐다. 완료.
- repo 문서가 원본 node ID와 복제 파일 node URL을 함께 기록한다. 완료.
- `02 Current App Screens`와 `03 Redesigned Screens`에 1차 대상 8개 route의 mobile/desktop frame이 생성됐다. 완료.
- `04 Handoff`에 route별 상태 보드와 코드 반영 파일 힌트가 생성됐다. 완료.
