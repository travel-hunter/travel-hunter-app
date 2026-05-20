import { ContactInfo, InviteRole, InviteState, NotificationSettings, Policy, Profile, ProfileOptions, Recommendation, Trip, User } from "./types";

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
  style?: string;
  description?: string;
  policySlug?: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
};

export type TripPlaceRequest = {
  time?: string;
  label: string;
  meta?: string;
};

export type TripPlaceUpdateRequest = Partial<TripPlaceRequest>;

export type TripPlaceMoveRequest = {
  dayNumber: number;
  position: number;
};

export type TripStatusUpdateRequest = {
  status: "draft" | "confirmed";
};

export type ContactUpdateRequest = {
  phoneNumber: string | null;
};

export type AppDataApi = {
  getPreviewUser: () => User;
  getProfileOptions: () => ProfileOptions;
  getPreviewTrip: () => Trip;
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
  getNotificationSettings: () => Promise<NotificationSettings>;
  updateNotificationSettings: (settings: Pick<NotificationSettings, "deadlineEnabled">) => Promise<NotificationSettings>;
  listPolicies: () => Promise<Policy[]>;
  getPolicy: (policySlug?: string) => Promise<Policy>;
  savePolicy: (policySlug: string) => Promise<SavePolicyResponse>;
  listSavedPolicies: () => Promise<Policy[]>;
  listAppliedPolicies: () => Promise<Policy[]>;
  removeSavedPolicy: (policySlug: string) => Promise<SavePolicyResponse>;
  listTrips: () => Promise<Trip[]>;
  createTrip: (trip?: CreateTripRequest) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<DeleteTripResponse>;
  getTrip: (tripId: string) => Promise<Trip>;
  updateTripStatus: (tripId: string, status: TripStatusUpdateRequest) => Promise<Trip>;
  addTripPlace: (tripId: string, dayNumber: number, place: TripPlaceRequest) => Promise<Trip>;
  updateTripPlace: (tripId: string, placeId: string, place: TripPlaceUpdateRequest) => Promise<Trip>;
  moveTripPlace: (tripId: string, placeId: string, move: TripPlaceMoveRequest) => Promise<Trip>;
  deleteTripPlace: (tripId: string, placeId: string) => Promise<Trip>;
  addPolicyToTrip: (tripId: string, policySlug: string) => Promise<TripPolicyResponse>;
  listRecommendations: (tripId: string) => Promise<Recommendation[]>;
  getInviteState: (tripId: string) => Promise<InviteState>;
  confirmInviteSent: (tripId: string, role?: InviteRole) => Promise<InviteState>;
  acceptInvite: (inviteToken: string) => Promise<InviteState>;
};
