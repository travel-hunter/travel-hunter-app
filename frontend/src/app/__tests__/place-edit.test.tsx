import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  appDataApi,
  type Recommendation,
  type Trip,
} from "../../api";
import {
  getPreviewTrip,
} from "../../test/fixtures";
import { login, renderAppRoute } from "../../test/renderAppRoute";

async function setPlaceTimeFromDefault(
  user: ReturnType<typeof userEvent.setup>,
  time: string,
) {
  const [hour, minute] = time.split(":").map(Number);
  const clearButton = screen.queryByRole("button", {
    name: "시간 비우기",
  }) as HTMLButtonElement | null;
  if (clearButton && !clearButton.disabled) await user.click(clearButton);

  const defaultButton = screen.queryByRole("button", { name: "09:00 설정" });
  if (defaultButton) await user.click(defaultButton);

  const hourUpButton = screen.getByRole("button", {
    name: "방문 시간 1시간 증가",
  });
  const minuteUpButton = screen.getByRole("button", {
    name: "방문 시간 10분 증가",
  });
  for (let index = 0; index < (hour - 9 + 24) % 24; index += 1) {
    await user.click(hourUpButton);
  }
  for (let index = 0; index < Math.floor(minute / 10); index += 1) {
    await user.click(minuteUpButton);
  }
}

describe("Travel Hunter app — place editing", () => {
  it("adds, edits, and deletes places from the itinerary detail", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: {
        1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }],
      },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [
          ...initialTrip.days[1],
          { id: "2", time: "14:30", label: "Cafe stop", meta: "Dessert" },
        ],
      },
    };
    const editedTrip: Trip = {
      ...addedTrip,
      days: {
        1: [
          { id: "1", time: "10:20", label: "Updated peak", meta: "New memo" },
          addedTrip.days[1][1],
        ],
      },
    };
    const deletedTrip: Trip = {
      ...editedTrip,
      days: { 1: [editedTrip.days[1][1]] },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(addedTrip);
    const updatePlaceSpy = vi
      .spyOn(appDataApi, "updateTripPlace")
      .mockResolvedValue(editedTrip);
    const deletePlaceSpy = vi
      .spyOn(appDataApi, "deleteTripPlace")
      .mockResolvedValue(deletedTrip);
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      expect(
        screen.getByRole("group", { name: "방문 시간 선택" }),
      ).toBeInTheDocument();
      expect(
        document.querySelector('input[name="place-time"]:not([type="hidden"])'),
      ).toBeNull();
      await setPlaceTimeFromDefault(user, "14:30");
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Cafe stop",
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "Dessert",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:add:1",
          ),
        ).toContain("Cafe stop"),
      );
      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith("55", 1, {
          time: "14:30",
          label: "Cafe stop",
          meta: "Dessert",
        }),
      );
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();
      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));

      await user.click(
        document.querySelector(".place-actions .ghost") as HTMLButtonElement,
      );
      await setPlaceTimeFromDefault(user, "10:20");
      await user.clear(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
      );
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Updated peak",
      );
      await user.clear(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "New memo",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:edit:1",
          ),
        ).toContain("Updated peak"),
      );
      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );

      await waitFor(() =>
        expect(updatePlaceSpy).toHaveBeenCalledWith(
          "55",
          "1",
          expect.objectContaining({ label: "Updated peak", time: "10:20" }),
        ),
      );
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1"),
      ).toBeNull();
      await waitFor(() =>
        expect(document.body).toHaveTextContent("Updated peak"),
      );

      await user.click(
        document.querySelector(".place-actions .line") as HTMLButtonElement,
      );
      const deleteDialog = await screen.findByRole("dialog", {
        name: "장소를 삭제할까요?",
      });
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(
        within(deleteDialog).getByRole("button", { name: "삭제" }),
      );
      await waitFor(() =>
        expect(deletePlaceSpy).toHaveBeenCalledWith("55", "1"),
      );
      await waitFor(() =>
        expect(screen.queryByText("Updated peak")).not.toBeInTheDocument(),
      );
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
      updatePlaceSpy.mockRestore();
      deletePlaceSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("searches recommendation candidates from the add-place sheet and adds the selected place", async () => {
    const recommendation: Recommendation = {
      id: "kakao_local:jeju-food-1",
      label: "food",
      title: "동백 식당",
      meta: "향토 음식",
      reason: "Day 1 점심 동선에 맞는 음식점입니다.",
      categoryGroup: "food",
      categoryCode: "FD6",
      categoryName: "음식점",
      address: "제주 서귀포시 중문관광로 10",
      latitude: 33.251,
      longitude: 126.412,
      placeUrl: "https://place.map.kakao.com/jeju-food-1",
      suggestedDay: 1,
      sourceProvider: "kakao_local",
      externalPlaceId: "jeju-food-1",
    };
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "57",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju place search trip",
      days: { 1: [] },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [
          {
            id: "selected-place",
            time: "",
            label: recommendation.title,
            meta: "음식점 · 제주 서귀포시 중문관광로 10",
            address: recommendation.address,
            latitude: recommendation.latitude,
            longitude: recommendation.longitude,
            category: recommendation.categoryName,
            categoryCode: recommendation.categoryCode,
            placeUrl: recommendation.placeUrl,
            sourceProvider: recommendation.sourceProvider,
            externalPlaceId: recommendation.externalPlaceId,
          },
        ],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(addedTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/57?day=1");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Jeju place search trip"),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );

      const dialog = await screen.findByRole("dialog", { name: "장소 추가" });
      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("57"),
      );
      await user.type(
        within(dialog).getByRole("textbox", { name: "장소 검색" }),
        "동백",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "동백 식당 선택" }),
      );

      expect(
        within(dialog).getByRole("textbox", { name: "장소명" }),
      ).toHaveValue("동백 식당");
      expect(
        within(dialog).getByRole("textbox", { name: "메모" }),
      ).toHaveValue("음식점 · 제주 서귀포시 중문관광로 10");

      await user.click(within(dialog).getByRole("button", { name: "저장하기" }));

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "57",
          1,
          expect.objectContaining({
            label: "동백 식당",
            meta: "음식점 · 제주 서귀포시 중문관광로 10",
            address: "제주 서귀포시 중문관광로 10",
            latitude: 33.251,
            longitude: 126.412,
            category: "음식점",
            categoryCode: "FD6",
            placeUrl: "https://place.map.kakao.com/jeju-food-1",
            sourceProvider: "kakao_local",
            externalPlaceId: "jeju-food-1",
          }),
        ),
      );
      await waitFor(() => expect(document.body).toHaveTextContent("동백 식당"));
    } finally {
      getTripSpy.mockRestore();
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
    }
  });

  it("restores and clears edit-place drafts", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: {
        1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      await user.click(
        document.querySelector(".place-actions .ghost") as HTMLButtonElement,
      );
      await setPlaceTimeFromDefault(user, "11:20");
      await user.clear(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
      );
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Draft peak",
      );
      await user.clear(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "Draft memo",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:edit:1",
          ),
        ).toContain("Draft peak"),
      );

      cleanup();
      renderAppRoute("/trips/55");
      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      await user.click(
        document.querySelector(".place-actions .ghost") as HTMLButtonElement,
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "11:20",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "Draft peak",
      );
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue(
        "Draft memo",
      );

      await user.click(screen.getByRole("button", { name: "닫기" }));
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1"),
      ).toBeNull();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("restores and clears add-place drafts", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [
          { id: "3", time: "16:00", label: "Tea house", meta: "Reservation" },
        ],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(addedTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      await setPlaceTimeFromDefault(user, "23:50");
      await user.click(
        screen.getByRole("button", { name: "방문 시간 10분 증가" }),
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "00:00",
      );
      await setPlaceTimeFromDefault(user, "16:00");
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Tea house",
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "Reservation",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:add:1",
          ),
        ).toContain("Tea house"),
      );

      cleanup();
      renderAppRoute("/trips/55");
      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "16:00",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "Tea house",
      );
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue(
        "Reservation",
      );

      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );
      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "55",
          1,
          expect.objectContaining({ label: "Tea house" }),
        ),
      );
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();

      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Will cancel",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:add:1",
          ),
        ).toContain("Will cancel"),
      );
      await user.click(screen.getByRole("button", { name: "닫기" }));
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
    }
  });

  it("shows and discards a restored add-place draft", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      window.localStorage.setItem(
        "travel-hunter:draft:trip-place:55:add:1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          value: {
            dayNumber: 1,
            time: "16:00",
            label: "Tea house",
            meta: "Reservation",
          },
        }),
      );
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );

      expect(
        screen.getByText("작성 중이던 장소 내용을 불러왔어요."),
      ).toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "16:00",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "Tea house",
      );

      await user.click(screen.getByRole("button", { name: "삭제" }));

      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();
      expect(
        screen.queryByText("작성 중이던 장소 내용을 불러왔어요."),
      ).not.toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "",
      );
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue(
        "",
      );
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("validates place time as a 10 minute spinner value", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();
      window.localStorage.setItem(
        "travel-hunter:draft:trip-place:55:add:1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          value: {
            dayNumber: 1,
            time: "09:35",
            label: "Invalid time stop",
            meta: "",
          },
        }),
      );

      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "09:35",
      );
      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );

      expect(addPlaceSpy).not.toHaveBeenCalled();
      expect(
        screen.getByText("방문 시간은 10분 단위로 선택해 주세요."),
      ).toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
    }
  });

  it("renders viewer trips as read-only in the itinerary detail", async () => {
    const viewerTrip: Trip = {
      ...getPreviewTrip(),
      id: "66",
      title: "Viewer trip",
      currentUserRole: "viewer",
      days: {
        1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(viewerTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/66");

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      expect(document.body).toHaveTextContent("보기 권한으로 참여 중입니다");
      expect(
        document.querySelector(".prototype-trip-action-add"),
      ).not.toBeInTheDocument();
      expect(document.querySelector(".place-actions")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Sunrise peak 순서 이동" }),
      ).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("moves places with drag handles within a day and to another day", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Movable trip",
      days: {
        1: [
          {
            id: "1",
            time: "09:00",
            label: "Morning market",
            meta: "Breakfast",
          },
          { id: "2", time: "14:00", label: "Cafe stop", meta: "Dessert" },
        ],
        2: [{ id: "3", time: "10:00", label: "Beach walk", meta: "Sea" }],
      },
    };
    const movedUpTrip: Trip = {
      ...initialTrip,
      days: {
        1: [initialTrip.days[1][1], initialTrip.days[1][0]],
        2: initialTrip.days[2],
      },
    };
    const movedDayTrip: Trip = {
      ...initialTrip,
      days: {
        1: [initialTrip.days[1][0]],
        2: [initialTrip.days[2][0], initialTrip.days[1][1]],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    let resolveFirstMove: (trip: Trip) => void = () => undefined;
    const movePlaceSpy = vi
      .spyOn(appDataApi, "moveTripPlace")
      .mockImplementationOnce(
        () =>
          new Promise<Trip>((resolve) => {
            resolveFirstMove = resolve;
          }),
      )
      .mockResolvedValueOnce(movedDayTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));
      expect(
        screen.queryByText("장소 카드의 이동 핸들로 순서를 조정할 수 있어요"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "위로" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "아래로" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "이동" }),
      ).not.toBeInTheDocument();
      const secondTimelineItem = document.querySelectorAll(
        ".timeline-item",
      )[1] as HTMLElement;
      const cafeDragHandle = within(secondTimelineItem).getByRole("button", {
        name: "Cafe stop 순서 이동",
      });
      expect(cafeDragHandle).toHaveClass("drag-handle");
      fireEvent.keyDown(cafeDragHandle, { key: "ArrowUp" });

      await waitFor(() =>
        expect(movePlaceSpy).toHaveBeenCalledWith("55", "2", {
          dayNumber: 1,
          position: 1,
        }),
      );
      expect(await screen.findByText("이동 중")).toBeInTheDocument();
      resolveFirstMove(movedUpTrip);
      await waitFor(() =>
        expect(
          (document.querySelector(".place-detail h4") as HTMLElement)
            .textContent,
        ).toBe("Cafe stop"),
      );

      const firstTimelineItem = document.querySelectorAll(
        ".timeline-item",
      )[0] as HTMLElement;
      const movedCafeDragHandle = within(firstTimelineItem).getByRole(
        "button",
        { name: "Cafe stop 순서 이동" },
      );
      fireEvent.keyDown(movedCafeDragHandle, {
        key: "ArrowRight",
        shiftKey: true,
      });

      await waitFor(() =>
        expect(movePlaceSpy).toHaveBeenLastCalledWith("55", "2", {
          dayNumber: 2,
          position: 2,
        }),
      );
      await waitFor(() =>
        expect(screen.getByText("Day 2")).toBeInTheDocument(),
      );
      await user.click(screen.getByText("Day 2"));
      expect(document.body).toHaveTextContent("Cafe stop");
    } finally {
      getTripSpy.mockRestore();
      movePlaceSpy.mockRestore();
    }
  });

  it("shows a message when moving a place fails", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Move failure trip",
      days: {
        1: [
          {
            id: "1",
            time: "09:00",
            label: "Morning market",
            meta: "Breakfast",
          },
          { id: "2", time: "14:00", label: "Cafe stop", meta: "Dessert" },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const movePlaceSpy = vi
      .spyOn(appDataApi, "moveTripPlace")
      .mockRejectedValue(new Error("move failed"));

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");

      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));
      const secondTimelineItem = document.querySelectorAll(
        ".timeline-item",
      )[1] as HTMLElement;
      const cafeDragHandle = within(secondTimelineItem).getByRole("button", {
        name: "Cafe stop 순서 이동",
      });
      fireEvent.keyDown(cafeDragHandle, { key: "ArrowUp" });

      await waitFor(() =>
        expect(movePlaceSpy).toHaveBeenCalledWith("55", "2", {
          dayNumber: 1,
          position: 1,
        }),
      );
      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "장소 순서를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
      expect(
        (document.querySelector(".place-detail h4") as HTMLElement).textContent,
      ).toBe("Morning market");
    } finally {
      getTripSpy.mockRestore();
      movePlaceSpy.mockRestore();
    }
  });
});
