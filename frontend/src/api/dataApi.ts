import { InviteState, OnboardingSlide, Policy, Profile, ProfileOptions, Recommendation, Trip, User } from "./types";

export type DataSource = "mock" | "backend";

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type LogoutResponse = {
  loggedOut: boolean;
};

export type SavePolicyResponse = {
  policyId: string;
  saved: boolean;
};

export type TripPolicyResponse = {
  tripId: string;
  policyId: string;
  added: boolean;
};

export type CreateTripRequest = {
  title?: string;
  region?: string;
  style?: string;
  description?: string;
  policySlug?: string;
};

export type AppDataApi = {
  getPreviewUser: () => User;
  getOnboardingSlides: () => readonly OnboardingSlide[];
  getProfileOptions: () => ProfileOptions;
  getPreviewTrip: () => Trip;
  login: (request?: LoginRequest) => Promise<AuthResponse>;
  signup: (request?: SignupRequest) => Promise<AuthResponse>;
  refreshSession: () => Promise<AuthResponse>;
  logout: () => Promise<LogoutResponse>;
  getCurrentUser: () => Promise<User>;
  getProfile: () => Promise<Profile>;
  updateProfile: (profile: Partial<Profile>) => Promise<Profile>;
  listPolicies: () => Promise<Policy[]>;
  getPolicy: (policySlug?: string) => Promise<Policy>;
  savePolicy: (policySlug: string) => Promise<SavePolicyResponse>;
  listTrips: () => Promise<Trip[]>;
  createTrip: (trip?: CreateTripRequest) => Promise<Trip>;
  getTrip: (tripId?: string) => Promise<Trip>;
  addPolicyToTrip: (tripId: string, policySlug: string) => Promise<TripPolicyResponse>;
  listRecommendations: (tripId?: string) => Promise<Recommendation[]>;
  getInviteState: (tripId?: string) => Promise<InviteState>;
  confirmInviteSent: (tripId?: string) => Promise<InviteState>;
};

export function getDataSource(): DataSource {
  return import.meta.env.VITE_DATA_SOURCE === "backend" ? "backend" : "mock";
}
