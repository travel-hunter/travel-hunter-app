import {
  budgets,
  itinerary,
  onboardingSlides,
  regions,
  travelStyles,
  user,
} from "../data/seedData";
import { apiClient } from "./client";
import { AppDataApi, AuthResponse, CreateTripRequest, LoginRequest, LogoutResponse, SavePolicyResponse, SignupRequest, TripPolicyResponse } from "./dataApi";
import { InviteState, Policy, Profile, ProfileOptions, Recommendation, Trip, User } from "./types";

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
  listPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/policies"),
  getPolicy: (policySlug = "local-vacation"): Promise<Policy> => apiClient.get<Policy>(`/api/policies/${policySlug}`),
  savePolicy: (policySlug: string): Promise<SavePolicyResponse> => apiClient.post<SavePolicyResponse>(`/api/me/saved-policies/${policySlug}`),
  listSavedPolicies: (): Promise<Policy[]> => apiClient.get<Policy[]>("/api/me/saved-policies"),
  removeSavedPolicy: (policySlug: string): Promise<SavePolicyResponse> => apiClient.delete<SavePolicyResponse>(`/api/me/saved-policies/${policySlug}`),
  listTrips: (): Promise<Trip[]> => apiClient.get<Trip[]>("/api/trips"),
  createTrip: (trip?: CreateTripRequest): Promise<Trip> => apiClient.post<Trip>("/api/trips", trip),
  getTrip: (tripId = itinerary.id): Promise<Trip> => apiClient.get<Trip>(`/api/trips/${tripId}`),
  addPolicyToTrip: (tripId: string, policySlug: string): Promise<TripPolicyResponse> => apiClient.post<TripPolicyResponse>(`/api/trips/${tripId}/policies/${policySlug}`),
  listRecommendations: (tripId = itinerary.id): Promise<Recommendation[]> => apiClient.get<Recommendation[]>(`/api/trips/${tripId}/recommendations`),
  getInviteState: (tripId = itinerary.id): Promise<InviteState> => apiClient.get<InviteState>(`/api/trips/${tripId}/invite`),
  confirmInviteSent: (tripId = itinerary.id): Promise<InviteState> => apiClient.post<InviteState>(`/api/trips/${tripId}/invite`),
  acceptInvite: (inviteToken: string): Promise<InviteState> => apiClient.post<InviteState>(`/api/invites/${inviteToken}/accept`),
};
