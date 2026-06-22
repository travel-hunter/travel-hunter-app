import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfilePreferencePreview } from "./ProfilePreferencePreview";

describe("ProfilePreferencePreview", () => {
  it("summarizes selected recommendation criteria", () => {
    render(
      <ProfilePreferencePreview
        profile={{
          region: "서울",
          preferredRegions: ["부산", "강원"],
          style: "사진",
          budget: "상관없음",
        }}
      />,
    );

    const preview = screen.getByLabelText("현재 추천 기준");
    expect(within(preview).getByText("부산 · 강원")).toBeInTheDocument();
    expect(within(preview).getByText("사진")).toBeInTheDocument();
    expect(within(preview).getByText("상관없음")).toBeInTheDocument();
  });

  it("falls back to legacy region only when preferred regions are absent", () => {
    render(
      <ProfilePreferencePreview
        profile={{
          region: "제주",
          preferredRegions: null,
          style: null,
          budget: null,
        }}
      />,
    );

    const preview = screen.getByLabelText("현재 추천 기준");
    expect(within(preview).getByText("제주")).toBeInTheDocument();
    expect(within(preview).getByText("스타일 미정")).toBeInTheDocument();
    expect(within(preview).getByText("예산 미정")).toBeInTheDocument();
  });
});
