# Wanted Design System Component Values

## 기준

- Figma source: `Wanted Design System (Community)`
- Source file key: `dob3r6VmG3WjsOZV0Cb8i4`
- Local export source: `C:\Users\HP\Downloads\Wanted Design System (Community).fig`
- App baseline commit: `ba7122f docs: add figma and vps readiness checklists`
- 추출 방식: Figma MCP로 원본 Community 파일의 component set metadata를 읽고, Figma 앱/웹 import 후 handoff에 재확인한다.

> Figma node URL 형식: `https://www.figma.com/design/dob3r6VmG3WjsOZV0Cb8i4/Wanted-Design-System--Community-?node-id=<node-id-with-hyphen>`

## Component Values

| Component | Figma node | Component set | Variant/property | 주요 수치 | 현재 앱 매핑 | 적용 판단 |
|---|---|---|---|---|---|---|
| Button | `16215:37602` | `Button/Button` | `Variant=Solid/Outlined`, `Color=Primary/Assistive`, `Size=Small/Medium/Large`, `Icon Only=True/False`, `Disable=True/False` | Large `48h`, Medium `40h`, Small `32h`; radius `12/10/8`; Large padding `28x12`; Medium `20x9`; Small `14x7`; Primary fill `#0066ff`; disabled fill `#f4f4f5`; outlined stroke `#70737c` at `16%` | `Button`, `LinkButton`, `.btn`, `.btn.sm` | 2차 보정으로 앱 primary token, default button height/radius, small button height/radius를 Wanted 수치에 맞췄다. |
| Text Field/Input | `16215:31385` | `Textinput/Textfield` | `Status=Normal/Positive/Negative`, `Active=True/False`, `Focus=True/False`, `Disable=True/False`, `Trailing Button=True/False` | Field width sample `335`; field height `48`; component height `100`; vertical gap `8`; background resource `335x48`; background radius `12`; negative text `#ff4242`; helper text `#37383c` at `61%` | `.field input`, `.search-field`, auth/profile form fields | 앱 input height/radius는 거의 일치. focus/error 색상은 Figma node 재확인 후 token화 가능. |
| Textarea | `16215:32165` | `Textinput/Textarea` | `Status=Normal/Negative`, `Resize=Normal/Limit/Fixed`, `Active`, `Focus`, `Disable` | sample width `335`; normal height `138`; fixed height `190` | 현재 MVP에는 textarea 중심 화면 없음 | 보류. 실제 textarea UI가 생길 때 적용. |
| Content Badge | `16215:25365` | `Content Badge/Content Badge` | `Variant=Solid/Outlined`, `Size=Medium/Small/XSmall`, `Color=Neutral/Accent` | Medium `28h`, Small `24h`, XSmall `20h` | `Tag`, `.tag`, policy badges | 앱 `.tag` min-height `26px`는 Small/Medium 중간값이다. 정책 카드 밀도를 유지하려면 현행 유지 또는 `24px` 축소. |
| Chip | `16215:42078` | `Chip/Chip` | `Size=XSmall/Small/Medium/Large`, `Variant=Solid/Outlined`, `Disable`, `Active` | Large `40h`, Medium `36h`, Small `32h`, XSmall `24h` | filter chip, profile setup option chip | 앱 filter/profile chip은 Medium/Large 성격. 44px touch target이 필요한 모바일 선택 UI는 앱 기준을 우선한다. |
| Card | `16215:29264` | `Card/Card` | `Platform=Desktop/Mobile`, `Skeleton=True/False` | Desktop `240x214`; Mobile `152x164` | travel/policy summary cards | Travel Hunter cards는 정보량이 많아 1:1 size 적용보다 surface/border/radius 원칙만 따른다. |
| List Card | `16215:29433` | `Card/List Card` | `Platform=Desktop/Mobile`, `Skeleton=True/False` | Desktop `480x80`; Mobile `335x64` | `PolicyListCard`, `ItineraryCard` list mode | 앱 목록 카드는 `335px` 모바일 기준과 호환. 삭제 버튼/CTA가 있는 카드는 높이 확장 허용. |
| List Cell | `16215:26404` | `List Cell/List Cell` | `Vertical Padding=None/Small/Medium/Large`, `Vertical Align=Center/Top`, `Fill Width`, `Text Ellipsis`, `Selected`, `Disable` | Medium `48h`; Large `56h`; Small `40h`; Fill width sample `375`; fixed sample `335` | setting rows, option rows, sheet rows | sheet/list row는 `48px` 이상 유지. 선택 row는 accessibility 때문에 44px 이상 유지. |
| Tab | `16215:21806` | `Tab/Tab` | `Resize=Hug/Fill`, `Size=Small/Medium/Large`, `Horizontal Padding=True/False` | Large `56h`; Medium `48h`; Small `40h`; width `335/375` | top tab, route filters | 현재 앱 bottom/desktop nav는 Figma Tab과 구조가 다르므로 active state token만 참고. |
| Tab Item | `16215:22000` | `Tab/Resource/Tab` | `Active=True/False`, `Disabled=True/False` | item sample `45x48` | bottom tab item, filter tab | active/inactive state 비교 기준으로 사용. |
| Sheet/Modal | Manual node required | Not captured | overlay, panel, radius, max height, padding | Figma MCP가 Presentation/Feedback 하위 영역에서 timeout. Figma 앱 import 후 component node 선택 필요. | policy trip select sheet | 수동 node 링크 확보 전까지 앱 현행 sheet 유지. |
| Toast/Alert | Manual node required | Not captured | surface, border, icon, text color, timeout | Figma MCP가 Feedback 하위 영역에서 timeout. Figma 앱 import 후 component node 선택 필요. | `Toast`, `ErrorState`, `LoadingState` | 수동 node 링크 확보 전까지 앱 현행 toast/error 유지. |

## 추출된 Figma 섹션 구조

| Page | Section | 확인된 하위 component |
|---|---|---|
| `3 Component` | `2 Action` | `Button`, `Text Button`, `Icon Button`, `Chip`, `Toggle Icon` |
| `3 Component` | `3 Selection and Input` | `Textinput`, `Select`, `Control`, `Segmented Control`, `Framed Style` |
| `3 Component` | `4 Content` | `Content Badge`, `Thumbnail`, `Avatar`, `List Cell`, `Card` |
| `3 Component` | `6 Navigation` | `Tab`, `Category`, `Page Indicator`, `Pagination` |
| `3 Component` | `8 Presentation` | `Tooltip` 확인, 나머지는 manual 확인 필요 |

## 현재 앱과의 주요 차이

- Wanted primary blue `#0066ff`를 현재 앱 `--primary-500`에 반영했다.
- Wanted Button Large `48px` 높이와 radius `12px`를 현재 앱 `.btn` 기본값에 반영했다.
- Wanted Textfield background radius는 `12px`이고 현재 앱 input radius는 Wanted 1차 pass에서 대체로 맞춰진 상태다.
- Wanted Content Badge는 `20/24/28px`, Chip은 `24/32/36/40px` 체계다. 현재 앱 `Tag`는 `26px`라 정책 badge 밀도에는 적당하지만 정확한 Wanted size는 아니다.
- Wanted List Card mobile width/height는 `335x64`다. Travel Hunter list card는 policy/trip 정보량 때문에 높이를 고정하지 않고 콘텐츠 기반으로 유지한다.

## 다음 결정

1. `Tag`/filter chip을 Content Badge 기준과 Chip 기준으로 분리할지 결정한다.
2. Figma 앱 import 후 Sheet/Modal, Toast/Alert의 실제 node 링크를 추가한다.
3. 복제된 Travel Hunter Figma 파일의 node URL을 원본 node ID와 나란히 기록한다.
