import {
  cleanup,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  appDataApi,
  type Trip,
} from "../../api";
import {
  getPreviewTrip,
} from "../../test/fixtures";
import { login, renderAppRoute } from "../../test/renderAppRoute";

describe("Travel Hunter app — AI results", () => {
  it("renders AI additional candidates grouped by category with a map-centered layout", async () => {
    const recommendation = {
      id: "kakao_local:spot-1",
      label: "attraction",
      title: "속초 전망대",
      meta: "속초시 해안로",
      reason: "기존 일정 사이에 넣기 좋은 명소입니다.",
      categoryGroup: "attraction" as const,
      categoryCode: "AT4",
      categoryName: "관광명소 > 전망대",
      phone: "033-123-4567",
      address: "강원 속초시 해안로 1",
      latitude: 38.2,
      longitude: 128.6,
      placeUrl: "http://place.map.kakao.com/spot-1",
      suggestedDay: 1,
      aiReview: "Day 1 오후 동선에 부담이 적은 후보입니다.",
      sourceProvider: "kakao_local",
      externalPlaceId: "spot-1",
    };
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "속초 여행",
      days: { 1: [], 2: [] },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      expect(document.querySelector(".ai-results-screen")).toBeTruthy();
      expect(document.querySelector(".ai-results-hero")).toBeNull();
      expect(document.querySelector(".ai-flow-panel")).toBeNull();
      expect(document.querySelector(".ai-results-compact-head")).toBeNull();
      expect(document.querySelector(".ai-slim-day-add")).toBeNull();
      expect(document.querySelector(".ai-trip-preview")).toBeNull();
      expect(
        screen.queryByRole("button", { name: /전체 1/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /추가 가능 1/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /이미 추가 0/ }),
      ).not.toBeInTheDocument();
      expect(
        await screen.findByRole("region", { name: "추천 후보 지도" }),
      ).toBeInTheDocument();
      expect(document.querySelector("[data-kakao-map-view]")).toBeTruthy();
      expect(
        screen.getByRole("region", { name: "선택 후보 요약" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "명소 후보" }),
      ).toBeInTheDocument();
      expect(document.body).toHaveTextContent("속초 전망대");
      expect(document.body).toHaveTextContent(
        "관광명소 > 전망대 · 033-123-4567",
      );
      const selectedSummary = screen.getByRole("region", {
        name: "선택 후보 요약",
      });
      expect(selectedSummary.tagName.toLowerCase()).toBe("section");
      const kakaoLink = within(selectedSummary).getByRole("link", {
        name: "카카오맵 보기",
      });
      expect(kakaoLink).toHaveAttribute(
        "href",
        "http://place.map.kakao.com/spot-1",
      );
      expect(kakaoLink).toHaveAttribute("target", "_blank");
      expect(kakaoLink).toHaveAttribute("rel", "noreferrer");
      const candidateCard = screen.getByTestId(
        "ai-candidate-card-kakao_local:spot-1",
      );
      expect(within(candidateCard).getByText("전망대")).toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("강원 속초시 해안로 1"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("관광명소 > 전망대 · 033-123-4567"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText(/033-123-4567/),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(
        "Day 1 오후 동선에 부담이 적은 후보입니다.",
      );
      expect(document.body).not.toHaveTextContent("추천 근거");
      expect(document.body).not.toHaveTextContent("추가 가능");
      expect(document.body).not.toHaveTextContent("장소 정보");
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("hides the Kakao map link when selected AI candidate has no place URL", async () => {
    const recommendation = {
      id: "kakao_local:spot-no-url",
      label: "attraction",
      title: "속초 작은 전망대",
      meta: "명소 후보",
      reason: "가까운 후보입니다.",
      categoryGroup: "attraction" as const,
      categoryName: "관광명소 > 전망대",
      address: "강원 속초시 해안로 2",
      suggestedDay: 1,
      placeUrl: null,
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue({
      ...getPreviewTrip(),
      id: "55",
      days: { 1: [], 2: [] },
    });

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      const selectedSummary = await screen.findByRole("region", {
        name: "선택 후보 요약",
      });
      expect(selectedSummary).toHaveTextContent("속초 작은 전망대");
      expect(
        within(selectedSummary).queryByRole("link", { name: "카카오맵 보기" }),
      ).not.toBeInTheDocument();
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("adds an AI candidate from its inline add button with a card-local Day selector", async () => {
    const recommendation = {
      id: "kakao_local:food-1",
      label: "food",
      title: "속초 로컬 맛집",
      meta: "점심 후보",
      reason: "식사 만족도가 높아요.",
      categoryGroup: "food" as const,
      categoryCode: "FD6",
      categoryName: "음식점 > 카페 > 커피전문점",
      phone: "033-222-3333",
      address: "강원 속초시 중앙로 1",
      latitude: 38.1,
      longitude: 128.5,
      placeUrl: "http://place.map.kakao.com/food-1",
      suggestedDay: 2,
      aiReview: "Day 2 점심 동선에 맞는 후보입니다.",
      sourceProvider: "kakao_local",
      externalPlaceId: "food-1",
    };
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "AI recommendation trip",
      days: { 1: [], 2: [], 3: [] },
    };
    const updatedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [],
        2: [
          {
            id: "9",
            time: "",
            label: recommendation.title,
            meta: "음식점 > 카페 > 커피전문점 · 033-222-3333",
          },
        ],
        3: [],
      },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(updatedTrip);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValueOnce(initialTrip)
      .mockResolvedValue(updatedTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      const user = userEvent.setup();
      const foodSection = await screen.findByRole("region", {
        name: "맛집 후보",
      });
      const candidateCard = within(foodSection).getByTestId(
        "ai-candidate-card-kakao_local:food-1",
      );
      expect(document.querySelector(".ai-slim-day-add")).toBeNull();
      await waitFor(() =>
        expect(
          within(candidateCard).getByRole("button", {
            name: "속초 로컬 맛집 선택",
          }),
        ).toHaveAttribute("aria-pressed", "true"),
      );
      expect(within(candidateCard).getByText("커피전문점")).toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("D2 추천"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("강원 속초시 중앙로 1"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText(/033-222-3333/),
      ).not.toBeInTheDocument();

      await user.click(
        within(candidateCard).getByRole("button", {
          name: "속초 로컬 맛집 추가",
        }),
      );

      expect(
        within(candidateCard).getByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(document.querySelector(".ai-day-popover")).toBeNull();
      expect(document.querySelector(".ai-trip-preview")).toBeNull();
      const dayPopover = within(foodSection).getByRole("dialog", {
        name: "속초 로컬 맛집 Day 선택",
      });
      expect(dayPopover).toHaveClass("ai-inline-day-selector");
      expect(candidateCard.nextElementSibling).toBe(dayPopover);
      expect(
        within(candidateCard).queryByText("D2 추천"),
      ).not.toBeInTheDocument();
      expect(within(dayPopover).queryByText("D2 추천")).not.toBeInTheDocument();
      expect(
        within(dayPopover).queryByRole("button", { name: "취소" }),
      ).not.toBeInTheDocument();
      expect(
        within(dayPopover).getByRole("button", { name: "D2" }),
      ).toHaveAttribute("aria-pressed", "true");

      await user.click(within(dayPopover).getByRole("button", { name: "D3" }));
      expect(addPlaceSpy).not.toHaveBeenCalled();
      await user.click(
        within(dayPopover).getByRole("button", { name: "Day 3에 추가" }),
      );

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "55",
          3,
          expect.objectContaining({
            label: recommendation.title,
            meta: "음식점 > 카페 > 커피전문점 · 033-222-3333",
            address: recommendation.address,
            latitude: recommendation.latitude,
            longitude: recommendation.longitude,
            categoryCode: recommendation.categoryCode,
            placeUrl: recommendation.placeUrl,
            sourceProvider: recommendation.sourceProvider,
            externalPlaceId: recommendation.externalPlaceId,
          }),
        ),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("55"));
      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "속초 로컬 맛집을 Day 3 일정에 추가했어요.",
        ),
      );
    } finally {
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("marks already-added AI candidates as duplicates without opening the add action", async () => {
    const recommendation = {
      id: "kakao_local:spot-1",
      label: "attraction",
      title: "속초해변",
      meta: "명소 후보",
      reason: "동선에 가까워요.",
      categoryGroup: "attraction" as const,
      suggestedDay: 1,
    };
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "Duplicate trip",
      days: {
        1: [{ id: "1", time: "", label: "속초해변", meta: "이미 등록됨" }],
        2: [],
      },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      const duplicateSection = await screen.findByRole("region", {
        name: "명소 후보",
      });
      const duplicateCard = within(duplicateSection).getByTestId(
        "ai-candidate-card-kakao_local:spot-1",
      );
      await userEvent
        .setup()
        .click(
          within(duplicateCard).getByRole("button", { name: "속초해변 선택" }),
        );
      expect(document.body).toHaveTextContent("이미 추가됨");
      expect(
        within(duplicateCard).queryByRole("button", { name: "속초해변 추가" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("dialog", { name: "속초해변 Day 선택" }),
      ).not.toBeInTheDocument();
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("keeps selected AI candidate on the map and category card in sync", async () => {
    const recommendations = [
      {
        id: "kakao_local:spot-1",
        label: "attraction",
        title: "속초 전망대",
        meta: "명소 후보",
        reason: "전망이 좋아요.",
        categoryGroup: "attraction" as const,
        categoryCode: "AT4",
      },
      {
        id: "kakao_local:food-1",
        label: "food",
        title: "속초 로컬 맛집",
        meta: "맛집 후보",
        reason: "점심에 좋아요.",
        categoryGroup: "food" as const,
        categoryCode: "FD6",
      },
      {
        label: "stay",
        title: "속초 조용한 숙소",
        meta: "숙소 후보",
        reason: "휴식에 좋아요.",
        categoryGroup: "stay" as const,
        categoryCode: "AD5",
      },
    ];
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "Candidate sync trip",
      days: { 1: [], 2: [] },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue(recommendations);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      const mapRegion = screen.getByRole("region", { name: "추천 후보 지도" });
      await waitFor(() =>
        expect(
          within(mapRegion).getAllByRole("button", { name: /선택/ }),
        ).toHaveLength(1),
      );
      expect(
        within(mapRegion).getByRole("button", { name: "속초 전망대 선택" }),
      ).toHaveAttribute("aria-pressed", "true");

      const foodSection = await screen.findByRole("region", {
        name: "맛집 후보",
      });
      await userEvent.setup().click(
        within(foodSection).getByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      );
      expect(
        within(foodSection).getByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(mapRegion).getAllByRole("button", { name: /선택/ }),
      ).toHaveLength(1);
      expect(
        within(mapRegion).getByRole("button", { name: "속초 로컬 맛집 선택" }),
      ).toHaveAttribute("aria-pressed", "true");

      const staySection = await screen.findByRole("region", {
        name: "숙소 후보",
      });
      await userEvent.setup().click(
        within(staySection).getByRole("button", {
          name: "속초 조용한 숙소 선택",
        }),
      );
      expect(
        within(mapRegion).getAllByRole("button", { name: /선택/ }),
      ).toHaveLength(1);
      expect(
        within(mapRegion).getByRole("button", {
          name: "속초 조용한 숙소 선택",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(mapRegion).queryByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      ).not.toBeInTheDocument();
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("keeps users on AI results when adding a recommendation fails", async () => {
    const recommendation = {
      label: "FOOD",
      title: "고기국수 로컬 맛집",
      meta: "점심 대체 후보",
      reason: "예산 안에서 식사 만족도가 높아요.",
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockRejectedValue(new Error("Trip not found"));
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue({
      ...getPreviewTrip(),
      id: "55",
      days: { 1: [], 2: [], 3: [] },
    });

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      const user = userEvent.setup();
      const otherSection = await screen.findByRole("region", {
        name: "기타 후보",
      });
      await user.click(
        within(otherSection).getByRole("button", {
          name: "고기국수 로컬 맛집 추가",
        }),
      );
      await user.click(
        within(otherSection).getByRole("button", { name: "Day 1에 추가" }),
      );

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "55",
          1,
          expect.objectContaining({ label: recommendation.title }),
        ),
      );
      await waitFor(() =>
        expect(document.querySelector(".form-error")?.textContent).toContain(
          "후보 장소",
        ),
      );
    } finally {
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });
});
