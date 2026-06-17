from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote, unquote


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


POLICY_REGION_AREA_ID_PREFIX = "policy-region:"


def make_policy_region_area_id(sido: str, city: str) -> str:
    return f"{POLICY_REGION_AREA_ID_PREFIX}{quote(sido.strip(), safe='')}:{quote(city.strip(), safe='')}"


def make_policy_region_area(sido: str, city: str) -> TravelArea:
    normalized_sido = sido.strip()
    normalized_city = city.strip().removesuffix("시").removesuffix("군").removesuffix("구")
    return TravelArea(
        make_policy_region_area_id(normalized_sido, normalized_city),
        normalized_city,
        normalized_sido,
        (normalized_city,),
        (f"{normalized_city}시", f"{normalized_city}군", f"{normalized_city}구"),
        ("정책 혜택", "지역 여행", normalized_sido),
        ("지역 여행", "혜택", "맛집"),
        f"{normalized_city} 정책 혜택과 연결되는 {normalized_sido} 여행 지역입니다.",
        60,
    )


def _policy_region_area_from_id(area_id: str) -> TravelArea | None:
    if not area_id.startswith(POLICY_REGION_AREA_ID_PREFIX):
        return None
    encoded_parts = area_id.removeprefix(POLICY_REGION_AREA_ID_PREFIX).split(":", 1)
    if len(encoded_parts) != 2:
        return None
    sido = unquote(encoded_parts[0]).strip()
    city = unquote(encoded_parts[1]).strip()
    if not sido or not city:
        return None
    return make_policy_region_area(sido, city)


TRAVEL_AREAS: tuple[TravelArea, ...] = (
    TravelArea("jeju-all", "제주 전체", "제주", ("제주", "서귀포"), ("제주시", "서귀포시", "한라산", "중문", "성산"), ("섬", "바다", "자연", "2박3일"), ("섬", "바다", "힐링", "사진", "맛집"), "한라산과 바다를 넓게 둘러보는 제주 한 바퀴", 100),
    TravelArea("jeju-east", "제주 동부", "제주", ("제주", "서귀포"), ("성산", "우도", "표선", "월정리", "섭지코지"), ("바다", "오름", "사진", "드라이브"), ("바다", "자연", "사진", "힐링"), "성산과 우도, 오름을 따라가는 동쪽 루트", 88),
    TravelArea("jeju-west", "제주 서부", "제주", ("제주", "서귀포"), ("협재", "한림", "애월", "산방산", "모슬포"), ("바다", "카페", "노을", "드라이브"), ("바다", "사진", "힐링", "맛집"), "협재와 애월의 노을을 담은 서쪽 코스", 87),
    TravelArea("jeju-seogwipo", "서귀포", "제주", ("서귀포",), ("중문", "천지연", "정방폭포", "올레길"), ("자연", "폭포", "힐링", "올레"), ("자연", "힐링", "사진"), "폭포와 올레길, 중문을 묶은 남쪽 여행", 84),
    TravelArea("busan-all", "부산 전체", "부산", ("부산",), ("해운대", "광안리", "감천문화마을", "영도", "서면"), ("바다", "도시", "맛집"), ("바다", "도시", "맛집", "사진"), "해운대와 광안리, 미식을 함께 즐기는 도시 여행", 96),
    TravelArea("seoul-all", "서울 전체", "서울", ("서울",), ("종로", "한강", "성수", "홍대", "명동", "경복궁"), ("도시", "역사", "맛집", "쇼핑"), ("도시", "역사", "맛집", "사진"), "종로와 성수, 한강을 오가는 도심 산책", 85),
    TravelArea("gangwon-sokcho-goseong-yangyang", "속초·고성·양양", "강원", ("속초", "고성", "양양"), ("속초시", "고성군", "양양군", "설악산", "낙산", "동해", "속초해변"), ("바다", "산", "카페", "2박3일"), ("바다", "산", "힐링", "사진", "맛집"), "설악산과 동해 해변을 함께 담은 북부 여행", 95),
    TravelArea("gangwon-gangneung-donghae-samcheok", "강릉·동해·삼척", "강원", ("강릉", "동해", "삼척"), ("강릉시", "동해시", "삼척시", "정동진", "묵호", "장호항", "커피거리"), ("바다", "커피", "드라이브", "동해"), ("바다", "맛집", "사진", "힐링"), "커피 거리와 해안 드라이브를 엮은 동해안 루트", 89),
    TravelArea("gangwon-chuncheon-hongcheon", "춘천·홍천", "강원", ("춘천", "홍천"), ("춘천시", "홍천군", "남이섬", "소양강", "비발디파크"), ("호수", "레저", "가족", "1박2일"), ("가족", "체험", "힐링", "자연"), "소양강과 남이섬을 가볍게 잇는 내륙 나들이", 82),
    TravelArea("gangwon-pyeongchang-jeongseon", "평창·정선", "강원", ("평창", "정선"), ("평창군", "정선군", "대관령", "오대산", "아리랑시장"), ("산", "자연", "힐링", "시장"), ("산", "힐링", "자연", "가족"), "대관령과 정선 산길에서 쉬어가는 고원 휴식", 80),
    TravelArea("jeonnam-yeosu-suncheon", "여수·순천", "전남", ("여수", "순천"), ("여수시", "순천시", "오동도", "순천만", "여수밤바다", "국가정원"), ("바다", "정원", "야경", "맛집"), ("바다", "맛집", "사진", "힐링"), "여수 밤바다와 순천만 정원을 담은 남도 코스", 93),
    TravelArea("jeonnam-mokpo-sinan", "목포·신안", "전남", ("목포", "신안"), ("목포시", "신안군", "유달산", "천사대교", "섬티아고"), ("섬", "바다", "근대문화", "맛집"), ("섬", "바다", "역사", "맛집", "사진"), "목포 근대골목과 신안 섬을 잇는 서남해 여행", 81),
    TravelArea("jeonnam-damyang-gokseong", "담양·곡성", "전남", ("담양", "곡성"), ("담양군", "곡성군", "죽녹원", "메타세쿼이아", "섬진강", "기차마을"), ("숲", "힐링", "가족", "자연"), ("힐링", "가족", "자연", "사진"), "죽녹원과 섬진강을 따라 쉬어가는 초록 루트", 79),
    TravelArea("gyeongnam-tongyeong-geoje-goseong", "통영·거제·고성", "경남", ("통영", "거제", "고성"), ("통영시", "거제시", "고성군", "동피랑", "외도", "바람의언덕", "상족암"), ("바다", "섬", "드라이브", "맛집"), ("바다", "섬", "사진", "맛집"), "동피랑과 거제 해안을 넘나드는 남해 드라이브", 92),
    TravelArea("gyeongnam-namhae-hadong", "남해·하동", "경남", ("남해", "하동"), ("남해군", "하동군", "독일마을", "금산", "화개장터", "섬진강"), ("바다", "산", "힐링", "드라이브"), ("바다", "산", "힐링", "사진"), "독일마을과 섬진강을 함께 담은 느린 여행", 83),
    TravelArea("gyeongnam-jinju-sacheon", "진주·사천", "경남", ("진주", "사천"), ("진주시", "사천시", "진주성", "남강", "사천바다케이블카"), ("역사", "강", "바다", "가족"), ("역사", "가족", "사진", "체험"), "진주성과 사천 바다를 연결한 가족 코스", 74),
    TravelArea("gyeongbuk-gyeongju", "경주", "경북", ("경주",), ("경주시", "불국사", "첨성대", "황리단길", "보문"), ("역사", "한옥", "맛집", "사진"), ("역사", "맛집", "사진", "가족"), "불국사와 황리단길을 함께 걷는 역사 산책", 90),
    TravelArea("gyeongbuk-andong", "안동", "경북", ("안동",), ("안동시", "하회마을", "월영교", "도산서원"), ("역사", "전통", "한옥", "힐링"), ("역사", "힐링", "사진", "가족"), "하회마을과 월영교의 고요함을 담은 전통 여행", 78),
    TravelArea("gyeongbuk-pohang-yeongdeok", "포항·영덕", "경북", ("포항", "영덕"), ("포항시", "영덕군", "호미곶", "영일대", "강구항", "블루로드"), ("바다", "일출", "대게", "드라이브"), ("바다", "맛집", "사진"), "호미곶과 영덕 바다를 따라가는 해안 루트", 77),
    TravelArea("jeonbuk-jeonju-wanju", "전주·완주", "전북", ("전주", "완주"), ("전주시", "완주군", "한옥마을", "객리단길", "아원고택"), ("한옥", "맛집", "역사", "카페"), ("역사", "맛집", "사진", "힐링"), "한옥마을과 완주 카페를 엮은 미식 코스", 91),
    TravelArea("jeonbuk-gunsan", "군산", "전북", ("군산",), ("군산시", "근대문화거리", "선유도", "초원사진관"), ("근대문화", "바다", "맛집", "사진"), ("역사", "바다", "맛집", "사진"), "근대문화거리와 선유도 바다를 오가는 군산 여행", 76),
    TravelArea("jeonbuk-namwon", "남원", "전북", ("남원",), ("남원시", "광한루", "지리산", "춘향테마파크"), ("역사", "산", "전통", "힐링"), ("역사", "산", "힐링", "가족"), "광한루와 지리산 자락을 따라가는 동부 여행", 70),
    TravelArea("chungnam-gongju-buyeo", "공주·부여", "충남", ("공주", "부여"), ("공주시", "부여군", "공산성", "무령왕릉", "궁남지", "백제문화"), ("역사", "백제", "가족", "사진"), ("역사", "가족", "사진", "체험"), "공산성과 부여 유산을 차분히 걷는 백제 산책", 84),
    TravelArea("chungnam-taean-seosan", "태안·서산", "충남", ("태안", "서산"), ("태안군", "서산시", "안면도", "간월암", "꽃지해변"), ("바다", "노을", "드라이브", "가족"), ("바다", "사진", "힐링", "가족"), "안면도와 꽃지해변을 담은 서해 드라이브", 82),
    TravelArea("chungnam-boryeong", "보령", "충남", ("보령",), ("보령시", "대천해수욕장", "머드축제", "무창포"), ("바다", "축제", "체험", "가족"), ("바다", "체험", "가족", "사진"), "대천해변과 축제 체험을 즐기는 활기 있는 여행", 72),
    TravelArea("chungbuk-danyang-jecheon", "단양·제천", "충북", ("단양", "제천"), ("단양군", "제천시", "도담삼봉", "만천하스카이워크", "청풍호"), ("강", "산", "체험", "힐링"), ("산", "체험", "힐링", "사진"), "도담삼봉과 청풍호를 함께 보는 전망 코스", 78),
    TravelArea("chungbuk-cheongju", "청주", "충북", ("청주",), ("청주시", "수암골", "상당산성", "청남대"), ("도시", "역사", "카페", "가족"), ("도시", "역사", "가족", "맛집"), "수암골과 상당산성을 가볍게 엮은 도시 산책", 65),
    TravelArea("gyeonggi-gapyeong-yangpyeong", "가평·양평", "경기", ("가평", "양평"), ("가평군", "양평군", "남이섬", "아침고요수목원", "두물머리"), ("자연", "레저", "가족", "1박2일"), ("힐링", "가족", "체험", "사진"), "남이섬과 두물머리를 잇는 근교 나들이", 86),
    TravelArea("gyeonggi-suwon-hwaseong", "수원·화성", "경기", ("수원", "화성"), ("수원시", "화성시", "수원화성", "행궁동", "제부도"), ("역사", "도시", "바다", "카페"), ("역사", "도시", "사진", "맛집"), "수원화성과 제부도를 함께 고려한 남부 코스", 75),
    TravelArea("gyeonggi-paju", "파주", "경기", ("파주",), ("파주시", "헤이리", "임진각", "출판단지", "마장호수"), ("예술", "역사", "카페", "1박2일"), ("도시", "역사", "사진", "힐링"), "헤이리와 임진각을 오가는 북쪽 산책", 73),
    TravelArea("incheon-ganghwa", "인천·강화", "인천", ("인천", "강화"), ("인천시", "강화군", "송도", "차이나타운", "월미도", "강화도"), ("바다", "역사", "도시", "섬"), ("바다", "역사", "도시", "가족"), "송도와 강화 섬길을 함께 보는 서해 여행", 80),
)


def list_travel_areas() -> tuple[TravelArea, ...]:
    return TRAVEL_AREAS


def get_travel_area(area_id: str | None) -> TravelArea | None:
    if not area_id:
        return None
    normalized = area_id.strip()
    return next((area for area in TRAVEL_AREAS if area.id == normalized), None) or _policy_region_area_from_id(normalized)
