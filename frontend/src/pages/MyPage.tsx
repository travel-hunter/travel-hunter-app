import { useEffect, useState } from "react";
import { Dice5 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { appDataApi, type ContactInfo, type NotificationSettings, type Policy, type Profile, type Trip } from "../api";
import { useSession } from "../app/session";
import { Button, EmptyState, ErrorState, LoadingState } from "../components/ui";

const profileOptions = appDataApi.getProfileOptions();
type InfoSheetType = "faq" | "terms" | "privacy";

export function MyPage() {
  const navigate = useNavigate();
  const { currentUser, likedPolicy, logout, profile, saveNickname, saveProfile, removeSavedSlug, savedSlugs } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const name = currentUser?.nickname ?? previewUser.nickname;
  const [savedPolicies, setSavedPolicies] = useState<Policy[]>([]);
  const [isLoadingSavedPolicies, setIsLoadingSavedPolicies] = useState(true);
  const [savedPolicyError, setSavedPolicyError] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState("");
  const [appliedPolicyCount, setAppliedPolicyCount] = useState(0);
  const [isLoadingAppliedPolicies, setIsLoadingAppliedPolicies] = useState(true);
  const [removingPolicySlug, setRemovingPolicySlug] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(() => profile);
  const [nicknameDraft, setNicknameDraft] = useState(name);
  const [nicknameError, setNicknameError] = useState("");
  const [isSuggestingNickname, setIsSuggestingNickname] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileEditError, setProfileEditError] = useState("");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [contactDraft, setContactDraft] = useState("");
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState("");
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
  const [infoSheetType, setInfoSheetType] = useState<InfoSheetType | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingSavedPolicies(true);
    setSavedPolicyError("");

    appDataApi
      .listSavedPolicies()
      .then((policies) => {
        if (isCurrent) setSavedPolicies(policies);
      })
      .catch(() => {
        if (isCurrent) setSavedPolicyError("저장한 정책을 불러오지 못했어요.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSavedPolicies(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingTrips(true);
    setTripError("");

    appDataApi
      .listTrips()
      .then((nextTrips) => {
        if (isCurrent) setTrips(nextTrips);
      })
      .catch(() => {
        if (isCurrent) setTripError("일정 정보를 불러오지 못했어요");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingTrips(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingAppliedPolicies(true);

    appDataApi
      .listAppliedPolicies()
      .then((policies) => {
        if (isCurrent) setAppliedPolicyCount(policies.length);
      })
      .catch(() => {
        if (isCurrent) setAppliedPolicyCount(0);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAppliedPolicies(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingNotifications(true);
    setNotificationError("");

    appDataApi
      .getNotificationSettings()
      .then((settings) => {
        if (isCurrent) setNotificationSettings(settings);
      })
      .catch(() => {
        if (isCurrent) setNotificationError("알림 설정을 불러오지 못했어요.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingNotifications(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingContact(true);
    setContactError("");

    appDataApi
      .getContact()
      .then((nextContact) => {
        if (!isCurrent) return;
        setContact(nextContact);
        setContactDraft(nextContact.phoneNumber ?? "");
      })
      .catch(() => {
        if (isCurrent) setContactError("알림 연락처를 불러오지 못했어요.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingContact(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const removeSavedPolicy = async (policy: Policy) => {
    if (removingPolicySlug) return;
    setRemovingPolicySlug(policy.slug);
    setSavedPolicyError("");
    try {
      await appDataApi.removeSavedPolicy(policy.slug);
      setSavedPolicies((current) => current.filter((item) => item.slug !== policy.slug));
      removeSavedSlug(policy.slug);
    } catch {
      setSavedPolicyError("저장한 정책을 해제하지 못했어요.");
    } finally {
      setRemovingPolicySlug(null);
    }
  };

  const openProfileEditor = () => {
    setProfileDraft(profile);
    setNicknameDraft(currentUser?.nickname ?? previewUser.nickname);
    setNicknameError("");
    setProfileEditError("");
    setIsProfileEditorOpen(true);
  };

  const suggestNickname = async () => {
    setNicknameError("");
    setIsSuggestingNickname(true);
    try {
      const suggestion = await appDataApi.getNicknameSuggestion();
      setNicknameDraft(suggestion.nickname);
    } catch {
      setNicknameError("닉네임을 추천하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSuggestingNickname(false);
    }
  };

  const saveProfileDraft = async () => {
    const trimmedNickname = nicknameDraft.trim();
    setNicknameError("");
    setProfileEditError("");
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      setNicknameError("닉네임은 2자 이상 20자 이하로 입력해 주세요.");
      return;
    }

    const nicknameChanged = trimmedNickname !== (currentUser?.nickname ?? "").trim();
    setIsSavingProfile(true);
    if (nicknameChanged) {
      try {
        await saveNickname(trimmedNickname);
      } catch {
        setNicknameError("닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
        setIsSavingProfile(false);
        return;
      }
    }

    try {
      await saveProfile(profileDraft);
      setIsProfileEditorOpen(false);
    } catch {
      setProfileEditError("프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleDeadlineNotifications = async () => {
    if (isSavingNotifications) return;
    const previousSettings = notificationSettings ?? { deadlineEnabled: true, deadlineLeadDays: [7, 1] };
    const nextSettings = {
      ...previousSettings,
      deadlineEnabled: !previousSettings.deadlineEnabled,
    };
    setNotificationSettings(nextSettings);
    setIsSavingNotifications(true);
    setNotificationError("");
    try {
      const savedSettings = await appDataApi.updateNotificationSettings({
        deadlineEnabled: nextSettings.deadlineEnabled,
      });
      setNotificationSettings(savedSettings);
    } catch {
      setNotificationSettings(previousSettings);
      setNotificationError("알림 설정을 저장하지 못했어요.");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const saveContact = async () => {
    setIsSavingContact(true);
    setContactError("");
    try {
      const savedContact = await appDataApi.updateContact({
        phoneNumber: contactDraft.trim() ? contactDraft : null,
      });
      setContact(savedContact);
      setContactDraft(savedContact.phoneNumber ?? "");
    } catch {
      setContactError("연락처를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const savedPolicyCount = savedSlugs.size || (likedPolicy ? 1 : 0);
  const tripCount = tripError ? 0 : trips.length;
  const deadlineEnabled = notificationSettings?.deadlineEnabled ?? true;
  const deadlineLeadDays = notificationSettings?.deadlineLeadDays ?? [7, 1];
  const deadlineLabel = deadlineEnabled
    ? `정책 ${deadlineLeadDays.map((day) => `D-${day}`).join(", ")} 알림`
    : "마감 알림을 받지 않음";

  return (
    <section className="screen with-tabs prototype-mypage-screen">
      <div className="prototype-mypage-title">마이</div>

      <div className="content stack padded prototype-mypage-content">
        <section className="prototype-profile-card" aria-label="프로필">
          <div className="prototype-profile-main">
            <div className="avatar large">{name.trim().charAt(0) || "T"}</div>
            <div className="prototype-profile-text">
              <h2 className="profile-name">{name}</h2>
              <div className="meta">{currentUser?.email ?? previewUser.email}</div>
            </div>
          </div>
          <Button variant="ghost" onClick={openProfileEditor}>
            편집
          </Button>
        </section>

        <section className="prototype-stat-grid" aria-label="나의 활동 요약">
          <ProfileStat label="내 일정" value={isLoadingTrips ? "..." : String(tripCount)} tone="primary" />
          <ProfileStat label="즐겨찾기" value={isLoadingSavedPolicies ? "..." : String(savedPolicyCount)} tone="secondary" />
          <ProfileStat label="신청 정책" value={isLoadingAppliedPolicies ? "..." : String(appliedPolicyCount)} tone="accent" />
        </section>

        <section className="prototype-favorite-section" aria-labelledby="favorite-policy-title">
          <div className="prototype-section-header">
            <h3 id="favorite-policy-title">❤️ 즐겨찾기 정책 ({isLoadingSavedPolicies ? "..." : savedPolicyCount})</h3>
            <Link to="/policies">정책 찾기</Link>
          </div>
          {isLoadingSavedPolicies && <LoadingState compact label="즐겨찾기 정책을 불러오는 중입니다" />}
          {!isLoadingSavedPolicies && savedPolicyError && (
            <ErrorState
              compact
              message={savedPolicyError}
              action={
                <Link className="btn line" to="/policies">
                  정책 찾기
                </Link>
              }
            />
          )}
          {!isLoadingSavedPolicies && !savedPolicyError && savedPolicies.length === 0 && (
            <div className="prototype-favorite-empty">
              <EmptyState
                compact
                eyebrow="즐겨찾기 정책"
                title="아직 즐겨찾기한 정책이 없어요"
                body="관심 있는 혜택의 하트를 눌러두면 여기에서 다시 확인할 수 있어요."
                action={
                  <Link className="btn line" to="/policies">
                    정책 보러가기
                  </Link>
                }
              />
            </div>
          )}
          {!isLoadingSavedPolicies && !savedPolicyError && savedPolicies.length > 0 && (
            <div className="prototype-favorite-list">
              {savedPolicies.map((policy) => (
                <article className="prototype-favorite-row" key={policy.slug}>
                  <Link className="prototype-favorite-link" to={`/policies/${policy.slug}`}>
                    <span className="prototype-policy-thumb" aria-hidden="true">
                      {policyIcon(policy)}
                    </span>
                    <span>
                      <strong>{policy.title}</strong>
                      <small>{policy.amount}</small>
                    </span>
                  </Link>
                  <button
                    aria-label="저장 해제"
                    className="prototype-favorite-remove"
                    disabled={removingPolicySlug === policy.slug}
                    onClick={() => removeSavedPolicy(policy)}
                    type="button"
                  >
                    {removingPolicySlug === policy.slug ? "..." : "♥"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="prototype-settings-menu" aria-label="설정 메뉴">
          <button className="prototype-menu-row" onClick={() => setIsNotificationSheetOpen(true)} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              🔔
            </span>
            <strong>알림 설정</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={() => setInfoSheetType("faq")} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              ❔
            </span>
            <strong>공지사항 / FAQ</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={() => setInfoSheetType("terms")} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              📄
            </span>
            <strong>이용약관</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={() => setInfoSheetType("privacy")} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              🔒
            </span>
            <strong>개인정보처리방침</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row danger" onClick={signOut} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              ↪
            </span>
            <strong>로그아웃</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </section>

        {isProfileEditorOpen && (
          <ProfileEditSheet
            draft={profileDraft}
            error={profileEditError}
            isSaving={isSavingProfile}
            isSuggestingNickname={isSuggestingNickname}
            nickname={nicknameDraft}
            nicknameError={nicknameError}
            onCancel={() => !isSavingProfile && setIsProfileEditorOpen(false)}
            onChange={setProfileDraft}
            onNicknameChange={setNicknameDraft}
            onSave={saveProfileDraft}
            onSuggestNickname={suggestNickname}
          />
        )}

        {isNotificationSheetOpen && (
          <NotificationSettingsSheet
            contact={contact}
            contactDraft={contactDraft}
            contactError={contactError}
            deadlineEnabled={deadlineEnabled}
            deadlineLabel={deadlineLabel}
            isLoadingContact={isLoadingContact}
            isLoadingNotifications={isLoadingNotifications}
            isSavingContact={isSavingContact}
            isSavingNotifications={isSavingNotifications}
            notificationError={notificationError}
            onClose={() => setIsNotificationSheetOpen(false)}
            onContactChange={setContactDraft}
            onSaveContact={saveContact}
            onToggleDeadline={toggleDeadlineNotifications}
          />
        )}

        {infoSheetType && <InfoSheet type={infoSheetType} onClose={() => setInfoSheetType(null)} />}
      </div>
    </section>
  );
}

function ProfileStat({ label, tone, value }: { label: string; tone: "primary" | "secondary" | "accent"; value: string }) {
  return (
    <div className={`prototype-stat-card ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function policyIcon(policy: Policy) {
  if (policy.slug.includes("vacation")) return "🏖️";
  if (policy.slug.includes("rail") || policy.title.includes("KTX")) return "🚆";
  if (policy.slug.includes("cashback")) return "🎁";
  if (policy.slug.includes("food") || policy.title.includes("맛집")) return "🍽️";
  return "💙";
}

const infoSheetContent: Record<InfoSheetType, { title: string; intro: string; sections: Array<{ heading: string; body: string }> }> = {
  faq: {
    title: "공지사항 / FAQ",
    intro: "트래블헌터 MVP 이용 중 자주 확인하는 내용을 모았어요.",
    sections: [
      { heading: "정책 정보는 어디서 확인하나요?", body: "정책 상세 화면의 공식 신청 페이지 버튼을 통해 주관 기관 안내를 최종 확인해 주세요." },
      { heading: "즐겨찾기는 어떻게 사용하나요?", body: "관심 있는 정책의 하트를 누르면 마이페이지의 즐겨찾기 정책에 저장됩니다." },
      { heading: "일정에 정책을 담으면 무엇이 좋나요?", body: "여행 일정에서 받을 수 있는 혜택과 준비할 정책을 함께 확인할 수 있습니다." },
      { heading: "알림은 언제 받을 수 있나요?", body: "마감 알림을 켜고 연락처를 저장하면 D-7, D-1 기준 알림 발송 준비 대상이 됩니다." },
    ],
  },
  terms: {
    title: "이용약관",
    intro: "트래블헌터 MVP의 기본 이용 조건입니다.",
    sections: [
      { heading: "서비스 목적", body: "트래블헌터는 여행 정책 탐색, 일정 관리, 정책 준비를 돕는 정보 제공 서비스입니다." },
      { heading: "사용자 책임", body: "정책 신청 가능 여부와 제출 서류는 반드시 공식 안내 페이지에서 최종 확인해야 합니다." },
      { heading: "서비스 변경", body: "MVP 기간에는 기능, 화면, 정책 데이터가 개선 과정에서 변경될 수 있습니다." },
      { heading: "제한 사항", body: "부정 사용, 타인의 계정 접근, 서비스 운영을 방해하는 행위는 제한될 수 있습니다." },
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    intro: "회원 기능과 알림 기능 제공에 필요한 최소 정보를 다룹니다.",
    sections: [
      { heading: "수집 항목", body: "이메일, 닉네임, 프로필 선호 정보, 저장 정책, 여행 일정, 알림 연락처를 기능 제공 범위에서 사용합니다." },
      { heading: "이용 목적", body: "로그인, 맞춤 정책 표시, 일정 관리, 마감 알림 설정과 같은 사용자 기능 제공에 사용합니다." },
      { heading: "보관 기준", body: "계정과 연결된 데이터는 서비스 이용 기간 동안 보관하며, 운영 정책에 따라 삭제할 수 있습니다." },
      { heading: "외부 연동", body: "SMTP, OAuth, SOLAPI 등 외부 연동은 실제 환경 설정이 있는 경우에만 사용하며 secret 값은 저장소에 기록하지 않습니다." },
    ],
  },
};

function InfoSheet({ onClose, type }: { onClose: () => void; type: InfoSheetType }) {
  const content = infoSheetContent[type];

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="trip-select-sheet prototype-info-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mypage-info-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <h2 id="mypage-info-sheet-title">{content.title}</h2>
            <p className="meta">{content.intro}</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="prototype-info-sheet-content">
          {content.sections.map((section) => (
            <article className="prototype-info-block" key={section.heading}>
              <strong>{section.heading}</strong>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function NotificationSettingsSheet({
  contact,
  contactDraft,
  contactError,
  deadlineEnabled,
  deadlineLabel,
  isLoadingContact,
  isLoadingNotifications,
  isSavingContact,
  isSavingNotifications,
  notificationError,
  onClose,
  onContactChange,
  onSaveContact,
  onToggleDeadline,
}: {
  contact: ContactInfo | null;
  contactDraft: string;
  contactError: string;
  deadlineEnabled: boolean;
  deadlineLabel: string;
  isLoadingContact: boolean;
  isLoadingNotifications: boolean;
  isSavingContact: boolean;
  isSavingNotifications: boolean;
  notificationError: string;
  onClose: () => void;
  onContactChange: (phoneNumber: string) => void;
  onSaveContact: () => void;
  onToggleDeadline: () => void;
}) {
  const contactStatus = isLoadingContact
    ? "연락처를 불러오는 중"
    : contact?.phoneNumber
      ? contact.phoneVerified
        ? "검증된 연락처입니다"
        : "검증 전 연락처입니다"
      : "마감 알림을 받을 전화번호를 입력해 주세요.";

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="trip-select-sheet prototype-notification-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <h2 id="notification-settings-title">알림 설정</h2>
            <p className="meta">카카오 알림톡 연락처와 마감 알림 수신 여부를 관리해요.</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="prototype-notification-panel">
          <div className="prototype-notification-block">
            <strong>카카오 알림톡 연락처</strong>
            <div className="meta">{contactStatus}</div>
            <label className="field contact-field">
              전화번호
              <input
                disabled={isLoadingContact || isSavingContact}
                inputMode="tel"
                name="notification-phone"
                onChange={(event) => onContactChange(event.target.value)}
                placeholder="01012345678"
                type="tel"
                value={contactDraft}
              />
            </label>
            <Button disabled={isLoadingContact || isSavingContact} onClick={onSaveContact} variant="line">
              {isSavingContact ? "저장 중" : "연락처 저장"}
            </Button>
            {contactError && <div className="warning-text">{contactError}</div>}
          </div>

          <div className="prototype-notification-block">
            <div className="setting-row">
              <div>
                <strong>마감 알림</strong>
                <div className="meta">{isLoadingNotifications ? "알림 설정을 불러오는 중" : deadlineLabel}</div>
              </div>
              <button
                aria-checked={deadlineEnabled}
                className={`notification-toggle ${deadlineEnabled ? "active" : ""}`}
                disabled={isLoadingNotifications || isSavingNotifications}
                onClick={onToggleDeadline}
                role="switch"
                type="button"
              >
                <span className="toggle-knob" />
                <span>{isSavingNotifications ? "저장 중" : deadlineEnabled ? "켜짐" : "꺼짐"}</span>
              </button>
            </div>
            {notificationError && <div className="warning-text">{notificationError}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileEditSheet({
  draft,
  error,
  isSaving,
  isSuggestingNickname,
  nickname,
  nicknameError,
  onCancel,
  onChange,
  onNicknameChange,
  onSave,
  onSuggestNickname,
}: {
  draft: Profile;
  error: string;
  isSaving: boolean;
  isSuggestingNickname: boolean;
  nickname: string;
  nicknameError: string;
  onCancel: () => void;
  onChange: (draft: Profile) => void;
  onNicknameChange: (nickname: string) => void;
  onSave: () => void;
  onSuggestNickname: () => void;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="trip-select-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2 id="profile-editor-title">프로필 편집</h2>
            <p className="meta">관심 지역, 여행 스타일, 예산을 바꾸면 추천 기준도 함께 바뀝니다.</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onCancel} disabled={isSaving}>
            취소
          </button>
        </div>
        <div className="profile-edit-sections">
          <label className="field">
            <span>닉네임</span>
            <div className="input-action-row nickname-row">
              <input
                name="nickname"
                type="text"
                value={nickname}
                onChange={(event) => onNicknameChange(event.target.value)}
                maxLength={20}
                autoComplete="nickname"
                disabled={isSaving}
              />
              <button className="icon-btn" type="button" aria-label="랜덤 닉네임 추천" onClick={onSuggestNickname} disabled={isSaving || isSuggestingNickname}>
                <Dice5 size={18} />
              </button>
            </div>
          </label>
          {nicknameError && (
            <p className="form-error" role="alert">
              {nicknameError}
            </p>
          )}
          <ProfileEditChoices
            label="관심 지역"
            selected={draft.region}
            values={profileOptions.regions}
            onSelect={(region) => onChange({ ...draft, region })}
            disabled={isSaving}
          />
          <ProfileEditChoices
            label="여행 스타일"
            selected={draft.style}
            values={profileOptions.travelStyles}
            onSelect={(style) => onChange({ ...draft, style })}
            disabled={isSaving}
          />
          <ProfileEditChoices
            label="예산"
            selected={draft.budget}
            values={profileOptions.budgets}
            onSelect={(budget) => onChange({ ...draft, budget })}
            disabled={isSaving}
          />
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="sheet-actions">
          <Button full disabled={isSaving} onClick={onSave}>
            {isSaving ? "저장 중입니다" : "저장하기"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function ProfileEditChoices({
  disabled = false,
  label,
  values,
  selected,
  onSelect,
}: {
  disabled?: boolean;
  label: string;
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <div className="choice-label">{label}</div>
      <div className="choice-grid">
        {values.map((value) => (
          <button className={selected === value ? "choice active" : "choice"} disabled={disabled} key={value} onClick={() => onSelect(value)} type="button">
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
