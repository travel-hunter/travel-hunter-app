import {
  AdminAuditLogListResponse,
  AdminExternalSourceSummaryResponse,
  AdminPolicyDetail,
  AdminPolicyListResponse,
  AdminUserDetail,
  AdminUserListResponse,
  AppliedPolicyLink,
  ContactInfo,
  ContactVerificationRequestResponse,
  ExternalCollectionOpsHealth,
  ExternalCollectionRunResponse,
  InviteEmailResult,
  InviteRole,
  InviteState,
  NotificationSettings,
  Policy,
  Profile,
  ProfileOptions,
  Recommendation,
  RegionRecommendation,
  TravelAreaRecommendationResponse,
  Trip,
  User,
} from "./types";

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
};

export type EmailAvailabilityRequest = {
  email: string;
};

export type EmailAvailabilityResponse = {
  available: boolean;
};

export type NicknameSuggestionResponse = {
  nickname: string;
};

export type NicknameUpdateRequest = {
  nickname: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type LogoutResponse = {
  loggedOut: boolean;
};

export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetConfirmRequest = {
  token: string;
  newPassword: string;
};

export type PasswordResetResponse = {
  requested: boolean;
};

export type PasswordResetConfirmResponse = {
  reset: boolean;
};

export type OAuthProvider = "kakao" | "google";

export type SavePolicyResponse = {
  policyId: string;
  saved: boolean;
};

export type TripPolicyResponse = {
  tripId: string;
  policyId: string;
  added: boolean;
};

export type DeleteTripResponse = {
  tripId: string;
  deleted: boolean;
};

export type CreateTripRequest = {
  title?: string;
  region?: string;
  travelAreaId?: string;
  participantCount?: number;
  style?: string;
  description?: string;
  policySlug?: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
};

export type TravelAreaRecommendationOptions = {
  sido?: string;
  query?: string;
  mode?: string;
  style?: string;
  limit?: number;
};

export type TripPlaceRequest = {
  time?: string;
  label: string;
  meta?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  categoryCode?: string | null;
  placeUrl?: string | null;
  sourceProvider?: string | null;
  externalPlaceId?: string | null;
};

export type TripPlaceMutationRequest = TripPlaceRequest & {
  expectedRevision: number;
};

export type TripPlaceUpdateRequest = Partial<TripPlaceRequest> & {
  expectedRevision: number;
};

export type TripPlaceMoveRequest = {
  dayNumber: number;
  position: number;
  expectedRevision: number;
};

export type TripStatusUpdateRequest = {
  status: "draft" | "confirmed";
};

export type SendInviteEmailRequest = {
  email: string;
  role?: InviteRole;
};

export type ContactUpdateRequest = {
  phoneNumber: string | null;
};

export type ContactVerificationRequest = {
  phoneNumber?: string | null;
};

export type ContactVerificationConfirmRequest = {
  code: string;
};

export type AppDataApi = {
  getProfileOptions: () => Promise<ProfileOptions>;
  login: (request?: LoginRequest) => Promise<AuthResponse>;
  signup: (request?: SignupRequest) => Promise<AuthResponse>;
  checkEmailAvailability: (request: EmailAvailabilityRequest) => Promise<EmailAvailabilityResponse>;
  getNicknameSuggestion: () => Promise<NicknameSuggestionResponse>;
  updateNickname: (request: NicknameUpdateRequest) => Promise<User>;
  refreshSession: () => Promise<AuthResponse>;
  logout: () => Promise<LogoutResponse>;
  requestPasswordReset: (request: PasswordResetRequest) => Promise<PasswordResetResponse>;
  confirmPasswordReset: (request: PasswordResetConfirmRequest) => Promise<PasswordResetConfirmResponse>;
  getOAuthStartUrl: (provider: OAuthProvider, redirect?: string | null) => string;
  getCurrentUser: () => Promise<User>;
  getProfile: () => Promise<Profile>;
  updateProfile: (profile: Partial<Profile>) => Promise<Profile>;
  getContact: () => Promise<ContactInfo>;
  updateContact: (contact: ContactUpdateRequest) => Promise<ContactInfo>;
  requestContactVerification: (request: ContactVerificationRequest) => Promise<ContactVerificationRequestResponse>;
  confirmContactVerification: (request: ContactVerificationConfirmRequest) => Promise<ContactInfo>;
  getNotificationSettings: () => Promise<NotificationSettings>;
  updateNotificationSettings: (settings: Pick<NotificationSettings, "deadlineEnabled">) => Promise<NotificationSettings>;
  listPolicies: () => Promise<Policy[]>;
  listRegionRecommendations: (options?: { style?: string; region?: string; limit?: number }) => Promise<RegionRecommendation[]>;
  listTravelAreaRecommendations: (options?: TravelAreaRecommendationOptions) => Promise<TravelAreaRecommendationResponse>;
  getPolicy: (policySlug?: string) => Promise<Policy>;
  savePolicy: (policySlug: string) => Promise<SavePolicyResponse>;
  listSavedPolicies: () => Promise<Policy[]>;
  listAppliedPolicies: () => Promise<Policy[]>;
  listAppliedPolicyLinks: () => Promise<AppliedPolicyLink[]>;
  removeSavedPolicy: (policySlug: string) => Promise<SavePolicyResponse>;
  listTrips: () => Promise<Trip[]>;
  createTrip: (trip?: CreateTripRequest) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<DeleteTripResponse>;
  getTrip: (tripId: string) => Promise<Trip>;
  updateTripStatus: (tripId: string, status: TripStatusUpdateRequest) => Promise<Trip>;
  addTripPlace: (tripId: string, dayNumber: number, place: TripPlaceMutationRequest) => Promise<Trip>;
  updateTripPlace: (tripId: string, placeId: string, place: TripPlaceUpdateRequest) => Promise<Trip>;
  moveTripPlace: (tripId: string, placeId: string, move: TripPlaceMoveRequest) => Promise<Trip>;
  deleteTripPlace: (tripId: string, placeId: string, expectedRevision: number) => Promise<Trip>;
  addPolicyToTrip: (tripId: string, policySlug: string) => Promise<TripPolicyResponse>;
  removePolicyFromTrip: (tripId: string, policySlug: string) => Promise<TripPolicyResponse>;
  listRecommendations: (tripId: string) => Promise<Recommendation[]>;
  getInviteState: (tripId: string) => Promise<InviteState>;
  confirmInviteSent: (tripId: string, role?: InviteRole) => Promise<InviteState>;
  sendInviteEmail: (tripId: string, request: SendInviteEmailRequest) => Promise<InviteEmailResult>;
  acceptInvite: (inviteToken: string) => Promise<InviteState>;
  listAdminUsers: (options?: { q?: string; onboardingCompleted?: boolean; limit?: number; offset?: number }) => Promise<AdminUserListResponse>;
  getAdminUser: (userId: string) => Promise<AdminUserDetail>;
  updateAdminUser: (userId: string, user: Partial<AdminUserDetail>) => Promise<AdminUserDetail>;
  listAdminPolicies: (options?: { q?: string; category?: string; region?: string; sourceType?: string; status?: string; limit?: number; offset?: number }) => Promise<AdminPolicyListResponse>;
  getAdminExternalSourceSummary: () => Promise<AdminExternalSourceSummaryResponse>;
  getExternalCollectionOpsHealth: () => Promise<ExternalCollectionOpsHealth>;
  runExternalCollection: () => Promise<ExternalCollectionRunResponse>;
  getAdminPolicy: (policyId: string) => Promise<AdminPolicyDetail>;
  createAdminPolicy: (policy: Record<string, unknown>) => Promise<AdminPolicyDetail>;
  updateAdminPolicy: (policyId: string, policy: Record<string, unknown>) => Promise<AdminPolicyDetail>;
  listAdminAuditLogs: (options?: { targetType?: string; targetId?: string; action?: string; limit?: number; offset?: number }) => Promise<AdminAuditLogListResponse>;
};
