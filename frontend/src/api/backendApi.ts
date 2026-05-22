import {
  budgets,
  itinerary,
  regions,
  travelStyles,
  user,
} from "../data/seedData";
import { apiClient, apiConfig } from "./client";
import {
  AppDataApi,
  AuthResponse,
  ContactVerificationConfirmRequest,
  ContactVerificationRequest,
  ContactUpdateRequest,
  CreateTripRequest,
  DeleteTripResponse,
  EmailAvailabilityRequest,
  EmailAvailabilityResponse,
  LoginRequest,
  LogoutResponse,
  NicknameSuggestionResponse,
  NicknameUpdateRequest,
  OAuthProvider,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  SavePolicyResponse,
  SignupRequest,
  TripPlaceMoveRequest,
  TripPlaceRequest,
  TripPlaceUpdateRequest,
  TripPolicyResponse,
  TripStatusUpdateRequest,
} from "./dataApi";
import { ContactInfo, ContactVerificationRequestResponse, InviteRole, InviteState, NotificationSettings, Policy, Profile, ProfileOptions, Recommendation, RegionRecommendation, Trip, User } from "./types";

const getDefaultDevPassword = (): string =>
  import.meta.env.VITE_DEV_PASSWORD?.trim() || "";

const makeDefaultLogin = (): LoginRequest => ({
  email: user.email,
  password: getDefaultDevPassword(),
});

const makeDefaultSignup = (): SignupRequest => ({
  email: user.email,
  password: getDefaultDevPassword(),
});

export const backendApi: AppDataApi = {
  getPreviewUser: (): User => user,
  getProfileOptions: (): ProfileOptions => ({ regions, travelStyles, budgets }),
  getPreviewTrip: (): Trip => itinerary,
  login: (request = makeDefaultLogin()): Promise<AuthResponse> => apiClient.post<AuthResponse>("/api/auth/login", request),
  signup: (request = makeDefaultSignup()): Promise<AuthResponse> => apiClient.post<AuthResponse>("/api/auth/signup", request),
  checkEmailAvailability: (request: EmailAvailabilityRequest): Promise<EmailAvailabilityResponse> => apiClient.post<EmailAvailabilityResponse>("/api/auth/email-check", request),
  getNicknameSuggestion: (): Promise<NicknameSuggestionResponse> => apiClient.get<NicknameSuggestionResponse>("/api/me/nickname-suggestion"),
  updateNickname: (request: NicknameUpdateRequest): Promise<User> => apiClient.patch<User>("/api/me/nickname", request),
  refreshSession: (): Promise<AuthResponse> => apiClient.post<AuthResponse>("/api/auth/refresh"),
  logout: (): Promise<LogoutResponse> => apiClient.post<LogoutResponse>("/api/auth/logout"),
  requestPasswordReset: (request: PasswordResetRequest): Promise<PasswordResetResponse> => apiClient.post<PasswordResetResponse>("/api/auth/password-reset/request", request),
  confirmPasswordReset: (request: PasswordResetConfirmRequest): Promise<PasswordResetConfirmResponse> => apiClient.post<PasswordResetConfirmResponse>("/api/auth/password-reset/confirm", request),
  getOAuthStartUrl: (provider: OAuthProvider, redirect?: string | null): string => {
    const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
    return `${apiConfig.baseUrl}/api/auth/oauth/${provider}/start${query}`;
  },
  getCurrentUser: (): Promise<User> => apiClient.get<User>("/api/me"),
  getProfile: (): Promise<Profile> => apiClient.get<Profile>("/api/me/profile"),
  updateProfile: (profile: Partial<Profile>): Promise<Profile> => apiClient.patch<Profile>("/api/me/profile", profile),
  getContact: (): Promise<ContactInfo> => apiClient.get<ContactInfo>("/api/me/contact"),
  updateContact: (contact: ContactUpdateRequest): Promise<ContactInfo> => apiClient.patch<ContactInfo>("/api/me/contact", contact),
  requestContactVerification: (request: ContactVerificationRequest): Promise<ContactVerificationRequestResponse> =>
    apiClient.post<ContactVerificationRequestResponse>("/api/me/contact/verification/request", request),
  confirmContactVerification: (request: ContactVerificationConfirmRequest): Promise<ContactInfo> =>
    apiClient.post<ContactInfo>("/api/me/contact/verification/confirm", request),
  getNotificationSettings: (): Promise<NotificationSettings> => apiClient.get<NotificationSettings>("/api/me/notification-settings"),
  updateNotificationSettings: (settings: Pick<NotificationSettings, "deadlineEnabled">): Promise<NotificationSettings> => apiClient.patch<NotificationSettings>("/api/me/notification-settings", settings),
  listPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/policies"),
  listRegionRecommendations: (options?: { style?: string; region?: string; limit?: number }): Promise<RegionRecommendation[]> => {
    const params = new URLSearchParams();
    if (options?.style) params.set("style", options.style);
    if (options?.region) params.set("region", options.region);
    if (options?.limit !== undefined) params.set("limit", String(options.limit));
    const query = params.toString();
    return apiClient.get<RegionRecommendation[]>(`/api/recommendations/regions${query ? `?${query}` : ""}`);
  },
  getPolicy: (policySlug = "local-vacation"): Promise<Policy> => apiClient.get<Policy>(`/api/policies/${policySlug}`),
  savePolicy: (policySlug: string): Promise<SavePolicyResponse> => apiClient.post<SavePolicyResponse>(`/api/me/saved-policies/${policySlug}`),
  listSavedPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/me/saved-policies"),
  listAppliedPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/me/applied-policies"),
  removeSavedPolicy: (policySlug: string): Promise<SavePolicyResponse> => apiClient.delete<SavePolicyResponse>(`/api/me/saved-policies/${policySlug}`),
  listTrips: (): Promise<Trip[]> => apiClient.get<Trip[]>("/api/trips"),
  createTrip: (trip?: CreateTripRequest): Promise<Trip> => apiClient.post<Trip>("/api/trips", trip),
  deleteTrip: (tripId: string): Promise<DeleteTripResponse> => apiClient.delete<DeleteTripResponse>(`/api/trips/${tripId}`),
  getTrip: (tripId: string): Promise<Trip> => apiClient.get<Trip>(`/api/trips/${tripId}`),
  updateTripStatus: (tripId: string, status: TripStatusUpdateRequest): Promise<Trip> => apiClient.patch<Trip>(`/api/trips/${tripId}/status`, status),
  addTripPlace: (tripId: string, dayNumber: number, place: TripPlaceRequest): Promise<Trip> => apiClient.post<Trip>(`/api/trips/${tripId}/days/${dayNumber}/places`, place),
  updateTripPlace: (tripId: string, placeId: string, place: TripPlaceUpdateRequest): Promise<Trip> => apiClient.patch<Trip>(`/api/trips/${tripId}/places/${placeId}`, place),
  moveTripPlace: (tripId: string, placeId: string, move: TripPlaceMoveRequest): Promise<Trip> => apiClient.patch<Trip>(`/api/trips/${tripId}/places/${placeId}/move`, move),
  deleteTripPlace: (tripId: string, placeId: string): Promise<Trip> => apiClient.delete<Trip>(`/api/trips/${tripId}/places/${placeId}`),
  addPolicyToTrip: (tripId: string, policySlug: string): Promise<TripPolicyResponse> => apiClient.post<TripPolicyResponse>(`/api/trips/${tripId}/policies/${policySlug}`),
  listRecommendations: (tripId: string): Promise<Recommendation[]> => apiClient.get<Recommendation[]>(`/api/trips/${tripId}/recommendations`),
  getInviteState: (tripId: string): Promise<InviteState> => apiClient.get<InviteState>(`/api/trips/${tripId}/invite`),
  confirmInviteSent: (tripId: string, role?: InviteRole): Promise<InviteState> => apiClient.post<InviteState>(`/api/trips/${tripId}/invite`, role ? { role } : undefined),
  acceptInvite: (inviteToken: string): Promise<InviteState> => apiClient.post<InviteState>(`/api/invites/${inviteToken}/accept`),
};
