export type User = {
  id: string;
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

export type ContactVerificationRequestResponse = {
  requested: boolean;
  expiresAt: string;
  resendAvailableAt: string;
};

export type PolicyCategory = "교통" | "숙박" | "여행상품" | "지역할인" | "이벤트" | "기타";

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
  sourceType?: "internal" | "external";
};

export type AppliedPolicyLinkedTrip = {
  id: string;
  title: string;
  region: string;
  startDate: string | null;
  endDate: string | null;
};

export type AppliedPolicyLink = {
  policy: Policy;
  linkedTrips: AppliedPolicyLinkedTrip[];
};

export type ItineraryPlace = {
  id?: string;
  time: string;
  label: string;
  meta: string;
};

export type LinkedTripPolicy = {
  slug: string;
  title: string;
  amount: string;
  region: string;
  category?: PolicyCategory;
  tag?: string;
};

export type Trip = {
  id: string;
  title: string;
  status: "draft" | "confirmed";
  dates: string;
  people: string[];
  expectedSaving: string;
  linkedPolicies: LinkedTripPolicy[];
  recommendedPolicies: LinkedTripPolicy[];
  days: Record<number, ItineraryPlace[]>;
  currentUserRole: "owner" | "editor" | "viewer";
};

export type Recommendation = {
  label: string;
  title: string;
  meta: string;
  reason: string;
};

export type RegionRecommendation = {
  region: string;
  title: string;
  reason: string;
  policyCount: number;
  endingSoonCount: number;
  estimatedValueKrw: number;
  score: number;
  styleMatchedCount: number;
};

export type TravelAreaRecommendation = {
  travelAreaId: string;
  travelAreaName: string;
  sido: string;
  includedCities: string[];
  summary: string;
  tags: string[];
  reason: string;
  policyCount: number;
  localPolicyCount: number;
  nationwidePolicyCount: number;
  endingSoonCount: number;
  estimatedValueKrw: number;
  score: number;
};

export type TravelAreaRecommendationResponse = {
  mode: "sido" | "search" | "nationwide";
  sido: string | null;
  query: string | null;
  items: TravelAreaRecommendation[];
  emptyReason: "unsupported_sido" | "no_match" | null;
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
