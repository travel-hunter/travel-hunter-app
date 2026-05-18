import { useEffect, useState } from "react";
import { Dice5 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { appDataApi, type ContactInfo, type NotificationSettings, type Policy, type Profile, type Trip } from "../api";
import { useSession } from "../app/session";
import { Button, EmptyState, ErrorState, LoadingState } from "../components/ui";

const profileOptions = appDataApi.getProfileOptions();

export function MyPage() {
  const navigate = useNavigate();
  const { currentUser, likedPolicy, logout, profile, saveNickname, saveProfile } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const name = currentUser?.nickname ?? previewUser.nickname;
  const [savedPolicies, setSavedPolicies] = useState<Policy[]>([]);
  const [isLoadingSavedPolicies, setIsLoadingSavedPolicies] = useState(true);
  const [savedPolicyError, setSavedPolicyError] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState("");
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
  const [toastMessage, setToastMessage] = useState("");

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

  const showPreparedToast = () => {
    setToastMessage("준비 중이에요.");
    window.setTimeout(() => setToastMessage(""), 1800);
  };

  const removeSavedPolicy = async (policy: Policy) => {
    if (removingPolicySlug) return;
    setRemovingPolicySlug(policy.slug);
    setSavedPolicyError("");
    try {
      await appDataApi.removeSavedPolicy(policy.slug);
      setSavedPolicies((current) => current.filter((item) => item.slug !== policy.slug));
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

  const savedPolicyCount = savedPolicies.length || (likedPolicy ? 1 : 0);
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
          <ProfileStat label="신청 정책" value="0" tone="accent" />
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
                title="저장한 정책이 없어요"
                body="정책 상세에서 저장을 누르면 여기에 모아볼 수 있어요."
                action={
                  <Link className="btn line" to="/policies">
                    정책 찾기
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
          <button className="prototype-menu-row" onClick={showPreparedToast} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              ❔
            </span>
            <strong>공지사항 / FAQ</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={showPreparedToast} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              📄
            </span>
            <strong>이용약관</strong>
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

        {toastMessage && (
          <div className="toast" role="status">
            {toastMessage}
          </div>
        )}

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
