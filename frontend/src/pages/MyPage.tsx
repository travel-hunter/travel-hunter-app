import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { appDataApi, type ContactInfo, type NotificationSettings, type Policy, type Profile, type Trip } from "../api";
import { useSession } from "../app/session";
import { Button, Tag } from "../components/ui";
import { money } from "../utils";

const profileOptions = appDataApi.getProfileOptions();

export function MyPage() {
  const navigate = useNavigate();
  const { currentUser, likedPolicy, logout, profile, saveProfile } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const name = currentUser?.name ?? previewUser.name;
  const [savedPolicies, setSavedPolicies] = useState<Policy[]>([]);
  const [isLoadingSavedPolicies, setIsLoadingSavedPolicies] = useState(true);
  const [savedPolicyError, setSavedPolicyError] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState("");
  const [removingPolicySlug, setRemovingPolicySlug] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(() => profile);
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

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingSavedPolicies(true);
    setSavedPolicyError("");

    appDataApi
      .listSavedPolicies()
      .then((policies) => {
        if (!isCurrent) return;
        setSavedPolicies(policies);
      })
      .catch(() => {
        if (!isCurrent) return;
        setSavedPolicyError("저장한 정책을 불러오지 못했어요.");
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
        if (!isCurrent) return;
        setTrips(nextTrips);
      })
      .catch(() => {
        if (!isCurrent) return;
        setTripError("일정 정보를 불러오지 못했어요");
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
        if (!isCurrent) return;
        setNotificationSettings(settings);
      })
      .catch(() => {
        if (!isCurrent) return;
        setNotificationError("알림 설정을 불러오지 못했어요.");
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
        if (!isCurrent) return;
        setContactError("알림 연락처를 불러오지 못했어요.");
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
    } catch {
      setSavedPolicyError("저장한 정책을 해제하지 못했어요.");
    } finally {
      setRemovingPolicySlug(null);
    }
  };

  const openProfileEditor = () => {
    setProfileDraft(profile);
    setProfileEditError("");
    setIsProfileEditorOpen(true);
  };

  const saveProfileDraft = async () => {
    setIsSavingProfile(true);
    setProfileEditError("");
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
      setNotificationError("알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
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

  const savedPolicyCountLabel = isLoadingSavedPolicies
    ? "불러오는 중"
    : savedPolicies.length > 0
      ? `${savedPolicies.length}건 저장됨`
      : likedPolicy
        ? "1건 저장됨"
        : "아직 저장한 정책이 없습니다";
  const tripSummaryLabel = isLoadingTrips
    ? "일정을 불러오는 중"
    : tripError
      ? tripError
      : trips.length === 0
        ? "아직 등록된 일정이 없습니다"
        : trips.length === 1
          ? trips[0].title
          : `${trips[0].title}, 그 외 ${trips.length - 1}건`;
  const deadlineEnabled = notificationSettings?.deadlineEnabled ?? true;
  const deadlineLeadDays = notificationSettings?.deadlineLeadDays ?? [7, 1];
  const deadlineLabel = deadlineEnabled
    ? `정책 ${deadlineLeadDays.map((day) => `D-${day}`).join(", ")} 알림`
    : "마감 알림을 받지 않음";

  return (
    <section className="screen with-tabs">
      <div className="content stack padded">
        <div className="card">
          <div className="card-body">
            <div className="between">
              <div className="row">
                <div className="avatar large">{name[0]}</div>
                <div>
                  <h2 className="profile-name">{name}님</h2>
                  <div className="meta">{previewUser.persona}</div>
                </div>
              </div>
              <Button variant="ghost" onClick={openProfileEditor}>편집</Button>
            </div>
            <div className="profile-summary-grid">
              <ProfileSummaryItem label="관심 지역" value={profile.region} />
              <ProfileSummaryItem label="여행 스타일" value={profile.style} />
              <ProfileSummaryItem label="예산" value={profile.budget} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="between">
              <div>
                <div className="meta">누적 예상 절감</div>
                <div className="price">{money(previewUser.savedAmount)}원</div>
              </div>
              <Tag tone="warning">예상 혜택</Tag>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="contact-panel">
              <div>
                <strong>카카오 알림톡 연락처</strong>
                <div className="meta">
                  {isLoadingContact
                    ? "연락처를 불러오는 중"
                    : contact?.phoneNumber
                      ? contact.phoneVerified
                        ? "검증된 연락처입니다"
                        : "검증 전 연락처입니다"
                      : "마감 알림을 받을 전화번호를 입력하세요"}
                </div>
              </div>
              <label className="field contact-field">
                전화번호
                <input
                  disabled={isLoadingContact || isSavingContact}
                  inputMode="tel"
                  name="notification-phone"
                  onChange={(event) => setContactDraft(event.target.value)}
                  placeholder="01012345678"
                  type="tel"
                  value={contactDraft}
                />
              </label>
              <Button disabled={isLoadingContact || isSavingContact} onClick={saveContact} variant="line">
                {isSavingContact ? "저장 중" : "연락처 저장"}
              </Button>
              {contactError && <div className="warning-text">{contactError}</div>}
            </div>
            <Link className="setting-row" to="/policies">
              <div>
                <strong>저장한 정책</strong>
                <div className="meta">{savedPolicyCountLabel}</div>
              </div>
              <span>›</span>
            </Link>
            <Link className="setting-row" to="/trips">
              <div>
                <strong>내 일정</strong>
                <div className="meta">{tripSummaryLabel}</div>
              </div>
              <span>›</span>
            </Link>
            <div className="setting-row">
              <div>
                <strong>마감 알림</strong>
                <div className="meta">{isLoadingNotifications ? "알림 설정을 불러오는 중" : deadlineLabel}</div>
              </div>
              <button
                aria-checked={deadlineEnabled}
                className={`notification-toggle ${deadlineEnabled ? "active" : ""}`}
                disabled={isLoadingNotifications || isSavingNotifications}
                onClick={toggleDeadlineNotifications}
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
        <div className="card">
          <div className="card-body">
            <div className="between">
              <div>
                <strong>저장 정책</strong>
                <div className="meta">관심 있는 혜택을 다시 확인하세요</div>
              </div>
              <Link className="btn ghost" to="/policies">
                정책 찾기
              </Link>
            </div>
            {savedPolicyError && <div className="warning-text">{savedPolicyError}</div>}
            {isLoadingSavedPolicies && <div className="meta">저장한 정책을 불러오는 중입니다</div>}
            {!isLoadingSavedPolicies && savedPolicies.length === 0 && (
              <div className="state-panel">
                <strong>저장한 정책이 없어요</strong>
                <p>정책 상세에서 저장을 누르면 이곳에 모아볼 수 있어요.</p>
              </div>
            )}
            {!isLoadingSavedPolicies && savedPolicies.length > 0 && (
              <div className="list compact">
                {savedPolicies.map((policy) => (
                  <div className="setting-row" key={policy.slug}>
                    <Link to={`/policies/${policy.slug}`}>
                      <strong>{policy.title}</strong>
                      <div className="meta">
                        {policy.org} · {policy.amount}
                      </div>
                    </Link>
                    <Button
                      disabled={removingPolicySlug === policy.slug}
                      onClick={() => removeSavedPolicy(policy)}
                      variant="ghost"
                    >
                      {removingPolicySlug === policy.slug ? "해제 중" : "저장 해제"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button full variant="line" onClick={signOut}>
          <LogOut size={18} />
          로그아웃
        </Button>
        {isProfileEditorOpen && (
          <ProfileEditSheet
            draft={profileDraft}
            error={profileEditError}
            isSaving={isSavingProfile}
            onCancel={() => !isSavingProfile && setIsProfileEditorOpen(false)}
            onChange={setProfileDraft}
            onSave={saveProfileDraft}
          />
        )}
      </div>
    </section>
  );
}

function ProfileSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileEditSheet({
  draft,
  error,
  isSaving,
  onCancel,
  onChange,
  onSave,
}: {
  draft: Profile;
  error: string;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (draft: Profile) => void;
  onSave: () => void;
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
          <ProfileEditChoices
            label="관심 지역"
            selected={draft.region}
            values={profileOptions.regions}
            onSelect={(region) => onChange({ ...draft, region })}
          />
          <ProfileEditChoices
            label="여행 스타일"
            selected={draft.style}
            values={profileOptions.travelStyles}
            onSelect={(style) => onChange({ ...draft, style })}
          />
          <ProfileEditChoices
            label="예산"
            selected={draft.budget}
            values={profileOptions.budgets}
            onSelect={(budget) => onChange({ ...draft, budget })}
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

function ProfileEditChoices({ label, values, selected, onSelect }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div>
      <div className="choice-label">{label}</div>
      <div className="choice-grid">
        {values.map((value) => (
          <button className={selected === value ? "choice active" : "choice"} key={value} onClick={() => onSelect(value)} type="button">
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
