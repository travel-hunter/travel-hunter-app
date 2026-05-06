# Travel Hunter Wanted Design QA

## 기준

- 기준 커밋: `8cda17e style: apply wanted design system pass`
- 목적: Wanted Design System 1차 적용 이후 주요 화면이 반응형 서비스 UI로 깨지지 않는지 확인한다.
- 원본 Figma 파일: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- Figma import 상태: Codex에서 로컬 `.fig`를 Figma 앱/웹으로 직접 업로드할 수 없으므로, 실제 import와 component variant 확인은 Figma에서 수동 진행이 필요하다.

## 확인한 화면

- `/login`
- `/signup`
- `/home`
- `/policies`
- `/policies/local-vacation`
- `/trips`
- `/trips/new`
- `/mypage`

## 확인한 viewport

- 390 x 844
- 1024 x 900
- 1440 x 1000

## QA 결과

- 문서 전체 horizontal overflow 없음.
- 주요 CTA, link, button의 화면 밖 이탈 없음.
- `/login`, `/signup` input과 CTA는 Wanted token pass 이후 390px에서도 잘림 없이 렌더링됨.
- `/policies`, `/policies/local-vacation`, `/trips`, `/trips/new`, `/mypage`는 390/1024/1440px 기준으로 카드, CTA, header, bottom tab의 치명적 겹침 없음.
- `/home` 390px에서 `h-scroll` 영역의 offscreen 카드가 감지됐지만, 이는 의도된 가로 스크롤 카드 레이아웃이다.
- 생성 캡처는 `frontend/test-results/design-qa`에 저장됐다. 이 경로는 git ignore 대상이며 커밋하지 않는다.

## Figma Handoff 대기 항목

- `Wanted Design System (Community).fig`를 Figma에 import한다.
- Travel Hunter 디자인 파일에 다음 페이지를 만든다:
  - `00 Wanted Reference`
  - `01 Token Map`
  - `02 Current App Screens`
  - `03 Redesigned Screens`
  - `04 Handoff`
- Figma에서 Button, Input, Badge/Tag, Card/List, Navigation, Sheet/Toast의 실제 variant 이름과 수치를 확인한다.
- 확인된 Figma 수치가 현재 `docs/design-system-map.md`와 다르면 토큰/컴포넌트 단위로 2차 보정한다.

## 남은 Design Debt

- 현재 QA는 브라우저 기준 layout QA이며, Figma frame과의 픽셀 비교는 아직 완료되지 않았다.
- Figma import 이후 실제 component metadata가 확인되면 `docs/design-system-map.md`의 mapping을 확정해야 한다.
- `/home`의 가로 스크롤 카드 UX는 의도된 동작이지만, Figma 화면에서 grid형으로 바꾸기로 결정하면 별도 화면 보정 작업으로 분리한다.
