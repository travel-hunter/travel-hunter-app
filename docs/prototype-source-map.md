# Prototype Source Map

이 production 앱은 `travel-hunter-prototype/html/travelhunter_full_flow.html`을 단일 기준 소스로 삼아 다시 구성했다.

## 기준 디자인 토큰

| Token | Value | 적용 |
|---|---:|---|
| `primary-500` | `#ff5e5b` | 주요 CTA, 프로모션, active state |
| `secondary-500` | `#00c2a8` | 보조 강조, 여행/지도 요소 |
| `accent-500` | `#ffc93c` | 혜택 금액, 절감 강조 |
| `gray-50` | `#f8f8fa` | 모바일 화면 배경 |
| `app-width` | `390px` | prototype 기준 모바일 shell |

## Route Mapping

| Prototype hash route | Production route | React page |
|---|---|---|
| `onboarding` | `/`, `/onboarding` | `OnboardingPage` |
| `signup` | `/signup` | `SignupPage` |
| `login` | `/login` | `LoginPage` |
| `profile-setup` | `/profile-setup` | `ProfileSetupPage` |
| `home` | `/home` | `HomePage` |
| `policy-list` | `/policies` | `PolicyListPage` |
| `policy-detail` | `/policies/:policyId` | `PolicyDetailPage` |
| `itinerary-list` | `/trips` | `ItineraryListPage` |
| `itinerary-create` | `/trips/new` | `ItineraryCreatePage` |
| `itinerary-detail` | `/trips/:tripId` | `ItineraryDetailPage` |
| `ai-results` | `/ai-results` | `AiResultsPage` |
| `friend-invite` | `/friend-invite` | `FriendInvitePage` |
| `mypage` | `/mypage` | `MyPage` |

## Data Mapping

Prototype의 inline JS mock data를 `frontend/src/data/prototypeData.ts`로 분리했다.

- `user`: 지영 persona
- `onboardingSlides`: 3개 온보딩 메시지
- `policies`: 지역사랑 휴가지원, 속초 숙박 할인권, 부산 여행 캐시백
- `itinerary`: 제주 3일 여행
- `recommendations`: AI 추천 후보 3건

## Production 전환 원칙

- HTML string template은 React component로 변환한다.
- hash route는 browser route로 변환한다.
- mock data는 data layer로 분리하고, future API 호출은 `frontend/src/api/client.ts`를 통한다.
- backend는 health endpoint부터 시작하고, 정책/일정/Auth API는 `mvp-api-contract.md` 기준으로 확장한다.
