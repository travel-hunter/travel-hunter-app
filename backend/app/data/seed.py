USER = {
    "id": "1",
    "name": "지영",
    "nickname": "지영",
    "email": "jiyoung@travel.kr",
    "birthDate": "1997-04-12",
    "gender": None,
    "region": "제주",
    "homeRegion": "서울 마포",
    "residenceArea": "서울 마포",
    "preferredRegions": "제주,부산,강원",
    "persona": "혜택을 꼼꼼히 챙기는 29세 직장인",
    "savedAmount": 120000,
    "onboardingCompleted": True,
    "socialAccounts": [],
    "createdAt": "2026-05-04T00:00:00Z",
    "updatedAt": "2026-05-04T00:00:00Z",
}

PROFILE = {
    "region": "제주",
    "style": "휴식",
    "budget": "1인 40만원 이하",
}

PROFILE_OPTIONS = {
    "regions": ["제주", "부산", "강원", "전국"],
    "travelStyles": ["휴식", "맛집", "자연", "사진"],
    "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"],
}

POLICIES = [
    {
        "id": "local-vacation",
        "slug": "local-vacation",
        "label": "TH",
        "tag": "최대 30만원",
        "title": "지역사랑 휴가지원",
        "org": "한국관광공사",
        "region": "전국",
        "deadline": "2026-10-31",
        "amount": "최대 30만원 환급",
        "summary": "국내 1박 이상 여행 시 숙박, 교통, 체험비 일부를 환급해주는 지원 정책입니다.",
        "match": 98,
        "category": "환급",
        "requirements": ["국내 거주자", "숙박 1박 이상", "영수증 제출"],
        "documents": ["신분증 사본", "숙박 영수증", "교통비 증빙"],
        "officialUrl": "https://korean.visitkorea.or.kr/",
        "applyUrl": "https://korean.visitkorea.or.kr/kor/bbs/view/B_0000000083",
    },
    {
        "id": "sokcho-stay",
        "slug": "sokcho-stay",
        "label": "SC",
        "tag": "50% 할인",
        "title": "속초 숙박 할인권",
        "org": "속초시",
        "region": "강원",
        "deadline": "2026-08-15",
        "amount": "숙박비 50% 할인",
        "summary": "강원권 평일 숙박 예약 시 지역 숙소에서 사용할 수 있는 할인권을 제공합니다.",
        "match": 86,
        "category": "숙박",
        "requirements": ["평일 숙박", "지역 숙소", "사전 예약"],
        "documents": ["예약 내역", "결제 영수증"],
        "officialUrl": "https://www.sokcho.go.kr/sc/portal",
        "applyUrl": "https://www.sokcho.go.kr/sc/portal/tourism/apply",
    },
    {
        "id": "busan-cashback",
        "slug": "busan-cashback",
        "label": "BS",
        "tag": "5% 캐시백",
        "title": "부산 여행 캐시백",
        "org": "부산관광재단",
        "region": "부산",
        "deadline": "2026-09-30",
        "amount": "카드 결제 5% 캐시백",
        "summary": "부산 지역 제휴 매장에서 결제하면 여행 경비 일부를 캐시백으로 돌려받습니다.",
        "match": 79,
        "category": "캐시백",
        "requirements": ["제휴 카드", "부산 결제", "월 한도 적용"],
        "documents": ["카드 결제 내역"],
        "officialUrl": "https://www.bto.or.kr/kor/cashback",
        "applyUrl": "https://www.bto.or.kr/kor/cashback/apply",
    },
]

TRIP = {
    "id": "jeju-3-days",
    "title": "제주 3일 여행",
    "dates": "2026.06.15 - 06.17",
    "people": ["지영", "민서", "현우"],
    "expectedSaving": "12만원",
    "days": {
        1: [
            {"time": "09:00", "label": "성산 일출봉", "meta": "자연 · 관광지"},
            {"time": "12:30", "label": "해녀의 집", "meta": "해산물 · 별점 4.7"},
            {"time": "15:00", "label": "우도 코스", "meta": "반나절 동선 · 사진 명소"},
        ],
        2: [
            {"time": "10:00", "label": "오설록 티뮤지엄", "meta": "카페 · 실내"},
            {"time": "13:00", "label": "협재 해변", "meta": "해변 · 산책"},
            {"time": "18:30", "label": "동문시장", "meta": "로컬 맛집 · 야시장"},
        ],
        3: [
            {"time": "09:30", "label": "사려니숲길", "meta": "숲길 · 자연"},
            {"time": "13:00", "label": "공항 근처 브런치", "meta": "이동 18분"},
            {"time": "15:00", "label": "렌터카 반납", "meta": "체크리스트 완료"},
        ],
    },
}

RECOMMENDATIONS = [
    {
        "label": "CA",
        "title": "월정리 바다 카페",
        "meta": "Day 2 오후에 적합 · 이동 18분",
        "reason": "비 오는 날에도 머물기 좋고 사진 만족도가 높습니다.",
    },
    {
        "label": "FO",
        "title": "고기국수 로컬 맛집",
        "meta": "Day 1 점심 대체 후보",
        "reason": "예산을 줄이면서 제주 대표 메뉴를 경험할 수 있습니다.",
    },
    {
        "label": "SP",
        "title": "사려니숲길 짧은 코스",
        "meta": "Day 3 오전 추천",
        "reason": "공항 이동 전 부담 없는 산책 동선입니다.",
    },
]

INVITE_URL = "travelhunter.app/i/jeju-3d"
INVITE_TOKEN = "jeju-3d"
INVITE_CREATED_AT = "2026-05-04T00:00:00Z"
INVITE_EXPIRES_AT = "2026-06-30T23:59:59Z"
