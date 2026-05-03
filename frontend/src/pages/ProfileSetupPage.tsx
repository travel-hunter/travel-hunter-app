import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../app/session";
import { Button, IconButton, PageHead } from "../components/ui";
import { budgets, regions, travelStyles } from "../data/prototypeData";

const steps = [
  {
    key: "region",
    title: "어디로 떠나고 싶나요?",
    body: "관심 지역을 기준으로 정책과 일정을 먼저 추천합니다.",
    choices: regions,
  },
  {
    key: "style",
    title: "어떤 여행을 선호하나요?",
    body: "장소와 동선을 맞출 때 여행 스타일을 반영합니다.",
    choices: travelStyles,
  },
  {
    key: "budget",
    title: "예산 범위를 알려주세요",
    body: "예산에 맞는 환급 정책과 예약 옵션을 보여드립니다.",
    choices: budgets,
  },
] as const;

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const selected = profile[step.key];

  const next = () => {
    if (stepIndex === steps.length - 1) navigate("/home");
    else setStepIndex((current) => current + 1);
  };

  const back = () => {
    if (stepIndex === 0) navigate("/signup");
    else setStepIndex((current) => current - 1);
  };

  return (
    <section className="screen">
      <div className="top-bar">
        <IconButton label="뒤로" onClick={back}>
          ‹
        </IconButton>
        <h1>정보 입력</h1>
        <span className="meta top-count">{stepIndex + 1}/3</span>
      </div>
      <div className="content stack padded">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="card">
          <div className="card-body stack">
            <PageHead eyebrow="첫 로그인 설정" title={step.title} body={step.body} />
            <div className="choice-grid">
              {step.choices.map((choice) => (
                <button
                  className={selected === choice ? "choice active" : "choice"}
                  key={choice}
                  onClick={() => updateProfile(step.key, choice)}
                  type="button"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button full onClick={next}>
          {stepIndex === steps.length - 1 ? "추천 홈 보기" : "다음"}
        </Button>
        <Button full variant="ghost" onClick={() => navigate("/home")}>
          나중에 설정
        </Button>
      </div>
    </section>
  );
}
