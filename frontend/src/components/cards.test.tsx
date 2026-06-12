import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { getPreviewTrip } from "../test/fixtures";
import { ItineraryCard } from "./cards";

describe("ItineraryCard", () => {
  it("shows real accepted members before planned participant count", () => {
    render(
      <MemoryRouter>
        <ItineraryCard
          trip={{
            ...getPreviewTrip(),
            people: ["여행자", "초대친구"],
            participantCount: 4,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("👥 2명 참여 · 예정 4명")).toBeInTheDocument();
    expect(screen.queryByText("👥 4명 참여")).not.toBeInTheDocument();
  });

  it("does not replace accepted member count with a lower planned participant count", () => {
    render(
      <MemoryRouter>
        <ItineraryCard
          trip={{
            ...getPreviewTrip(),
            people: ["여행자", "초대친구"],
            participantCount: 1,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("👥 2명 참여")).toBeInTheDocument();
    expect(screen.queryByText("👥 1명 참여")).not.toBeInTheDocument();
  });
});
