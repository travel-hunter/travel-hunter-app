import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { LinkButton, Tag } from "../components/ui";
import { onboardingSlides } from "../data/prototypeData";

export function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const slide = onboardingSlides[index];
  const isLast = index === onboardingSlides.length - 1;

  return (
    <section className="screen white">
      <div className="onboarding-visual" aria-hidden="true">
        <div className="route-map" />
        <div className="route-line" />
        <div className="map-pin one" />
        <div className="map-pin two" />
        <div className="floating-ticket">
          <Tag tone="primary">추천 혜택</Tag>
          <strong>{slide.stat}</strong>
          <div className="meta">Prototype 핵심 경험 미리보기</div>
        </div>
      </div>
      <div className="onboarding-copy">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h2>{slide.title}</h2>
        <p>{slide.body}</p>
      </div>
      <div className="dots" aria-label="onboarding progress">
        {onboardingSlides.map((item, dotIndex) => (
          <span className={dotIndex === index ? "dot active" : "dot"} key={item.title} />
        ))}
      </div>
      <div className="content stack">
        {isLast ? (
          <LinkButton full to="/signup">
            시작하기 <ChevronRight size={18} />
          </LinkButton>
        ) : (
          <button className="btn primary full" onClick={() => setIndex((current) => current + 1)} type="button">
            다음 <ChevronRight size={18} />
          </button>
        )}
        <LinkButton full to="/login" variant="line">
          이미 계정이 있어요
        </LinkButton>
      </div>
    </section>
  );
}
