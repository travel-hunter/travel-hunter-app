import type { Profile } from "../api";
import { formatPreferredRegions, formatProfilePreference } from "./preferenceDisplay";

export function ProfilePreferencePreview({
  className = "",
  profile,
}: {
  className?: string;
  profile: Pick<Profile, "region" | "preferredRegions" | "style" | "budget">;
}) {
  const regions = formatPreferredRegions(profile.preferredRegions, profile.region);
  const style = formatProfilePreference(profile.style, "스타일 미정");
  const budget = formatProfilePreference(profile.budget, "예산 미정");

  return (
    <section className={["profile-preference-preview", className].filter(Boolean).join(" ")} aria-label="현재 추천 기준">
      <div>
        <span className="profile-preference-preview-kicker">현재 추천 기준</span>
        <strong>{regions}</strong>
      </div>
      <div className="profile-preference-preview-chips" aria-label="추천 기준 요약">
        <span>{style}</span>
        <span>{budget}</span>
      </div>
      <p>홈 AI 추천 맞춤 일정과 정책 추천에 이 기준이 반영됩니다.</p>
    </section>
  );
}
