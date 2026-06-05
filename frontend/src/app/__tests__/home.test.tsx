import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  appDataApi,
  type RegionRecommendation,
  type Trip,
} from "../../api";
import {
  getPreviewTrip,
} from "../../test/fixtures";
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

  it("uses profile style to render region recommendations on the home destination rail", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: "부산",
      style: "맛집",
      budget: "40만원 이하",
    });
    const regionRecommendations: RegionRecommendation[] = [
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
      .mockResolvedValue(regionRecommendations);

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
      const destinationRail = screen.getByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /강원/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EA%B0%95%EC%9B%90");
      expect(
        within(destinationRail).getByText("마감 임박 2개"),
      ).toBeInTheDocument();
      expect(
        within(destinationRail).getByRole("link", { name: /부산/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      expect(within(destinationRail).getByText("혜택 5개")).toBeInTheDocument();
    } finally {
      getProfileSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
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
