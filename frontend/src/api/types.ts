export type User = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  birthDate: string | null;
  gender: string | null;
  region: string | null;
  homeRegion: string;
  residenceArea: string | null;
  preferredRegions: string | null;
  persona: string;
  savedAmount: number;
  onboardingCompleted: boolean;
  socialAccounts: SocialAccount[];
  createdAt: string;
  updatedAt: string;
};

export type SocialAccount = {
  provider: string;
  providerNickname: string | null;
  connectedAt: string;
};

export type Profile = {
  region: string;
  style: string;
  budget: string;
};

export type NotificationSettings = {
  deadlineEnabled: boolean;
  deadlineLeadDays: number[];
};

export type ContactInfo = {
  phoneNumber: string | null;
  phoneVerified: boolean;
};

export type OnboardingSlide = {
  eyebrow: string;
  title: string;
  body: string;
  stat: string;
};

export type PolicyCategory = "추천" | "환급" | "숙박" | "캐시백";

export type Policy = {
  id: string;
  slug: string;
  label: string;
  tag: string;
  title: string;
  org: string;
  region: string;
  deadline: string;
  amount: string;
  summary: string;
  match: number;
  category: PolicyCategory;
  requirements: string[];
  documents: string[];
  officialUrl: string | null;
  applyUrl: string | null;
};

export type ItineraryPlace = {
  id?: string;
  time: string;
  label: string;
  meta: string;
};

export type Trip = {
  id: string;
  title: string;
  dates: string;
  people: string[];
  expectedSaving: string;
  days: Record<number, ItineraryPlace[]>;
  currentUserRole: "owner" | "editor" | "viewer";
};

export type Recommendation = {
  label: string;
  title: string;
  meta: string;
  reason: string;
};

export type InviteRole = "viewer" | "editor";

export type InviteState = {
  id: string;
  tripId: string;
  inviteToken: string;
  inviteUrl: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invited: boolean;
  copied: boolean;
  role: InviteRole;
};

export type ProfileOptions = {
  regions: readonly string[];
  travelStyles: readonly string[];
  budgets: readonly string[];
};
