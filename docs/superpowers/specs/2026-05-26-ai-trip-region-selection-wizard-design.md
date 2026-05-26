# AI 추천 일정 생성 - 지역 선택 UX 작업 명세

## 구현 상태 - 2026-05-26

- 상태: v1 설계 및 구현 완료
- 완료된 핵심 결정: 기존 `/api/recommendations/regions` 유지, 신규 `/api/recommendations/travel-areas` 분리, `backend/app/data/travel_areas.py`를 source of truth로 사용, `travelAreaId`를 신규 생성 흐름의 primary value로 사용
- 완료된 구현: travel-area API, trip `travelAreaId` 저장, `/trips/new` travel-area 선택 UX, direct URL/draft/region 전환 continuity 보강
- 검증 기록: `CHECKLIST.md` 참고
- 후속 과제: catalog 커버리지 고도화, 여행권역 추천 품질 조정, 브라우저 기반 UX smoke 반복

## 기준

- 작성일: 2026-05-26
- 대상 흐름: `/home`의 AI 추천 맞춤 일정 카드에서 시작하는 단계별 마법사형 일정 생성 UX
- 이번 명세의 범위: AI 일정 생성 중 `지역 선택 단계`
- 구현 전제: backend, API contract, route, DTO는 즉시 변경하지 않고 UX/데이터 모델 방향을 먼저 고정한다.

## 목표

AI 일정 생성에서 사용자가 여행 지역을 선택할 때, 행정구역 단위와 실제 여행 동선 단위가 어긋나지 않도록 한다. 사용자는 `강원`, `전남`, `경남`처럼 큰 지역명으로 쉽게 시작할 수 있어야 하지만, 실제 일정 생성은 `속초·고성·양양`, `강릉·동해·삼척`, `여수·순천`처럼 현실적인 여행권역 단위로 이루어져야 한다.

## 핵심 결정

1. AI 일정 생성은 v1에서 `단일 지역 선택`으로 제한한다.
2. 여기서 단일 지역은 행정구역 하나가 아니라 `하나의 여행권역`을 의미한다.
3. 사용자는 먼저 광역시/도 또는 대표 지역 카드를 선택할 수 있다.
4. `강원`, `전남`, `경남`, `경북`처럼 넓은 지역을 선택하면 즉시 세부 여행권역 선택 화면으로 전환한다.
5. `부산`, `서울`, `제주`처럼 단일 여행권으로 처리 가능한 지역은 바로 선택 가능하되, 필요하면 내부적으로 하위 권역을 확장할 수 있게 둔다.
6. 직접 검색과 전국 추천도 최종적으로는 광역시/도가 아니라 여행권역 선택으로 귀결되어야 한다.
7. 기존 `/api/recommendations/regions`는 정책 데이터 기반 지역 랭킹 API로 유지한다.
8. AI 일정 생성용 여행권역 추천은 신규 API로 분리한다.
9. 일정 생성 진입 파라미터는 `travelAreaId`를 새로 추가하고, 기존 `region`은 backward compatibility 용도로 남긴다.

## 문제 정의

`강원도` 자체를 일정 생성 단위로 사용하면 여행 동선이 비현실적일 수 있다.

예시:

```text
1일차: 춘천
2일차: 속초
3일차: 강릉
```

행정구역 기준으로는 모두 강원이지만 실제 여행 UX에서는 이동거리가 과도하다. 반대로 처음부터 모든 시/군/구를 카드로 나열하면 사용자가 선택지를 과하게 많이 보게 된다. 따라서 UX는 광역시/도로 쉽게 시작하되, 실제 추천 엔진은 여행권역을 기준으로 동작해야 한다.

## 지역 계층 구조

```text
광역시/도
→ 여행권역
→ 도시/군/구
→ 장소
```

| 레벨 | 예시 | 역할 |
|---|---|---|
| 광역시/도 | 강원, 제주, 부산, 전남 | 사용자가 쉽게 탐색하는 큰 분류 |
| 여행권역 | 속초·고성·양양, 강릉·동해·삼척 | 실제 일정 생성 단위 |
| 도시/군/구 | 속초시, 고성군, 양양군 | 검색, 정책, 장소 매핑 단위 |
| 장소 | 해변, 카페, 시장, 숙소 | 일정 구성 단위 |

## 권장 UX 흐름

### 1. 광역/대표 지역 선택

```text
어디로 떠나볼까요?

추천 지역
[제주] [부산] [강원] [전남] [경남] [경북]

원하는 지역이 없나요?
[지역 직접 검색] [AI가 지역까지 추천]
```

### 2. 넓은 지역 선택 시 세부 여행권역 선택

사용자가 `강원`을 선택하면 즉시 아래와 같은 세부 권역 선택 단계로 이동한다.

```text
강원에서 어떤 여행권역이 좋을까요?

[속초·고성·양양]
바다, 설악산, 감성 카페

[강릉·동해·삼척]
해변, 커피, 드라이브

[춘천·홍천]
호수, 레저, 당일/1박

[평창·정선]
자연, 산, 힐링

잘 모르겠어요
[AI가 강원 안에서 골라줘]
```

### 3. 지역을 모르는 사용자

사용자가 처음부터 `AI가 지역까지 추천`을 선택하면 전국 단위 후보를 광역시/도가 아니라 여행권역으로 추천한다.

```text
AI 추천 여행권역

[속초·고성·양양]
바다와 산을 같이 즐기는 2박 3일

[전주·완주]
먹거리와 한옥 감성 1박 2일

[통영·거제]
섬, 바다, 드라이브 2박 3일
```


## API 분리 결정

현재 `/api/recommendations/regions`는 `external_source_records.region` 문자열을 기준으로 정책 수, 마감 임박 수, 예상 혜택 금액, 취향 매칭을 집계하는 정책 기반 지역 랭킹 API다. 이 API는 `/home`의 인기 국내 여행지와 정책 혜택 많은 지역 표시에는 적합하지만, AI 일정 생성의 실제 여행 동선 단위로 사용하기에는 범위가 넓다.

따라서 기존 API는 유지하고, AI 일정 생성 Wizard에는 여행권역 전용 API를 새로 둔다.

```text
GET /api/recommendations/regions
= 정책 기반 지역 랭킹 API

GET /api/recommendations/travel-areas
= AI 일정 생성용 여행권역 추천 API
```

### 기존 API 유지 이유

- `/home`에서 정책 혜택이 많은 지역을 보여주는 현재 목적과 맞다.
- 기존 frontend, tests, API contract 영향을 최소화한다.
- 정책 지역 랭킹과 여행권역 추천의 책임을 섞지 않는다.

### 신규 API 필요 이유

- `강원` 같은 광역 단위를 바로 일정 생성에 쓰면 동선 품질이 낮아진다.
- `속초·고성·양양`, `강릉·동해·삼척` 같은 실제 여행권역 단위를 응답해야 한다.
- 직접 검색, 전국 추천, 광역 선택 후 세부 권역 선택을 하나의 모델로 처리할 수 있다.

### 신규 응답 타입 방향

```ts
type TravelAreaRecommendation = {
  travelAreaId: string;
  travelAreaName: string;
  sido: string;
  includedCities: string[];
  summary: string;
  tags: string[];
  policyCount: number;
  endingSoonCount: number;
  estimatedValueKrw: number;
  score: number;
};
```

예시:

```json
{
  "travelAreaId": "gangwon-sokcho-goseong-yangyang",
  "travelAreaName": "속초·고성·양양",
  "sido": "강원",
  "includedCities": ["속초", "고성", "양양"],
  "summary": "바다, 설악산, 감성 카페를 함께 즐기는 2박 3일 권역",
  "tags": ["바다", "산", "카페", "2박3일"],
  "policyCount": 4,
  "endingSoonCount": 1,
  "estimatedValueKrw": 120000,
  "score": 86
}
```

## 일정 생성 파라미터 결정

신규 Wizard와 `/trips/new` 연결에는 `travelAreaId`를 추가한다.

```text
/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang
```

기존 링크와 북마크 호환을 위해 `region`도 유지한다.

```text
/trips/new?region=강원
```

처리 규칙은 다음과 같다.

| 입력 | 처리 |
|---|---|
| `travelAreaId` 있음 | 해당 여행권역을 우선 사용 |
| `travelAreaId` 없음 + `region` 있음 | 기존 동작 유지 또는 해당 region의 기본 여행권역 후보 표시 |
| 둘 다 있음 | `travelAreaId` 우선, `region`은 표시/호환 보조값으로만 사용 |
| 둘 다 없음 | 지역 선택 Wizard 첫 단계 표시 |

## 현재 `/trips/new?region=...` 구현 확인

현재 `/trips/new?region=...`는 frontend에서 `ItineraryCreatePage`가 직접 읽는다. `region` query는 `tripCreateRegions`에 포함된 값일 때만 유효한 요청 지역으로 인정된다.

```ts
const requestedRegion = normalizeRegionParam(searchParams.get("region"));
```

현재 허용 지역은 다음과 같은 대표 지역 문자열이다.

```ts
["제주", "부산", "강원", "경주", "서울", "전남", "경북", "강릉"]
```

현재 흐름은 다음과 같다.

```text
/trips/new?region=강원
→ ItineraryCreatePage requestedRegion
→ selectedRegionDraft 초기값
→ updateProfile("region", requestedRegion)
→ draftStorage region 저장
→ appDataApi.createTrip({ region: selectedRegion, ... })
→ POST /api/trips body.region
→ backend CreateTripRequest.region
→ trips.region 저장
→ itinerary_recommendations.generate_auto_course(region=region)
```

즉 현재 `region`은 단순 표시값이 아니라 다음 역할을 동시에 가진다.

| 역할 | 현재 사용처 |
|---|---|
| 진입 query | `/trips/new?region=...` |
| 화면 선택 상태 | `selectedRegionDraft` |
| 사용자 프로필 보정 | `updateProfile("region", region)` |
| 임시 저장 | trip create draft의 `region` |
| 생성 요청 DTO | `CreateTripRequest.region` |
| DB 저장 | `trips.region` |
| 자동 코스 생성 키 | `generate_auto_course(region=region)` |

backend의 `CreateTripRequest`에는 현재 `travelAreaId`가 없다.

```py
class CreateTripRequest(BaseModel):
    title: str | None
    region: str | None
    style: str | None
    description: str | None
    policySlug: str | None
    durationDays: int | None
    startDate: date | None
    endDate: date | None
```

backend 생성 로직은 `payload.region`을 바로 읽어 `trips.region`과 자동 코스 생성에 사용한다.

```text
region = payload.region or seed profile region
trip.region = region
generate_auto_course(region=region, style=style, ...)
```

자동 코스 생성은 catalog의 `item.region == region` 정확 일치로 후보를 고른다. 따라서 `travelAreaId`를 query에만 추가하고 backend에 전달하지 않으면 실제 생성 품질은 기존 광역/대표 지역 문자열에 계속 묶인다.

## `travelAreaId` 추가 시 필요한 변경 범위

`travelAreaId`는 frontend query만으로 끝내면 안 된다. 최소한 다음 경계를 함께 확장해야 한다.

| 계층 | 필요한 변경 |
|---|---|
| Frontend route | `/trips/new?travelAreaId=...` 읽기 |
| Frontend state | `selectedTravelAreaId`, `selectedTravelAreaName`, `selectedRegion` 분리 |
| Draft | `travelAreaId`, `travelAreaName`, `sido`, `includedCities` 저장 |
| API boundary | `CreateTripRequest.travelAreaId` 추가 |
| Backend schema | `CreateTripRequest.travelAreaId` 추가 |
| Backend service | `travelAreaId`로 여행권역을 resolve한 뒤 저장/생성에 사용 |
| Auto course provider | 기존 `region` 정확 일치 대신 여행권역 기반 catalog 또는 alias 매핑 사용 |
| Legacy link | `region`만 있는 경우 기본 여행권역 후보 선택 화면으로 연결 |

권장 방식은 `travelAreaId`를 생성 요청의 primary key로 사용하고, 기존 `region`은 legacy display/fallback 값으로 남기는 것이다.

## `travelAreaId` 저장 결정

v1에서도 `travelAreaId`는 DB에 저장한다. 단, 별도 정규화 테이블까지 만들지는 않고 `trips.travel_area_id` nullable 컬럼을 추가한다.

```text
trips.region
= 사람이 보는 표시명
= 기존 화면/호환 유지
= 예: "속초·고성·양양"

trips.travel_area_id
= 시스템이 쓰는 안정적 식별자
= nullable
= 예: "gangwon-sokcho-goseong-yangyang"
```

기존 일정은 `travel_area_id = null`로 유지한다. 신규 AI Wizard로 만든 일정은 여행권역 표시명을 `trips.region`에 저장하고, 안정적 식별자인 `travel_area_id`를 함께 저장한다.

예시:

```json
{
  "title": "속초·고성·양양 3일 여행",
  "region": "속초·고성·양양",
  "travelAreaId": "gangwon-sokcho-goseong-yangyang",
  "style": "맛집",
  "startDate": "2026-06-15",
  "endDate": "2026-06-17"
}
```

저장 결과:

```text
trips.region = "속초·고성·양양"
trips.travel_area_id = "gangwon-sokcho-goseong-yangyang"
```

이 결정을 통해 정책 연결, 일정 재추천, 중복 지명 구분, 표시명 변경 대응을 안정적으로 처리한다.

## 여행권역 데이터 source of truth

v1의 여행권역 catalog source of truth는 backend 정적 데이터로 둔다.

```text
backend/app/data/travel_areas.py
```

frontend는 여행권역 목록과 추천 결과를 직접 하드코딩하지 않고 API를 통해 받아 사용한다. 이렇게 해야 frontend와 backend의 지역 기준이 갈라지지 않는다.

권장 구조:

```text
backend/app/data/travel_areas.py
→ backend service resolve/search/recommend
→ GET /api/recommendations/travel-areas
→ frontend AppDataApi
→ /trips/new Wizard
```

v1에서는 `travel_areas` DB 테이블을 만들지 않는다. 운영 중 권역 관리, 관리자 UI, 통계 집계가 필요해지는 시점에 정규화 테이블로 승격한다.

### backend travel area catalog 초안

```py
TravelArea(
    id="gangwon-sokcho-goseong-yangyang",
    name="속초·고성·양양",
    sido="강원",
    included_cities=["속초", "고성", "양양"],
    tags=["바다", "산", "카페", "2박3일"],
    summary="바다, 설악산, 감성 카페를 함께 즐기는 2박 3일 권역",
)
```

catalog는 최소한 다음 기능을 제공해야 한다.

| 기능 | 설명 |
|---|---|
| id resolve | `travelAreaId`로 권역 찾기 |
| sido filter | `강원` 선택 시 강원 권역 목록 반환 |
| search alias | `속초`, `고성`, `강릉` 같은 검색어로 권역 찾기 |
| nationwide recommend seed | 전국 추천 시 후보 권역 반환 |
| policy matching metadata | `sido`, `includedCities`로 정책 연결 후보 계산 |

## 확정된 구현 방향 요약

```text
기존 /api/recommendations/regions 유지
신규 /api/recommendations/travel-areas 추가
backend/app/data/travel_areas.py를 source of truth로 사용
frontend는 여행권역 데이터를 API로 조회
/trips/new는 travelAreaId query를 우선 사용
POST /api/trips는 travelAreaId를 받음
trips.travel_area_id nullable 컬럼 추가
trips.region은 여행권역 표시명 저장
기존 region-only 링크는 backward compatibility로 유지
```

## TravelArea catalog 상세 설계

### 데이터 필드

`backend/app/data/travel_areas.py`의 기본 단위는 `TravelArea`다.

```py
@dataclass(frozen=True)
class TravelArea:
    id: str
    name: str
    sido: str
    included_cities: tuple[str, ...]
    aliases: tuple[str, ...]
    tags: tuple[str, ...]
    styles: tuple[str, ...]
    summary: str
    priority: int
```

| 필드 | 예시 | 역할 |
|---|---|---|
| `id` | `gangwon-sokcho-goseong-yangyang` | 안정적 식별자 |
| `name` | `속초·고성·양양` | 사용자 표시명 |
| `sido` | `강원` | 광역 필터/정책 매칭 |
| `included_cities` | `("속초", "고성", "양양")` | 도시 직접 매칭 |
| `aliases` | `("속초시", "고성군", "설악산", "낙산")` | 검색 키워드 |
| `tags` | `("바다", "산", "카페", "2박3일")` | 화면 표시/추천 설명 |
| `styles` | `("바다", "힐링", "사진", "맛집")` | 취향 매칭 |
| `summary` | `바다와 설악산을 함께 즐기는 권역` | 카드 설명 |
| `priority` | `95` | 정책 데이터가 부족할 때 기본 정렬 |

### v1 전국 권역 목록

v1 catalog는 전국을 대표하는 31개 내외 권역으로 시작한다. 모든 시군구를 다루는 것이 아니라, 실제 일정 생성 품질을 유지할 수 있는 대표 여행권역 중심으로 구성한다.

| 광역 | 여행권역 | id |
|---|---|---|
| 제주 | 제주 전체 | `jeju-all` |
| 제주 | 제주 동부 | `jeju-east` |
| 제주 | 제주 서부 | `jeju-west` |
| 제주 | 서귀포 | `jeju-seogwipo` |
| 부산 | 부산 전체 | `busan-all` |
| 서울 | 서울 전체 | `seoul-all` |
| 강원 | 속초·고성·양양 | `gangwon-sokcho-goseong-yangyang` |
| 강원 | 강릉·동해·삼척 | `gangwon-gangneung-donghae-samcheok` |
| 강원 | 춘천·홍천 | `gangwon-chuncheon-hongcheon` |
| 강원 | 평창·정선 | `gangwon-pyeongchang-jeongseon` |
| 전남 | 여수·순천 | `jeonnam-yeosu-suncheon` |
| 전남 | 목포·신안 | `jeonnam-mokpo-sinan` |
| 전남 | 담양·곡성 | `jeonnam-damyang-gokseong` |
| 경남 | 통영·거제·고성 | `gyeongnam-tongyeong-geoje-goseong` |
| 경남 | 남해·하동 | `gyeongnam-namhae-hadong` |
| 경남 | 진주·사천 | `gyeongnam-jinju-sacheon` |
| 경북 | 경주 | `gyeongbuk-gyeongju` |
| 경북 | 안동 | `gyeongbuk-andong` |
| 경북 | 포항·영덕 | `gyeongbuk-pohang-yeongdeok` |
| 전북 | 전주·완주 | `jeonbuk-jeonju-wanju` |
| 전북 | 군산 | `jeonbuk-gunsan` |
| 전북 | 남원 | `jeonbuk-namwon` |
| 충남 | 공주·부여 | `chungnam-gongju-buyeo` |
| 충남 | 태안·서산 | `chungnam-taean-seosan` |
| 충남 | 보령 | `chungnam-boryeong` |
| 충북 | 단양·제천 | `chungbuk-danyang-jecheon` |
| 충북 | 청주 | `chungbuk-cheongju` |
| 경기 | 가평·양평 | `gyeonggi-gapyeong-yangpyeong` |
| 경기 | 수원·화성 | `gyeonggi-suwon-hwaseong` |
| 경기 | 파주 | `gyeonggi-paju` |
| 인천 | 인천·강화 | `incheon-ganghwa` |

### alias/search 키워드 구조

검색 대상은 `name`만이 아니다. 사용자는 관광지, 산, 해변, 도시명, 별칭으로 검색할 수 있다.

검색 대상:

```text
id
name
sido
included_cities
aliases
tags
styles
```

예시:

```py
TravelArea(
    id="gangwon-sokcho-goseong-yangyang",
    name="속초·고성·양양",
    sido="강원",
    included_cities=("속초", "고성", "양양"),
    aliases=("속초시", "고성군", "양양군", "설악산", "낙산", "동해", "속초해변"),
    tags=("바다", "산", "카페", "2박3일"),
    styles=("바다", "힐링", "사진", "맛집"),
    summary="바다와 설악산, 감성 카페를 함께 즐기는 동해 북부 권역",
    priority=95,
)
```

검색 정렬 우선순위:

```text
id 정확 일치
> name 정확 일치
> included_cities 정확 일치
> aliases 정확 일치
> name 부분 일치
> aliases 부분 일치
> tags/styles 부분 일치
> score
```

### tags/style 매칭 구조

`tags`와 `styles`는 분리한다.

```text
tags
= 사용자에게 보여주는 여행 특징
= 바다, 산, 카페, 2박3일

styles
= 사용자 취향/추천 점수에 쓰는 분류
= 바다, 역사, 맛집, 힐링, 체험, 가족, 사진
```

v1 style taxonomy:

```text
바다
산
역사
맛집
힐링
체험
가족
사진
도시
섬
```

### 기본 추천 우선순위

정책 데이터가 없거나 약한 경우에도 전국 추천이 비면 안 된다. 이를 위해 catalog에 `priority`를 둔다.

| 점수대 | 의미 |
|---|---|
| `90~100` | 전국 추천에 자주 나와도 좋은 대표 권역 |
| `80~89` | 인기/범용성이 높은 권역 |
| `70~79` | 특정 취향에 잘 맞는 권역 |
| `60~69` | 보조 후보 |
| `50~59` | v1 fallback 후보 |

예시:

| 권역 | priority |
|---|---|
| 제주 전체 | 100 |
| 부산 전체 | 96 |
| 속초·고성·양양 | 95 |
| 여수·순천 | 93 |
| 통영·거제·고성 | 92 |
| 전주·완주 | 91 |
| 경주 | 90 |
| 강릉·동해·삼척 | 89 |
| 제주 동부 | 88 |
| 가평·양평 | 86 |
| 단양·제천 | 78 |
| 청주 | 65 |

### 중복 지명 처리

`고성`처럼 여러 지역에 존재하는 지명은 하나로 합치지 않는다. 동일 query가 여러 여행권역을 반환하도록 처리하고, UI에서는 `sido`와 `includedCities`를 함께 보여준다.

예시:

```http
GET /api/recommendations/travel-areas?query=고성
```

응답 후보:

```text
속초·고성·양양
강원 · 속초, 고성, 양양

통영·거제·고성
경남 · 통영, 거제, 고성
```

이 방식은 `강원 고성`과 `경남 고성`을 안정적으로 구분하며, 사용자가 원하는 지역을 직접 선택할 수 있게 한다.

## 신규 travel-area API 상세 설계

### Endpoint

```http
GET /api/recommendations/travel-areas
```

이 endpoint는 AI 일정 생성 Wizard의 지역 선택 단계에서만 사용한다. 기존 `/api/recommendations/regions`는 정책 기반 지역 랭킹 API로 유지한다.

### 요청 query

| parameter | 예시 | 필수 여부 | 역할 |
|---|---|---|---|
| `sido` | `강원` | optional | 특정 광역시/도 안의 여행권역 목록 조회 |
| `query` | `속초` | optional | 직접 검색어 |
| `mode` | `nationwide` | optional | 전국 추천 모드 |
| `style` | `바다`, `역사`, `맛집` | optional | 사용자 여행 취향 보정 |
| `limit` | `3` | optional | 반환 개수 제한, 기본 6, 최소 1, 최대 20 |

지원 예시:

```http
GET /api/recommendations/travel-areas?sido=강원
GET /api/recommendations/travel-areas?query=속초
GET /api/recommendations/travel-areas?mode=nationwide&style=바다&limit=3
GET /api/recommendations/travel-areas
```

아무 query가 없으면 `mode=nationwide`와 동일하게 처리한다.

### 요청 우선순위

```text
query > sido > mode=nationwide > default nationwide
```

| 요청 | 처리 |
|---|---|
| `?query=속초` | 검색 결과 우선 |
| `?sido=강원` | 강원 권역 목록 |
| `?mode=nationwide` | 전국 추천 |
| query 없음 | 전국 추천 |
| `?query=속초&sido=강원` | 강원 안에서 속초 검색 |
| `?query=속초&mode=nationwide` | query 우선, mode 무시 |

`query`와 `sido`가 함께 들어오면 `sido`를 검색 범위 제한으로 사용한다. 예를 들어 `?sido=강원&query=고성`은 강원 고성이 포함된 권역만 반환한다. `?query=고성`만 들어오면 강원 고성과 경남 고성을 모두 구분해 반환할 수 있다.

### 응답 schema

```ts
type TravelAreaRecommendationResponse = {
  mode: "sido" | "search" | "nationwide";
  sido: string | null;
  query: string | null;
  items: TravelAreaRecommendation[];
  emptyReason: "unsupported_sido" | "no_match" | null;
};
```

```ts
type TravelAreaRecommendation = {
  travelAreaId: string;
  travelAreaName: string;
  sido: string;
  includedCities: string[];
  summary: string;
  tags: string[];
  reason: string;
  policyCount: number;
  localPolicyCount: number;
  nationwidePolicyCount: number;
  endingSoonCount: number;
  estimatedValueKrw: number;
  score: number;
};
```

예시:

```json
{
  "mode": "sido",
  "sido": "강원",
  "query": null,
  "emptyReason": null,
  "items": [
    {
      "travelAreaId": "gangwon-sokcho-goseong-yangyang",
      "travelAreaName": "속초·고성·양양",
      "sido": "강원",
      "includedCities": ["속초", "고성", "양양"],
      "summary": "바다, 설악산, 감성 카페를 함께 즐기는 2박 3일 권역",
      "tags": ["바다", "산", "카페", "2박3일"],
      "reason": "강원 지역 혜택과 속초·고성·양양 여행 동선이 잘 맞아요.",
      "policyCount": 5,
      "localPolicyCount": 4,
      "nationwidePolicyCount": 1,
      "endingSoonCount": 1,
      "estimatedValueKrw": 120000,
      "score": 86
    }
  ]
}
```

### emptyReason

| 값 | 의미 | UX 처리 |
|---|---|---|
| `unsupported_sido` | catalog에 없는 광역시/도 | 전국 추천 또는 직접 검색 유도 |
| `no_match` | 검색어와 일치하는 권역 없음 | 다른 검색어 입력 또는 AI 전국 추천 유도 |
| `null` | 정상 결과 또는 빈 결과가 아닌 상태 | 일반 렌더링 |

### 정책 집계 규칙

여행권역은 `sido`와 `includedCities`를 가진다.

예시:

```text
travelAreaName = 속초·고성·양양
sido = 강원
includedCities = [속초, 고성, 양양]
```

정책 매칭은 다음 순서로 계산한다.

| 정책 데이터 | 매칭 방식 | 가중치 |
|---|---|---|
| `city`가 `includedCities`와 일치 | 도시 직접 매칭 | 높음 |
| `region`이 `sido`와 일치 | 광역 매칭 | 중간 |
| `is_nationwide=true` 또는 `region=전국` | 전국 공통 혜택 | 낮음 |
| title/organizer/source text에 도시명 포함 | 보조 매칭 | 낮음 |

전국 정책은 `nationwidePolicyCount`와 `policyCount`에는 포함하지만, 점수에는 낮은 가중치로만 반영한다. 전국 정책만으로 모든 권역이 비슷하게 좋아 보이면 안 된다.

### score 정렬 규칙

정렬은 다음 요소를 우선한다.

```text
도시 직접 매칭
> 광역 매칭
> 마감 임박
> 예상 혜택 금액
> style/tag 매칭
> 전국 정책
> catalog 기본 우선순위
```

v1 점수 산식은 deterministic해야 한다. AI 모델 호출 없이 동일 입력이면 동일 순서가 나와야 테스트가 가능하다.

권장 산식:

```text
score =
  cityPolicyCount * 35
  + sidoPolicyCount * 20
  + endingSoonCount * 8
  + min(estimatedValueKrw / 10000, 20)
  + styleMatchedCount * 5
  + nationwidePolicyCount * 2
  + catalogPriorityBonus
```

최종 score는 `0..100` 범위로 clamp한다.

### mode별 동작

#### `sido` mode

```http
GET /api/recommendations/travel-areas?sido=전남
```

해당 시도의 모든 권역을 반환하되, 정책/취향 점수 기준으로 정렬한다. 권역 수가 적은 시도는 limit보다 적게 반환될 수 있다.

#### `search` mode

```http
GET /api/recommendations/travel-areas?query=고성
```

검색 대상:

```text
travelAreaName
sido
includedCities
aliases
tags
```

중복 지명은 여러 권역을 반환해 사용자가 구분할 수 있게 한다.

#### `nationwide` mode

```http
GET /api/recommendations/travel-areas?mode=nationwide&style=역사&limit=3
```

전국 catalog 후보를 대상으로 정책/취향/기본 우선순위를 합산해 반환한다. 정책 데이터가 부족해도 catalog 기본 우선순위로 결과를 제공해야 한다.

### frontend 사용 규칙

| UX 상황 | API 호출 |
|---|---|
| 강원 같은 광역 선택 | `GET /api/recommendations/travel-areas?sido=강원` |
| 직접 검색 | `GET /api/recommendations/travel-areas?query=속초` |
| AI가 지역까지 추천 | `GET /api/recommendations/travel-areas?mode=nationwide&style={profile.style}&limit=3` |
| 아무 조건 없이 시작 | `GET /api/recommendations/travel-areas?mode=nationwide` |

frontend는 `travelAreaId`를 선택 상태의 primary value로 사용한다. `travelAreaName`은 표시명과 trip title 기본값에 사용한다.

## 직접 검색 UX

검색은 광역시/도, 도시/군/구, 여행권역 키워드를 모두 받을 수 있어야 한다.

| 검색어 | 기대 처리 |
|---|---|
| 강원 | 강원 여행권역 목록 표시 |
| 속초 | 속초·고성·양양 권역 표시 |
| 고성 | 강원 고성/경남 고성처럼 중복 지역명 구분 |
| 강릉 | 강릉·동해·삼척 권역 표시 |
| 제주 | 제주 전체 또는 제주 동부/서부/서귀포 선택 |
| 부산 | 부산 전체 선택 |
| 여수 | 여수·순천 또는 여수 단독 권역 선택 |
| 통영 | 통영·거제 권역 선택 |
| 결과 없음 | 검색 결과 없음 + 전국 추천 유도 |

## 데이터 모델 방향

지역 선택 단계는 다음 세 상태 중 하나만 가져야 한다.

```ts
type RegionSelection =
  | { mode: "recommended"; sido: string; travelAreaId: string; travelAreaName: string; includedCities: string[] }
  | { mode: "searched"; sido: string; travelAreaId: string; travelAreaName: string; includedCities: string[] }
  | { mode: "ai_recommend"; sido: string | null; travelAreaId: string; travelAreaName: string; includedCities: string[] };
```

예시:

```ts
{
  mode: "recommended",
  sido: "강원",
  travelAreaId: "gangwon-sokcho-goseong-yangyang",
  travelAreaName: "속초·고성·양양",
  includedCities: ["속초", "고성", "양양"]
}
```

## MVP 여행권역 후보

| 광역 | MVP 여행권역 예시 |
|---|---|
| 제주 | 제주 전체, 제주 동부, 제주 서부, 서귀포 |
| 부산 | 부산 전체 |
| 강원 | 속초·고성·양양, 강릉·동해·삼척, 춘천·홍천, 평창·정선 |
| 전북 | 전주·완주, 군산, 남원 |
| 전남 | 여수·순천, 목포·신안, 담양·곡성 |
| 경남 | 통영·거제, 남해·하동, 진주·사천 |
| 경북 | 경주, 안동, 포항·영덕 |
| 충남 | 공주·부여, 태안·서산, 보령 |
| 충북 | 단양·제천, 청주 |
| 경기 | 가평·양평, 수원·화성, 파주 |
| 인천 | 인천·강화 |
| 서울 | 서울 전체 |

## 정책 연결 기준

여행권역은 내부적으로 여러 행정구역을 포함한다. 정책 매칭은 행정구역 범위를 기준으로 연결한다.

| 정책 범위 | 매칭 방식 |
|---|---|
| 전국 정책 | 모든 여행권역에 연결 |
| 광역 정책 | 해당 시도 안의 모든 여행권역에 연결 |
| 시군구 정책 | 포함 도시가 일치하는 여행권역에 연결 |
| 특정 장소/업종 정책 | 장소 카테고리와 함께 매칭 |

## 테스트 케이스 초안

테스트는 강원 예시에 한정하지 않는다. `강원`은 넓은 도 단위 예시일 뿐이며, v1 검증은 단일 도시형, 섬/특수 권역형, 넓은 도 단위, 중복 지명, 정책 데이터가 약한 지역을 모두 포함해야 한다.

| 유형 | 예시 | 검증 이유 |
|---|---|---|
| 단일 도시형 | 부산, 서울 | 세부 권역 없이 바로 선택 가능한지 확인 |
| 섬/특수 권역형 | 제주 | 전체/동부/서부/서귀포처럼 특수 분기 가능 |
| 넓은 도 단위 | 강원, 전남, 경남, 경북 | 세부 여행권역 선택 필수 |
| 중복 지명 포함 | 고성 | 강원 고성/경남 고성 구분 필요 |
| 정책 데이터 약한 지역 | 충북, 충남 | 정책이 적어도 catalog 추천 가능해야 함 |

### 광역/대표 지역 선택

| ID | 케이스 | 행동 | 기대 결과 |
|---|---|---|---|
| REGION-SIDO-01 | 제주 선택 | 제주 클릭 | 제주 전체 또는 제주 하위 권역 선택 가능 |
| REGION-SIDO-02 | 부산 선택 | 부산 클릭 | 부산 전체 선택 가능 |
| REGION-SIDO-03 | 강원 선택 | 강원 클릭 | 강원 세부 여행권역 화면 표시 |
| REGION-SIDO-04 | 전남 선택 | 전남 클릭 | 여수·순천, 목포·신안 등 권역 표시 |
| REGION-SIDO-05 | 경남 선택 | 경남 클릭 | 통영·거제, 남해·하동 등 권역 표시 |

### 세부 여행권역 선택

| ID | 케이스 | 행동 | 기대 결과 |
|---|---|---|---|
| REGION-AREA-01 | 권역 선택 | 속초·고성·양양 클릭 | 다음 단계 이동 가능 |
| REGION-AREA-02 | 권역 변경 | 속초 선택 후 강릉 선택 | 기존 선택 해제, 새 권역 active |
| REGION-AREA-03 | 세부 권역 모름 | AI가 강원 안에서 골라줘 클릭 | 강원 내부 권역 자동 추천 |
| REGION-AREA-04 | 뒤로가기 | 권역 화면에서 뒤로가기 | 광역/대표 지역 선택으로 복귀 |
| REGION-AREA-05 | 권역 없이 다음 | 강원만 선택하고 다음 클릭 | 세부 권역 선택 안내 |

### 직접 검색

| ID | 케이스 | 행동 | 기대 결과 |
|---|---|---|---|
| REGION-SEARCH-01 | 광역 검색 | 강원 검색 | 강원 여행권역 목록 표시 |
| REGION-SEARCH-02 | 도시 검색 | 속초 검색 | 속초·고성·양양 권역 표시 |
| REGION-SEARCH-03 | 중복 지역명 | 고성 검색 | 강원 고성/경남 고성 구분 표시 |
| REGION-SEARCH-04 | 단독 도시 검색 | 부산 검색 | 부산 전체 선택 |
| REGION-SEARCH-05 | 결과 없음 | 없는 지역 검색 | 검색 결과 없음 + 전국 추천 유도 |
| REGION-SEARCH-06 | 검색 선택 후 변경 | 여수 선택 후 강원 클릭 | 기존 검색 선택 해제, 강원 권역 선택으로 전환 |

### 전국 AI 추천

| ID | 케이스 | 행동 | 기대 결과 |
|---|---|---|---|
| REGION-AI-01 | 전국 추천 클릭 | AI가 지역까지 추천 클릭 | 여행권역 후보 3개 표시 |
| REGION-AI-02 | 추천 후보 선택 | 통영·거제 선택 | 다음 단계 이동 가능 |
| REGION-AI-03 | 추천 후보 불만족 | 다시 추천 클릭 | 다른 여행권역 후보 표시 |
| REGION-AI-04 | 조건 기반 추천 | 바다/2박 3일 조건 후 추천 | 바다 여행권역 우선 추천 |
| REGION-AI-05 | 추천 결과 없음 | 조건 과도 | 조건 완화 안내 |

### 신규 travel-area API 광역 선택 테스트

| ID | 요청 | 기대 결과 |
|---|---|---|
| AREA-SIDO-01 | `?sido=강원` | 속초·고성·양양, 강릉·동해·삼척 등 강원 권역 반환 |
| AREA-SIDO-02 | `?sido=전남` | 여수·순천, 목포·신안, 담양·곡성 등 반환 |
| AREA-SIDO-03 | `?sido=경남` | 통영·거제, 남해·하동, 진주·사천 등 반환 |
| AREA-SIDO-04 | `?sido=경북` | 경주, 안동, 포항·영덕 등 반환 |
| AREA-SIDO-05 | `?sido=제주` | 제주 전체, 제주 동부, 제주 서부, 서귀포 반환 |
| AREA-SIDO-06 | `?sido=부산` | 부산 전체 반환 |
| AREA-SIDO-07 | `?sido=서울` | 서울 전체 반환 |
| AREA-SIDO-08 | `?sido=없는지역` | `items=[]`, `emptyReason=unsupported_sido` |

### 신규 travel-area API 직접 검색 테스트

| ID | 요청 | 기대 결과 |
|---|---|---|
| AREA-SEARCH-01 | `?query=속초` | 속초·고성·양양 반환 |
| AREA-SEARCH-02 | `?query=여수` | 여수·순천 반환 |
| AREA-SEARCH-03 | `?query=통영` | 통영·거제 반환 |
| AREA-SEARCH-04 | `?query=경주` | 경주 반환 |
| AREA-SEARCH-05 | `?query=제주` | 제주 관련 권역 반환 |
| AREA-SEARCH-06 | `?query=고성` | 강원 고성 포함 권역과 경남 고성 포함 권역을 구분해서 반환 |
| AREA-SEARCH-07 | `?query=없는도시` | `items=[]`, `emptyReason=no_match` |

### 신규 travel-area API 전국 추천 테스트

| ID | 조건 | 기대 결과 |
|---|---|---|
| AREA-NATION-01 | 조건 없음 | 전국 후보 반환 |
| AREA-NATION-02 | `style=바다` | 제주, 속초, 여수, 통영, 부산 계열 우선 |
| AREA-NATION-03 | `style=역사` | 경주, 전주, 공주, 안동 계열 우선 |
| AREA-NATION-04 | `style=힐링` | 평창·정선, 담양·곡성, 남해·하동 계열 우선 |
| AREA-NATION-05 | 정책 데이터 없음 | catalog 기본 우선순위로 반환 |
| AREA-NATION-06 | 전국 정책만 있음 | 모든 권역이 똑같이 과대평가되지 않음 |

### 신규 travel-area API 정책 집계 테스트

| ID | 조건 | 기대 결과 |
|---|---|---|
| AREA-SCORE-01 | 강원 광역 정책만 있음 | 강원 권역들의 `localPolicyCount`와 `score` 상승 |
| AREA-SCORE-02 | 속초 city 정책 있음 | 속초 포함 권역이 강원 내 다른 권역보다 우선 |
| AREA-SCORE-03 | 전국 정책만 있음 | `nationwidePolicyCount`에는 반영되지만 전체 score 과대평가 방지 |
| AREA-SCORE-04 | 전남 여수 정책 있음 | 여수·순천 권역 우선 |
| AREA-SCORE-05 | 경남 통영 정책 있음 | 통영·거제 권역 우선 |
| AREA-SCORE-06 | 충북 정책 데이터 없음 | catalog 기본 우선순위로 단양·제천 또는 청주 반환 |

## 구현 전 확인할 항목

- 현재 `/api/recommendations/regions`는 정책 기반 지역 랭킹 API로 유지하고, 여행권역 추천은 신규 API로 분리한다.
- `/trips/new`는 신규 `travelAreaId` query를 우선 사용하고, 기존 `region` query는 backward compatibility로 유지한다.
- 정책 데이터의 지역 필드가 시도/시군구 단위로 안정적으로 정규화되어 있는지 확인해야 한다.
- 여행권역 정적 seed를 frontend에 둘지 backend `app/data`에 둘지 결정해야 한다.
- v1에서는 전국 전체 커버보다 인기 여행권역 중심으로 시작하고, 미지원 지역은 검색/추천에서 명확히 안내한다.

## 범위 밖

- 실제 AI 모델 호출 방식 변경
- 정책 추천 랭킹 알고리즘 전면 개편
- 다지역 여행 생성
- 숙소/교통 예약 기능
- 지도 기반 경로 최적화

## 승인 기준

- 사용자는 광역시/도로 쉽게 시작할 수 있다.
- 넓은 지역을 선택하면 세부 여행권역 선택으로 자연스럽게 이어진다.
- 직접 검색과 전국 추천도 최종적으로 여행권역을 선택하게 만든다.
- 생성되는 일정은 하나의 현실적인 여행권역 안에서 구성된다.
- 정책 연결은 여행권역에 포함된 행정구역 기준으로 설명 가능해야 한다.

