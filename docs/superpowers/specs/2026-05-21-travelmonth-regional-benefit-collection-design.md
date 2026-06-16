# 여행가는 달 지역 여행할인 수집 설계

## 기준

- 작성일: 2026-05-21
- 대상 출처: https://korean.visitkorea.or.kr/travelmonth/benefit.do
- 출처 이름: 여행가는 달
- 출처 성격: 한국관광공사 공식 캠페인 페이지
- 대상 메뉴: 지역 여행할인 모아보기
- 적용 단계: Phase 2 외부 공식 데이터 수집

## 목적

홈 지역/목적지 추천에서 "부산이 지금 좋다", "강원이 적합하다" 같은 정책 중심 추천 근거를 만들기 위해, 여행가는 달의 지역 여행할인 항목을 안정적으로 수집한다.

이 설계는 추천 엔진 구현보다 한 단계 앞선 외부 원천 데이터 스키마를 확정한다. 원천 페이지의 항목 구조를 최대한 보존하고, 추천 점수에 필요한 값은 파생 필드로 분리한다.

## 확정 원칙

1. 원문 보존 + 파생 필드 생성 방식을 사용한다.
2. 여행가는 달은 Phase 2 외부 수집의 핵심 공식 출처로 포함한다.
3. 지역 추천 점수는 정책 중심으로 계산한다.
4. 전국 정책은 지역별 후보가 부족할 때만 fallback으로 사용한다.
5. 혜택 가치는 명시 금액을 우선한다.
6. 취향 보정은 정책 점수를 뒤집지 않는 보조 점수로만 사용한다.
7. 기능을 먼저 안정적으로 만들고, 외부 수집은 별도 단계로 구현하되 매우 중요한 개발 대상으로 관리한다.

## 공식 페이지 항목 구조

목록 영역에서 확인되는 값:

- 혜택 유형: 예: 할인혜택
- 제목
- 기간
- 상태: 예: 진행중, 종료
- 기관 또는 주관자

상세 영역에서 확인되는 값:

- 주관/기관 텍스트
- 제목
- 태그 목록
- 기간
- 할인혜택 본문
- 문의처
- 자세히 보기 외부 링크

현재 구조상 공식 페이지 자체가 모든 항목에 고정된 공개 id를 제공한다고 가정하지 않는다. 따라서 idempotent 수집을 위해 제목, 기관, 기간 기반의 해시 키를 사용한다.

## 수집 스키마

```ts
type TravelMonthRegionalBenefit = {
  sourceName: "여행가는 달";
  sourceType: "official_campaign";
  sourceUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do";
  sourceCategory: "regional_benefit";

  externalId: string;
  canonicalKey: string;
  detailUrl: string | null;
  collectedPageUrl: string;

  title: string;
  organizerText: string;
  organizers: string[];

  region: string | null;
  city: string | null;
  isNationwide: boolean;

  statusText: string | null;
  status: "active" | "ended" | "scheduled" | "unknown";
  startDate: string | null;
  endDate: string | null;

  benefitText: string;
  benefitValueText: string | null;
  extractedAmountKrw: number | null;
  extractedDiscountPercent: number | null;
  benefitValueType: "amount" | "percent" | "free" | "upgrade" | "mixed" | "unknown";

  tags: string[];
  contactText: string | null;

  inferredTravelStyles: Array<"휴식" | "맛집" | "체험" | "자연" | "사진">;
  confidence: number;
  fieldCompleteness: number;

  rawListText: string;
  rawDetailText: string;
  rawPayload: Record<string, unknown>;

  lastFetchedAt: string;
  lastVerifiedAt: string | null;
  freshnessStatus: "fresh" | "stale" | "expired" | "unknown";
};
```

## 필드 규칙

`externalId`는 공식 항목 id가 확인되면 그 값을 사용한다. 공식 id가 없으면 `sourceCategory + title + organizerText + startDate + endDate`를 정규화한 뒤 해시로 생성한다.

`canonicalKey`는 중복 제거 기준이다. `title + organizerText + period`를 정규화한 해시로 생성한다. 같은 외부 상세 링크를 여러 항목이 공유할 수 있으므로 URL 단독으로 중복 판단하지 않는다.

`region`과 `city`는 `organizerText`에서 우선 추출한다. 예를 들어 `강원특별자치도, 영월군`은 `region=강원`, `city=영월군`으로 정규화한다. 기관이 `한국관광공사` 단독이면 `isNationwide=true` 후보로 처리하되, 제목이나 혜택 본문에 명확한 지역명이 있으면 해당 지역으로 보정한다.

`status`는 목록의 상태 텍스트를 우선한다. 상태 텍스트가 없거나 신뢰도가 낮으면 `startDate`, `endDate`, 수집일을 기준으로 `active`, `ended`, `scheduled`를 계산한다.

`benefitValueText`는 금액, 퍼센트, 무료, 업그레이드 같은 혜택 핵심 구문이다. 원문 전체는 `benefitText`에 보존한다.

`extractedAmountKrw`는 명시 금액이 있는 경우에만 채운다. 여러 금액이 있으면 초기 구현에서는 가장 큰 금액을 사용한다. 예: 개인 최대 10만원, 팀 최대 20만원이면 `200000`.

`extractedDiscountPercent`는 명시 퍼센트가 있는 경우에만 채운다. 여러 퍼센트가 있으면 가장 큰 값을 사용한다.

`benefitValueType`은 금액 우선으로 분류한다. 금액과 퍼센트가 함께 있으면 `mixed`로 둘 수 있으나, 추천 점수에서는 금액을 우선 사용한다.

`inferredTravelStyles`는 태그, 제목, 혜택 본문으로 추론한다. 예시 매핑은 다음과 같다.

- 휴식: 캠핑, 호텔, 숙박, 템플스테이, 리조트, 사우나
- 맛집: 맛집, 식음료, 음료, 전통주, 음식점
- 체험: 체험, 투어, 박물관, 과학관, 레일파크, 테마파크
- 자연: 케이블카, 캠핑장, DMZ, 유람선, 시티투어, 해상
- 사진: 사진, 전망대, 야경, 포토, 핫스팟

`confidence`는 파싱 신뢰도다. 필수 필드가 충분하고 날짜/지역/혜택이 안정적으로 추출되면 높게 둔다.

`fieldCompleteness`는 수집 항목의 채움 정도다. 상세 링크 또는 문의처가 없어도 원천 레코드는 저장하되, 내부 정책 후보 전환 시 낮은 우선순위로 둘 수 있다.

## 추천 점수 매핑

지역/목적지 추천 점수는 다음 순서로 계산한다.

1. 1차: 신청 가능 정책 수
2. 2차: 마감 임박
3. 3차: 명시 금액 기반 혜택 가치
4. 보조: 사용자 취향 보정

정책 수 계산에는 `status=active` 항목을 기본 사용한다. `scheduled`는 별도 영역에서 예고 추천으로 쓸 수 있지만, MVP 추천 랭킹의 주 점수에는 넣지 않는다.

마감 임박 점수는 `endDate` 기준으로 계산한다. 7일 이내는 강한 가산, 14일 이내는 약한 가산을 적용한다.

혜택 가치는 `extractedAmountKrw`를 우선한다. 금액이 없고 퍼센트만 있는 경우는 별도 낮은 보조 점수로 처리한다. 금액도 퍼센트도 없으면 혜택 가치 점수는 0으로 둔다.

전국 정책은 지역별 후보가 부족할 때만 fallback으로 반영한다. 이 원칙은 지역별 차별성을 유지하기 위한 필수 조건이다.

취향 보정은 `inferredTravelStyles`, 사용자 선호 지역, 기존 여행 스타일을 기반으로 계산하되 정책 점수를 뒤집지 않도록 상한을 둔다. 지역별 active 정책이 0개인 후보가 취향 보정만으로 1위가 될 수 없다.

## 수집 주기

캠페인 진행 기간에는 1일 1회 수집한다.

마감 14일 이내 active 항목이 있는 기간에는 12시간 1회까지 허용한다.

비시즌이거나 모든 항목이 종료된 경우에는 주 1회로 낮춘다.

매 수집마다 `lastFetchedAt`을 갱신한다. 파싱 결과가 필수 필드 기준을 통과하면 `lastVerifiedAt`을 갱신한다. 날짜와 검증 상태를 기준으로 `freshnessStatus`를 계산한다.

## 저장 경계

이 스키마는 내부 `Policy` 응답 DTO가 아니라 외부 원천 레코드다. 수집기는 원천 레코드를 저장하고, 별도 변환 단계가 내부 정책 후보 또는 지역 추천 점수 입력값을 만든다.

권장 경계:

- collector: 공식 페이지 접근, 항목 파싱, 원문 저장
- normalizer: 지역/날짜/금액/취향 태그 파생
- repository: 원천 레코드 upsert와 이력 관리
- recommendation service: 지역별 점수 계산
- API boundary: 홈 추천 카드 또는 관련 정책 목록 노출

## 오류와 품질 관리

필수 필드인 `title`, `organizerText`, `benefitText`, `collectedPageUrl`이 없으면 해당 항목은 저장하지 않고 수집 오류로 기록한다.

날짜 파싱에 실패하면 `status=unknown`으로 저장하되 원문은 보존한다. 추천 점수에는 넣지 않는다.

지역 추론이 실패하면 `region=null`로 저장한다. 지역 추천 점수에는 넣지 않고, 전국 fallback에도 자동 포함하지 않는다.

상세 링크가 외부 사이트로 연결되므로 링크 자체를 신뢰 점수로 쓰지 않는다. 공식 페이지에 노출된 텍스트를 우선 근거로 삼는다.

공식 페이지 구조가 변경되면 `fieldCompleteness`와 수집 실패율이 먼저 변한다. 수집 작업은 실패 항목 수, 신규 항목 수, 종료 항목 수, 중복 항목 수를 로그로 남겨야 한다.

## 테스트 기준

수집기 구현 시 필요한 테스트:

- 공식 페이지 HTML fixture에서 목록과 상세 항목을 파싱한다.
- 금액 문구에서 최대 금액을 추출한다.
- 퍼센트 할인 문구에서 최대 퍼센트를 추출한다.
- 기관 텍스트에서 지역과 시군구를 정규화한다.
- 한국관광공사 단독 항목을 전국 fallback 후보로 분류한다.
- 진행중/종료 상태와 날짜 기준 상태 계산이 일치한다.
- 취향 태그 추론이 정책 점수를 뒤집지 않는 보조 입력으로만 쓰인다.
- 같은 항목을 재수집하면 `canonicalKey` 기준으로 중복 생성하지 않는다.

## 비범위

이번 설계는 외부 수집 스키마 확정이 목적이다. 다음 항목은 구현 계획 단계에서 별도로 다룬다.

- 실제 DB 테이블과 Alembic migration
- 수집 scheduler 실행 방식
- Playwright 또는 HTTP 기반 수집 방식 선택
- 홈 추천 API 응답 추가
- 프론트 홈 카드 UI
- 내부 `Policy` DTO로의 최종 변환 규칙

## 남은 위험

공식 페이지의 HTML 구조는 변경될 수 있다. 수집기는 원문 저장과 completeness 지표를 통해 구조 변경을 빠르게 감지해야 한다.

일부 항목은 지역이 기관명에 명확히 드러나지 않을 수 있다. 제목/본문 기반 지역 보정은 보수적으로 적용해야 한다.

금액과 퍼센트가 혼합된 혜택은 실제 가치 비교가 어렵다. 초기에는 명시 금액 우선 원칙을 유지하고, 퍼센트는 보조 점수로만 사용한다.

전국 fallback을 너무 넓게 적용하면 지역별 차별성이 약해진다. 지역별 active 후보가 부족할 때만 제한적으로 반영한다.
