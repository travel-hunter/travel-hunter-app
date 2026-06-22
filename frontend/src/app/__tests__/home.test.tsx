import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { appDataApi, type RegionRecommendation, type Trip } from "../../api";
import { getPreviewTrip } from "../../test/fixtures";
import { login, renderAppRoute } from "../../test/renderAppRoute";

describe("Travel Hunter app — home", () => {
  it("renders the prototype home rails with real policy links", async () => {
    await login();
    cleanup();
    renderAppRoute("/home");

    await waitFor(() =>
      expect(document.body).toHaveTextContent("이번 주 혜택"),
    );
    expect(document.body).toHaveTextContent("어디로 떠나세요?");
    expect(screen.getByLabelText("마이페이지")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("안녕,");
    expect(document.body).toHaveTextContent(
      "이번 주 놓치면 아쉬운 혜택이 있어요",
    );
    expect(document.body).toHaveTextContent("인기 국내 여행지");
    expect(document.body).toHaveTextContent("AI 추천 맞춤 일정");
    expect(document.body).not.toHaveTextContent("추천 혜택");
    expect(screen.getByLabelText("이번 주 혜택 정책 목록")).toBeInTheDocument();
    expect(document.querySelector(".ds-home-rail")).toBeTruthy();
    const destinationRail = screen.getByLabelText("인기 국내 여행지 목록");
    expect(destinationRail).toBeInTheDocument();
    await waitFor(() => {
      const destinationLinks = within(destinationRail).getAllByRole("link");
      expect(destinationLinks.length).toBeGreaterThan(0);
      expect(destinationLinks[0]).toHaveAttribute(
        "href",
        expect.stringMatching(/^\/trips\/new\?region=/),
      );
    });
    await waitFor(() =>
      expect(
        within(destinationRail).getAllByText(/(혜택|마감 임박) \d+개/).length,
      ).toBeGreaterThan(0),
    );
    expect(document.body).not.toHaveTextContent("⭐ 4.9");
    await waitFor(() =>
      expect(screen.getByText("이번 주 인기 정책")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("이번 주 혜택 정책 목록")).getAllByRole(
          "link",
        ).length,
      ).toBeGreaterThan(0),
    );
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("이번 주 혜택 정책 목록")).getAllByRole(
          "link",
        ).length,
      ).toBeGreaterThan(0),
    );
  });

  it("keeps the home destination rail on legacy region recommendations even when preferred regions are set", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: "부산",
      preferredRegions: ["부산", "강원"],
      style: "맛집",
      budget: "40만원 이하",
    });
    const railRegionRecommendations: RegionRecommendation[] = [
      {
        region: "서울",
        title: "서울 전시 지원",
        reason: "관심지역 밖이지만 기존 인기 여행지 rail 후보입니다.",
        policyCount: 8,
        endingSoonCount: 1,
        estimatedValueKrw: 70000,
        score: 14,
        styleMatchedCount: 2,
      },
    ];
    const preferredRegionRecommendations: RegionRecommendation[] = [
      {
        region: "강원",
        title: "강원 미식 지원",
        reason: "맛집 혜택이 많고 마감 임박 정책이 있습니다.",
        policyCount: 7,
        endingSoonCount: 2,
        estimatedValueKrw: 50000,
        score: 12,
        styleMatchedCount: 3,
      },
      {
        region: "부산",
        title: "부산 로컬 혜택",
        reason: "맛집 취향과 연결되는 지역 혜택입니다.",
        policyCount: 5,
        endingSoonCount: 0,
        estimatedValueKrw: 30000,
        score: 9,
        styleMatchedCount: 2,
      },
    ];
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockImplementation((params) =>
        Promise.resolve(
          params?.preferredRegions
            ? preferredRegionRecommendations
            : railRegionRecommendations,
        ),
      );

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      await waitFor(() =>
        expect(listRegionRecommendationsSpy).toHaveBeenCalledWith({
          style: "맛집",
          region: "부산",
          limit: 3,
        }),
      );
      await waitFor(() =>
        expect(listRegionRecommendationsSpy).toHaveBeenCalledWith({
          style: "맛집",
          preferredRegions: ["부산", "강원"],
          limit: 3,
        }),
      );
      const destinationRail = screen.getByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /서울/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EC%84%9C%EC%9A%B8");
      expect(
        within(destinationRail).getByText("마감 임박 1개"),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("link", { name: /부산 맛집 코스 만들기/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      expect(
        screen.getByRole("link", { name: /강원 맛집 코스 만들기/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EA%B0%95%EC%9B%90");
    } finally {
      getProfileSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("passes legacy region only when preferred regions are unset", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: "부산",
      preferredRegions: null,
      style: "맛집",
      budget: "40만원 이하",
    });
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue([]);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      await waitFor(() =>
        expect(listRegionRecommendationsSpy).toHaveBeenCalledWith({
          style: "맛집",
          region: "부산",
          limit: 3,
        }),
      );
    } finally {
      getProfileSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("prompts once per session when required profile preferences are unset", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: null,
      preferredRegions: null,
      style: null,
      budget: null,
    });

    try {
      window.sessionStorage.clear();
      await login();
      cleanup();
      renderAppRoute("/home");
      const user = userEvent.setup();

      const dialog = await screen.findByRole("dialog", {
        name: "프로필 설정을 완료해 주세요",
      });
      expect(dialog).toHaveTextContent(
        "관심 지역, 여행 스타일, 예산이 모두 설정되어야 추천 정확도가 높아져요.",
      );
      expect(
        within(dialog).getByRole("link", { name: "설정하러 가기" }),
      ).toHaveAttribute("href", "/profile-setup?redirect=/home");

      await user.click(within(dialog).getByRole("button", { name: "나중에" }));
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", {
            name: "프로필 설정을 완료해 주세요",
          }),
        ).not.toBeInTheDocument(),
      );

      cleanup();
      renderAppRoute("/home");
      await waitFor(() =>
        expect(document.body).toHaveTextContent("이번 주 혜택"),
      );
      expect(
        screen.queryByRole("dialog", {
          name: "프로필 설정을 완료해 주세요",
        }),
      ).not.toBeInTheDocument();
    } finally {
      getProfileSpy.mockRestore();
      window.sessionStorage.clear();
    }
  });

  it("uses a region recommendation CTA for the home AI trip card instead of an existing trip", async () => {
    const existingTrip: Trip = {
      ...getPreviewTrip(),
      id: "300",
      title: "경주 야호",
      dates: "2026.05.18 - 05.20",
      expectedSaving: "30만원",
    };
    const regionRecommendations: RegionRecommendation[] = [
      {
        region: "부산",
        title: "부산 맛집 추천",
        reason: "맛집 혜택이 많고 마감 임박 정책이 있습니다.",
        policyCount: 5,
        endingSoonCount: 1,
        estimatedValueKrw: 70000,
        score: 10,
        styleMatchedCount: 2,
      },
    ];
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([existingTrip]);
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue(regionRecommendations);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      await waitFor(() =>
        expect(listRegionRecommendationsSpy).toHaveBeenCalled(),
      );
      expect(listTripsSpy).not.toHaveBeenCalled();
      const aiCard = document.querySelector(
        ".prototype-home-ai-card",
      ) as HTMLAnchorElement | null;
      expect(aiCard).toBeTruthy();
      expect(aiCard).toHaveAttribute(
        "href",
        "/trips/new?region=%EB%B6%80%EC%82%B0",
      );
      expect(aiCard).toHaveTextContent("부산");
      expect(aiCard).not.toHaveTextContent("경주 야호");
      expect(aiCard).not.toHaveTextContent("2026.05.18 - 05.20");
      expect(aiCard).not.toHaveTextContent("예상 절약 30만원");
    } finally {
      listTripsSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("shows only the single preferred region in the home AI trip card even when recommendations rank another region first", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: "부산",
      preferredRegions: ["부산"],
      style: "맛집",
      budget: "40만원 이하",
    });
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue([
        {
          region: "서울",
          title: "서울 전시 추천",
          reason: "혜택 수가 더 많습니다.",
          policyCount: 8,
          endingSoonCount: 0,
          estimatedValueKrw: 90000,
          score: 25,
          styleMatchedCount: 0,
        },
      ]);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      const aiCard = await screen.findByRole("link", {
        name: /부산 맛집 코스 만들기/,
      });
      expect(aiCard).toHaveAttribute(
        "href",
        "/trips/new?region=%EB%B6%80%EC%82%B0",
      );
      expect(aiCard).toHaveTextContent("부산 코스 만들까요?");
      expect(aiCard).not.toHaveTextContent("서울");
      expect(
        screen.queryByRole("group", { name: "관심지역 AI 추천 일정 카드" }),
      ).not.toBeInTheDocument();
    } finally {
      getProfileSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("renders preferred regions as a looping snap carousel in the home AI trip area", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: "부산",
      preferredRegions: ["부산", "강원", "제주"],
      style: "자연",
      budget: "40만원 이하",
    });
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue([
        {
          region: "서울",
          title: "서울 인기 추천",
          reason: "관심지역 밖 후보입니다.",
          policyCount: 9,
          endingSoonCount: 1,
          estimatedValueKrw: 100000,
          score: 30,
          styleMatchedCount: 1,
        },
        {
          region: "강원",
          title: "강원 자연 추천",
          reason: "자연 취향과 연결되는 혜택입니다.",
          policyCount: 3,
          endingSoonCount: 2,
          estimatedValueKrw: 50000,
          score: 20,
          styleMatchedCount: 2,
        },
      ]);
    const user = userEvent.setup();

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      const carousel = await screen.findByRole("group", {
        name: "관심지역 AI 추천 일정 카드",
      });
      expect(
        within(carousel).getByRole("link", { name: /부산 자연 코스 만들기/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      expect(
        within(carousel).getByRole("link", { name: /강원 자연 코스 만들기/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EA%B0%95%EC%9B%90");
      expect(
        within(carousel).getByRole("link", { name: /제주 자연 코스 만들기/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EC%A0%9C%EC%A3%BC");
      expect(
        within(carousel).queryByRole("link", { name: /서울/ }),
      ).not.toBeInTheDocument();
      const slides = carousel.querySelectorAll(".prototype-home-ai-slide");
      expect(slides).toHaveLength(5);
      expect(slides[0]).toHaveAttribute("data-carousel-clone", "true");
      expect(
        within(slides[0] as HTMLElement).getByRole("link", { hidden: true }),
      ).toHaveAttribute("tabindex", "-1");
      expect(slides[4]).toHaveAttribute("data-carousel-clone", "true");
      expect(
        within(slides[4] as HTMLElement).getByRole("link", { hidden: true }),
      ).toHaveAttribute("tabindex", "-1");

      const next = within(carousel).getByRole("button", {
        name: "다음 관심지역 일정",
      });
      const previous = within(carousel).getByRole("button", {
        name: "이전 관심지역 일정",
      });

      expect(carousel).toHaveAttribute("data-active-region", "부산");
      await user.click(next);
      expect(carousel).toHaveAttribute("data-active-region", "강원");
      await user.click(next);
      expect(carousel).toHaveAttribute("data-active-region", "제주");
      await user.click(next);
      expect(carousel).toHaveAttribute("data-active-region", "부산");
      await user.click(previous);
      expect(carousel).toHaveAttribute("data-active-region", "제주");

      const viewport = carousel.querySelector(
        ".prototype-home-ai-carousel-viewport",
      ) as HTMLElement;
      fireEvent.pointerDown(viewport, { clientX: 20 });
      fireEvent.pointerUp(viewport, { clientX: 120 });
      expect(carousel).toHaveAttribute("data-active-region", "강원");
    } finally {
      getProfileSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("keeps policy-based home destinations when region recommendations fail", async () => {
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockRejectedValue(new Error("recommendation API unavailable"));

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      const destinationRail =
        await screen.findByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /부산/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      await waitFor(() =>
        expect(
          within(destinationRail).getAllByText(/혜택 \d+개/).length,
        ).toBeGreaterThan(0),
      );
    } finally {
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("keeps policy-based home destinations when region recommendations are empty", async () => {
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue([]);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      const destinationRail =
        await screen.findByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /부산/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      await waitFor(() =>
        expect(
          within(destinationRail).getAllByText(/혜택 \d+개/).length,
        ).toBeGreaterThan(0),
      );
    } finally {
      listRegionRecommendationsSpy.mockRestore();
    }
  });
});
