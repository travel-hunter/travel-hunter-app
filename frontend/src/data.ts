export type Policy = {
  id: string;
  title: string;
  sponsor: string;
  region: string;
  type: "할인" | "지원금" | "적립";
  audience: string;
  benefit: string;
  period: string;
  condition: string;
  documents: string[];
  officialUrl: string;
};

export type Destination = {
  id: string;
  name: string;
  region: string;
  description: string;
  imageUrl: string;
};

export type TripPlace = {
  id: string;
  time: string;
  name: string;
  category: string;
};

export type TripDay = {
  day: number;
  places: TripPlace[];
};

export type Trip = {
  id: string;
  title: string;
  region: string;
  startDate: string;
  endDate: string;
  participants: number;
  policyIds: string[];
  days: TripDay[];
};

export const policies: Policy[] = [
  {
    id: "local-vacation",
    title: "지역사랑 휴가지원",
    sponsor: "한국관광공사",
    region: "전국",
    type: "지원금",
    audience: "내국인, 농어촌 지역 1박 이상 숙박",
    benefit: "여행 경비의 50% 환급, 최대 30만원",
    period: "2026.05.01 ~ 2026.10.31",
    condition: "숙박 영수증과 교통비 증빙을 제출해야 합니다.",
    documents: ["신분증", "숙박 영수증", "교통비 증빙"],
    officialUrl: "https://knto.or.kr",
  },
  {
    id: "jeju-youth",
    title: "제주 청년 관광 할인",
    sponsor: "제주특별자치도",
    region: "제주",
    type: "할인",
    audience: "만 19세~34세 청년 여행자",
    benefit: "렌터카, 박물관, 체험 상품 최대 20% 할인",
    period: "2026.04.15 ~ 2026.12.20",
    condition: "청년 인증 후 제휴처에서 쿠폰을 사용할 수 있습니다.",
    documents: ["신분증", "청년 인증 화면"],
    officialUrl: "https://www.visitjeju.net",
  },
  {
    id: "busan-stay",
    title: "부산 체류형 여행 적립",
    sponsor: "부산관광공사",
    region: "부산",
    type: "적립",
    audience: "부산 2박 이상 여행객",
    benefit: "지역 화폐 최대 5만원 적립",
    period: "2026.06.01 ~ 2026.09.30",
    condition: "제휴 숙소 2박 이상 결제 후 앱에서 신청합니다.",
    documents: ["숙박 예약 내역", "결제 영수증"],
    officialUrl: "https://www.visitbusan.net",
  },
  {
    id: "gangwon-family",
    title: "강원 가족여행 지원금",
    sponsor: "강원특별자치도",
    region: "강원",
    type: "지원금",
    audience: "가족 단위 3인 이상 여행객",
    benefit: "체험 프로그램 결제액 30% 지원",
    period: "2026.05.10 ~ 2026.11.15",
    condition: "가족관계 확인과 체험 예약 내역이 필요합니다.",
    documents: ["가족관계증명서", "체험 예약 확인서"],
    officialUrl: "https://www.gangwon.to",
  },
];

export const destinations: Destination[] = [
  {
    id: "jeju",
    name: "제주",
    region: "제주",
    description: "해안 드라이브, 오름, 로컬 맛집을 한 번에 즐기는 섬 여행",
    imageUrl: "https://images.unsplash.com/photo-1544550285-f813152fb2fd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "busan",
    name: "부산",
    region: "부산",
    description: "바다 전망과 야시장, 도심 산책을 함께 묶기 좋은 여행지",
    imageUrl: "https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "gangneung",
    name: "강릉",
    region: "강원",
    description: "동해 일출, 커피 거리, 가족 체험 코스가 가까운 도시",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  },
];

export const trips: Trip[] = [
  {
    id: "jeju-3-days",
    title: "제주 3일 여행",
    region: "제주",
    startDate: "2026.05.17",
    endDate: "2026.05.19",
    participants: 2,
    policyIds: ["local-vacation", "jeju-youth"],
    days: [
      {
        day: 1,
        places: [
          { id: "p1", time: "09:00", name: "성산 일출봉", category: "관광지" },
          { id: "p2", time: "12:00", name: "해녀의 집", category: "맛집" },
          { id: "p3", time: "14:00", name: "우도", category: "관광지" },
          { id: "p4", time: "18:00", name: "제주시 숙소", category: "숙소" },
        ],
      },
      {
        day: 2,
        places: [
          { id: "p5", time: "10:00", name: "비자림", category: "산책" },
          { id: "p6", time: "13:00", name: "동문시장", category: "맛집" },
          { id: "p7", time: "16:00", name: "이호테우 해변", category: "관광지" },
        ],
      },
      {
        day: 3,
        places: [
          { id: "p8", time: "10:00", name: "오설록 티뮤지엄", category: "카페" },
          { id: "p9", time: "14:00", name: "공항 이동", category: "이동" },
        ],
      },
    ],
  },
  {
    id: "busan-weekend",
    title: "부산 주말 코스",
    region: "부산",
    startDate: "2026.06.06",
    endDate: "2026.06.07",
    participants: 1,
    policyIds: ["busan-stay"],
    days: [
      {
        day: 1,
        places: [
          { id: "b1", time: "11:00", name: "광안리 해변", category: "관광지" },
          { id: "b2", time: "15:00", name: "전포 카페거리", category: "카페" },
        ],
      },
    ],
  },
];

export const regions = ["전국", "제주", "부산", "강원"];
export const policyTypes = ["전체", "할인", "지원금", "적립"];
