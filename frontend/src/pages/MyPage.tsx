import { useEffect, useState } from "react";
import { Bell, CircleHelp, Dice5, FileText, LogOut, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { appDataApi, type ContactInfo, type NotificationSettings, type Policy, type Profile, type Trip } from "../api";
import { useSession } from "../app/session";
import { ProfilePreferencePreview } from "../components/ProfilePreferencePreview";
import { PreferredRegionSelector } from "../components/PreferredRegionSelector";
import { formatPreferredRegions, getPreferenceIcon } from "../components/preferenceDisplay";
import { FavoritePolicyCard, ProfileSectionHeader } from "../components/patterns";
import { Button, EmptyState, ErrorState, LoadingState } from "../components/ui";
import { useAsyncResource } from "../api/useAsyncResource";

type InfoSheetType = "faq" | "terms" | "privacy";

function uniquePoliciesBySlug(policies: Policy[]) {
  const seen = new Set<string>();
  return policies.filter((policy) => {
    if (seen.has(policy.slug)) return false;
    seen.add(policy.slug);
    return true;
  });
}

function profileValueLabel(value: string | null | undefined) {
  return value?.trim() ? value : "미정";
}

export function MyPage() {
  const navigate = useNavigate();
  const { addedPolicySlugs, currentUser, likedPolicy, logout, profile, removeSavedSlug, saveNickname, saveProfile, savedSlugs } = useSession();
  const { data: profileOptions } = useAsyncResource(() => appDataApi.getProfileOptions(), []);
  const { regions, travelStyles, budgets } = profileOptions ?? { regions: [], travelStyles: [], budgets: [] };
  const name = currentUser?.nickname ?? "여행자";
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
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
  const [infoSheetType, setInfoSheetType] = useState<InfoSheetType | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingSavedPolicies(true);
    setSavedPolicyError("");
    setIsLoadingTrips(true);
    setTripError("");
    setIsLoadingAppliedPolicies(true);
    setIsLoadingNotifications(true);
    setNotificationError("");
    setIsLoadingContact(true);
    setContactError("");

    Promise.allSettled([
      appDataApi.listSavedPolicies(),
      appDataApi.listTrips(),
      appDataApi.listAppliedPolicies(),
      appDataApi.getNotificationSettings(),
      appDataApi.getContact(),
    ]).then(([savedResult, tripsResult, appliedResult, notifResult, contactResult]) => {
      if (!isCurrent) return;

      if (savedResult.status === "fulfilled") setSavedPolicies(uniquePoliciesBySlug(savedResult.value));
      else setSavedPolicyError("저장한 정책을 불러오지 못했어요.");
      setIsLoadingSavedPolicies(false);

      if (tripsResult.status === "fulfilled") setTrips(tripsResult.value);
      else setTripError("일정 정보를 불러오지 못했어요.");
      setIsLoadingTrips(false);

      if (appliedResult.status === "fulfilled") setAppliedPolicyCount(appliedResult.value.length);
      else setAppliedPolicyCount(0);
      setIsLoadingAppliedPolicies(false);

      if (notifResult.status === "fulfilled") setNotificationSettings(notifResult.value);
      else setNotificationError("알림 설정을 불러오지 못했어요.");
      setIsLoadingNotifications(false);

      if (contactResult.status === "fulfilled") {
        setContact(contactResult.value);
        setContactDraft(contactResult.value.phoneNumber ?? "");
      } else {
        setContactError("알림 연락처를 불러오지 못했어요.");
      }
      setIsLoadingContact(false);
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
    setNicknameDraft(currentUser?.nickname ?? name);
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
      const savedSettings = await appDataApi.updateNotificationSettings({ deadlineEnabled: nextSettings.deadlineEnabled });
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
    setVerificationMessage("");
    try {
      const savedContact = await appDataApi.updateContact({ phoneNumber: contactDraft.trim() ? contactDraft : null });
      setContact(savedContact);
      setContactDraft(savedContact.phoneNumber ?? "");
      setVerificationCode("");
    } catch {
      setContactError("연락처를 저장하지 못했어요.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const requestContactVerification = async () => {
    setIsRequestingVerification(true);
    setContactError("");
    setVerificationMessage("");
    try {
      await appDataApi.requestContactVerification({ phoneNumber: contactDraft.trim() ? contactDraft : null });
      setVerificationMessage("인증번호를 보냈어요.");
    } catch {
      setContactError("인증번호를 보내지 못했어요. 연락처를 확인해 주세요.");
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const confirmContactVerification = async () => {
    setIsConfirmingVerification(true);
    setContactError("");
    try {
      const verifiedContact = await appDataApi.confirmContactVerification({ code: verificationCode });
      setContact(verifiedContact);
      setContactDraft(verifiedContact.phoneNumber ?? "");
      setVerificationCode("");
      setVerificationMessage("연락처 인증이 완료되었어요.");
    } catch {
      setContactError("인증번호를 확인하지 못했어요.");
    } finally {
      setIsConfirmingVerification(false);
    }
  };

  const visibleSavedPolicies = uniquePoliciesBySlug(savedPolicies);
  const savedPolicyCount = Math.max(visibleSavedPolicies.length, savedSlugs.size);
  const appliedPolicySummaryCount = Math.max(appliedPolicyCount, addedPolicySlugs.size);
  const tripCount = tripError ? 0 : trips.length;
  const deadlineEnabled = notificationSettings?.deadlineEnabled ?? true;
  const deadlineLeadDays = notificationSettings?.deadlineLeadDays ?? [7, 1];
  const deadlineLabel = deadlineEnabled ? `정책 ${deadlineLeadDays.map((day) => `D-${day}`).join(", ")} 알림` : "마감 알림을 받지 않음";
  return (
    <section className="screen with-tabs prototype-mypage-screen">
      <div className="content stack padded prototype-mypage-content">
        <section className="ds-card ds-profile-panel prototype-profile-hero-card" aria-label="내 프로필 요약">
          <div className="prototype-profile-main">
            <div className="avatar large prototype-profile-badge" aria-hidden="true">
              🧳
            </div>
            <div className="prototype-profile-text">
              <h2 className="profile-name">{name}</h2>
              <p className="prototype-profile-email">{currentUser?.email ?? "이메일 정보 없음"}</p>
              <div className="prototype-profile-chips" aria-label="프로필 취향">
                <span>{formatPreferredRegions(profile.preferredRegions, profile.region)}</span>
                <span>{profileValueLabel(profile.style)}</span>
                <span>{profileValueLabel(profile.budget)}</span>
              </div>
            </div>
            <button className="btn ghost prototype-profile-edit-button" onClick={openProfileEditor} type="button">
              편집
            </button>
          </div>
        </section>

        <section className="prototype-stat-grid" aria-label="나의 활동 요약">
          <ProfileStat label="내 일정" value={isLoadingTrips ? "..." : String(tripCount)} tone="primary" to="/trips" />
          <ProfileStat label="즐겨찾기" value={isLoadingSavedPolicies ? "..." : String(savedPolicyCount)} tone="secondary" to="/policies?saved=1" />
          <ProfileStat label="신청 정책" value={isLoadingAppliedPolicies ? "..." : String(appliedPolicySummaryCount)} tone="accent" to="/applied-policies" />
        </section>

        <section className="prototype-favorite-section" aria-label="즐겨찾기 정책">
          <ProfileSectionHeader title={`즐겨찾기 정책 (${isLoadingSavedPolicies ? "..." : savedPolicyCount})`} actionLabel="정책 찾기" to="/policies" />
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
          {!isLoadingSavedPolicies && !savedPolicyError && visibleSavedPolicies.length === 0 && (
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
          {!isLoadingSavedPolicies && !savedPolicyError && visibleSavedPolicies.length > 0 && (
            <div className="prototype-favorite-list">
              {visibleSavedPolicies.map((policy) => (
                <FavoritePolicyCard
                  isRemoving={removingPolicySlug === policy.slug}
                  key={policy.slug}
                  onRemove={() => removeSavedPolicy(policy)}
                  policy={policy}
                />
              ))}
            </div>
          )}
        </section>

        <section className="prototype-settings-menu ds-settings-menu" aria-label="설정 메뉴">
          <button className="prototype-menu-row" onClick={() => setIsNotificationSheetOpen(true)} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <strong>알림 설정</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={() => setInfoSheetType("faq")} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              <CircleHelp size={18} />
            </span>
            <strong>공지사항 / FAQ</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={() => setInfoSheetType("terms")} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              <FileText size={18} />
            </span>
            <strong>이용약관</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row" onClick={() => setInfoSheetType("privacy")} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <strong>개인정보처리방침</strong>
            <span className="prototype-menu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button className="prototype-menu-row danger" onClick={signOut} type="button">
            <span className="prototype-menu-icon" aria-hidden="true">
              <LogOut size={18} />
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
            profilesRegions={regions}
            profilesTravelStyles={travelStyles}
            profilesBudgets={budgets}
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
            isConfirmingVerification={isConfirmingVerification}
            isLoadingContact={isLoadingContact}
            isLoadingNotifications={isLoadingNotifications}
            isRequestingVerification={isRequestingVerification}
            isSavingContact={isSavingContact}
            isSavingNotifications={isSavingNotifications}
            notificationError={notificationError}
            verificationCode={verificationCode}
            verificationMessage={verificationMessage}
            onClose={() => setIsNotificationSheetOpen(false)}
            onContactChange={setContactDraft}
            onConfirmVerification={confirmContactVerification}
            onRequestVerification={requestContactVerification}
            onSaveContact={saveContact}
            onToggleDeadline={toggleDeadlineNotifications}
            onVerificationCodeChange={setVerificationCode}
          />
        )}

        {infoSheetType && <InfoSheet type={infoSheetType} onClose={() => setInfoSheetType(null)} />}
      </div>
    </section>
  );
}

function ProfileStat({
  label,
  tone,
  value,
  to,
}: {
  label: string;
  tone: "primary" | "secondary" | "accent";
  value: string;
  to?: string;
}) {
  const content = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );
  const className = `prototype-stat-card ${tone}`;

  if (to) {
    return (
      <Link aria-label={`${label} 보기`} className={className} to={to}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

const infoSheetContent: Record<InfoSheetType, { title: string; intro: string; sections: Array<{ heading: string; body: string }> }> = {
  faq: {
    title: "공지사항 / FAQ",
    intro: "트래블헌터 이용 전에 자주 확인하는 안내를 모았어요.",
    sections: [
      {
        heading: "정책 정보는 어떻게 확인하나요?",
        body: "정책 상세 화면에서 지원 내용, 신청 대상, 필요 서류, 마감일을 먼저 확인하고 공식 안내 링크에서 최종 조건을 확인해 주세요.",
      },
      {
        heading: "신청 버튼과 혜택 안내 보기 버튼은 무엇이 다른가요?",
        body: "신청 버튼은 접수 화면으로 바로 이동하는 링크이고, 혜택 안내 보기는 기관의 상세 안내 페이지로 이동하는 링크입니다.",
      },
      {
        heading: "즐겨찾기는 어디에 저장되나요?",
        body: "관심 정책의 하트를 누르면 마이페이지 즐겨찾기 정책에 저장되고 목록과 상세 화면 상태가 함께 동기화됩니다.",
      },
    ],
  },
  terms: {
    title: "이용약관",
    intro: "트래블헌터를 이용할 때 적용되는 기본 조건입니다.",
    sections: [
      {
        heading: "서비스 목적",
        body: "트래블헌터는 여행 지원 정책 탐색, 즐겨찾기, 일정 연결, 신청 준비 확인을 돕는 정보 제공 서비스입니다.",
      },
      {
        heading: "정보의 성격",
        body: "앱에 표시되는 정책 정보는 사용자의 탐색을 돕기 위한 요약 정보이며, 실제 신청 가능 여부는 공식 안내에서 최종 확인해야 합니다.",
      },
      {
        heading: "사용자 책임",
        body: "사용자는 신청 전 공식 안내 페이지에서 신청 기간, 대상 조건, 예산 소진 여부, 제출 서류를 직접 확인해야 합니다.",
      },
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    intro: "트래블헌터 기능 제공에 필요한 개인정보 처리 기준입니다.",
    sections: [
      {
        heading: "수집 항목",
        body: "이메일, 닉네임, 프로필 선호 정보, 저장한 정책, 여행 일정, 초대 참여 정보, 알림 연락처를 기능 제공 범위에서 처리합니다.",
      },
      {
        heading: "이용 목적",
        body: "로그인, 회원 식별, 맞춤 정책 표시, 일정 관리, 즐겨찾기 동기화, 마감 알림 설정 기능 제공에 사용합니다.",
      },
      {
        heading: "보호 조치",
        body: "비밀번호와 재설정 토큰은 원문으로 저장하지 않고, 실제 운영 secret과 환경값은 저장소에 기록하지 않습니다.",
      },
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
  isConfirmingVerification,
  isLoadingContact,
  isLoadingNotifications,
  isRequestingVerification,
  isSavingContact,
  isSavingNotifications,
  notificationError,
  verificationCode,
  verificationMessage,
  onClose,
  onContactChange,
  onConfirmVerification,
  onRequestVerification,
  onSaveContact,
  onToggleDeadline,
  onVerificationCodeChange,
}: {
  contact: ContactInfo | null;
  contactDraft: string;
  contactError: string;
  deadlineEnabled: boolean;
  deadlineLabel: string;
  isConfirmingVerification: boolean;
  isLoadingContact: boolean;
  isLoadingNotifications: boolean;
  isRequestingVerification: boolean;
  isSavingContact: boolean;
  isSavingNotifications: boolean;
  notificationError: string;
  verificationCode: string;
  verificationMessage: string;
  onClose: () => void;
  onContactChange: (phoneNumber: string) => void;
  onConfirmVerification: () => void;
  onRequestVerification: () => void;
  onSaveContact: () => void;
  onToggleDeadline: () => void;
  onVerificationCodeChange: (code: string) => void;
}) {
  const contactStatus = isLoadingContact
    ? "연락처를 불러오는 중입니다"
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
            <Button disabled={isLoadingContact || isSavingContact || isRequestingVerification || !contactDraft.trim()} onClick={onRequestVerification} variant="line">
              {isRequestingVerification ? "요청 중" : "인증번호 받기"}
            </Button>
            <label className="field contact-field">
              인증번호
              <input
                disabled={isLoadingContact || isConfirmingVerification}
                inputMode="numeric"
                name="notification-phone-verification-code"
                onChange={(event) => onVerificationCodeChange(event.target.value)}
                placeholder="123456"
                type="text"
                value={verificationCode}
              />
            </label>
            <Button disabled={isLoadingContact || isConfirmingVerification || !verificationCode.trim()} onClick={onConfirmVerification} variant="line">
              {isConfirmingVerification ? "확인 중" : "인증 확인"}
            </Button>
            {verificationMessage && <div className="form-success">{verificationMessage}</div>}
            {contactError && <div className="warning-text">{contactError}</div>}
          </div>

          <div className="prototype-notification-block">
            <div className="setting-row">
              <div>
                <strong>마감 알림</strong>
                <div className="meta">{isLoadingNotifications ? "알림 설정을 불러오는 중입니다" : deadlineLabel}</div>
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
  profilesRegions,
  profilesTravelStyles,
  profilesBudgets,
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
  profilesRegions: readonly string[];
  profilesTravelStyles: readonly string[];
  profilesBudgets: readonly string[];
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
          <div className="profile-editor-head-actions">
            <span className="profile-editor-save-badge">완성형</span>
            <button className="btn sm ghost" type="button" onClick={onCancel} disabled={isSaving}>
              취소
            </button>
          </div>
        </div>
        <div className="profile-edit-sections">
          <ProfilePreferencePreview
            className="profile-edit-preference-preview"
            cta="저장하면 홈 추천과 맞춤 일정에 바로 반영됩니다."
            profile={draft}
          />
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
          <div>
            <div className="choice-label">관심 지역</div>
            <PreferredRegionSelector
              compact
              disabled={isSaving}
              onChange={(preferredRegions) => onChange({ ...draft, preferredRegions: preferredRegions.length > 0 ? preferredRegions : null })}
              options={profilesRegions}
              value={draft.preferredRegions ?? []}
            />
          </div>
          <ProfileEditChoices
            label="여행 스타일"
            selected={draft.style}
            values={profilesTravelStyles}
            onSelect={(style) => onChange({ ...draft, style })}
            disabled={isSaving}
          />
          <ProfileEditChoices
            label="예산"
            selected={draft.budget}
            values={profilesBudgets}
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
  onSelect,
  selected,
  values,
}: {
  disabled?: boolean;
  label: string;
  onSelect: (value: string) => void;
  selected: string | null;
  values: readonly string[];
}) {
  return (
    <div>
      <div className="choice-label">{label}</div>
      <div className="preference-choice-grid profile-edit-choice-grid">
        {values.map((value) => (
          <button
            aria-pressed={selected === value}
            className={selected === value ? "preference-choice-card active" : "preference-choice-card"}
            disabled={disabled}
            key={value}
            onClick={() => onSelect(value)}
            type="button"
          >
            <span className="preference-choice-icon" aria-hidden="true">
              {getPreferenceIcon(value)}
            </span>
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
