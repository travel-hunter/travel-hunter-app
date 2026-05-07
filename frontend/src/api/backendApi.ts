import {
  budgets,
  itinerary,
  onboardingSlides,
  regions,
  travelStyles,
  user,
} from "../data/seedData";
import { apiClient } from "./client";
import {
  AppDataApi,
  AuthResponse,
  ContactUpdateRequest,
  CreateTripRequest,
  DeleteTripResponse,
  LoginRequest,
  LogoutResponse,
  SavePolicyResponse,
  SignupRequest,
  TripPlaceRequest,
  TripPlaceUpdateRequest,
  TripPolicyResponse,
} from "./dataApi";
import { ContactInfo, InviteRole, InviteState, NotificationSettings, Policy, Profile, ProfileOptions, Recommendation, Trip, User } from "./types";

const defaultLogin: LoginRequest = {
  email: user.email,
  password: "password123",
};

const defaultSignup: SignupRequest = {
  name: user.name,
  email: user.email,
  password: "password123",
};

export const backendApi: AppDataApi = {
  getPreviewUser: (): User => user,
  getOnboardingSlides: () => onboardingSlides,
  getProfileOptions: (): ProfileOptions => ({ regions, travelStyles, budgets }),
  getPreviewTrip: (): Trip => itinerary,
  login: (request = defaultLogin): Promise<AuthResponse> => apiClient.post<AuthResponse>("/api/auth/login", request),
  signup: (request = defaultSignup): Promise<AuthResponse> => apiClient.post<AuthResponse>("/api/auth/signup", request),
  refreshSession: (): Promise<AuthResponse> => apiClient.post<AuthResponse>("/api/auth/refresh"),
  logout: (): Promise<LogoutResponse> => apiClient.post<LogoutResponse>("/api/auth/logout"),
  getCurrentUser: (): Promise<User> => apiClient.get<User>("/api/me"),
  getProfile: (): Promise<Profile> => apiClient.get<Profile>("/api/me/profile"),
  updateProfile: (profile: Partial<Profile>): Promise<Profile> => apiClient.patch<Profile>("/api/me/profile", profile),
  getContact: (): Promise<ContactInfo> => apiClient.get<ContactInfo>("/api/me/contact"),
  updateContact: (contact: ContactUpdateRequest): Promise<ContactInfo> => apiClient.patch<ContactInfo>("/api/me/contact", contact),
  getNotificationSettings: (): Promise<NotificationSettings> => apiClient.get<NotificationSettings>("/api/me/notification-settings"),
  updateNotificationSettings: (settings: Pick<NotificationSettings, "deadlineEnabled">): Promise<NotificationSettings> => apiClient.patch<NotificationSettings>("/api/me/notification-settings", settings),
  listPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/policies"),
  getPolicy: (policySlug = "local-vacation"): Promise<Policy> => apiClient.get<Policy>(`/api/policies/${policySlug}`),
  savePolicy: (policySlug: string): Promise<SavePolicyResponse> => apiClient.post<SavePolicyResponse>(`/api/me/saved-policies/${policySlug}`),
  listSavedPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/me/saved-policies"),
  removeSavedPolicy: (policySlug: string): Promise<SavePolicyResponse> => apiClient.delete<SavePolicyResponse>(`/api/me/saved-policies/${policySlug}`),
  listTrips: (): Promise<Trip[]> => apiClient.get<Trip[]>("/api/trips"),
  createTrip: (trip?: CreateTripRequest): Promise<Trip> => apiClient.post<Trip>("/api/trips", trip),
  deleteTrip: (tripId: string): Promise<DeleteTripResponse> => apiClient.delete<DeleteTripResponse>(`/api/trips/${tripId}`),
  getTrip: (tripId = itinerary.id): Promise<Trip> => apiClient.get<Trip>(`/api/trips/${tripId}`),
  addTripPlace: (tripId: string, dayNumber: number, place: TripPlaceRequest): Promise<Trip> => apiClient.post<Trip>(`/api/trips/${tripId}/days/${dayNumber}/places`, place),
  updateTripPlace: (tripId: string, placeId: string, place: TripPlaceUpdateRequest): Promise<Trip> => apiClient.patch<Trip>(`/api/trips/${tripId}/places/${placeId}`, place),
  deleteTripPlace: (tripId: string, placeId: string): Promise<Trip> => apiClient.delete<Trip>(`/api/trips/${tripId}/places/${placeId}`),
  addPolicyToTrip: (tripId: string, policySlug: string): Promise<TripPolicyResponse> => apiClient.post<TripPolicyResponse>(`/api/trips/${tripId}/policies/${policySlug}`),
  listRecommendations: (tripId = itinerary.id): Promise<Recommendation[]> => apiClient.get<Recommendation[]>(`/api/trips/${tripId}/recommendations`),
  getInviteState: (tripId = itinerary.id): Promise<InviteState> => apiClient.get<InviteState>(`/api/trips/${tripId}/invite`),
  confirmInviteSent: (tripId = itinerary.id, role?: InviteRole): Promise<InviteState> => apiClient.post<InviteState>(`/api/trips/${tripId}/invite`, role ? { role } : undefined),
  acceptInvite: (inviteToken: string): Promise<InviteState> => apiClient.post<InviteState>(`/api/invites/${inviteToken}/accept`),
};
