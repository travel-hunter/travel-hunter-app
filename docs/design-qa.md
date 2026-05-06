# Travel Hunter Wanted Design QA

## 기준

- 브라우저 QA 기준 커밋: `8cda17e style: apply wanted design system pass`
- Figma import/component 보정 기준 커밋: `026336e style: align toast with wanted figma values`
- 원본 Figma 파일: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- Figma reference: `https://www.figma.com/design/6X5t38FCiVoIdRdi3C2olj/Wanted-Design-System---Imported-Reference`
- Travel Hunter handoff: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`

## 확인 화면과 viewport

- 화면: `/login`, `/signup`, `/home`, `/policies`, `/policies/local-vacation`, `/trips`, `/trips/new`, `/mypage`
- Viewport: `390x844`, `1024x900`, `1440x1000`

## 완료 결과

- 주요 CTA, link, button의 화면 밖 이탈 없음.
- 인증 화면 input과 CTA는 390px에서도 잘림 없이 렌더링됨.
- 정책/일정/마이페이지 화면은 카드, CTA, header, bottom tab의 치명적 겹침 없음.
- `/home` 390px의 가로 스크롤 카드는 의도된 UX로 유지.
- Button primary, height, radius는 Wanted 기준으로 보정 완료.
- Toast는 Wanted Toast child 기준 `54px`, radius `12px`, padding `11px 16px`로 보정 완료.

## Figma Handoff 상태

- Wanted reference 파일 import 완료.
- Travel Hunter handoff 파일 생성 완료.
- Handoff 페이지:
  - `00 Wanted Reference`
  - `01 Token Map`
  - `02 Current App Screens`
  - `03 Redesigned Screens`
  - `04 Handoff`
- `02 Current App Screens`에는 8개 route의 `390`/`1440` Current reference frame이 생성됐다.
- `03 Redesigned Screens`에는 8개 route의 `390`/`1440` editable Redesign native frame이 생성됐다.
- `04 Handoff`에는 route별 `Draft` 상태 보드와 코드 반영 파일 힌트가 있다.

## 남은 Design Debt

- Figma frame과 브라우저 캡처의 픽셀 비교 및 `Approved` 상태 전환.
- `/home` 가로 스크롤 카드를 grid로 바꿀지 여부.
- `Tag`와 interactive chip의 sizing 체계 분리 여부.
