import {
  budgets,
  getPolicy as getSeedPolicy,
  itinerary,
  onboardingSlides,
  policies,
  recommendations,
  regions,
  travelStyles,
  user,
} from "../data/seedData";
import { AppDataApi } from "./dataApi";
import { InviteState, Policy, ProfileOptions, Recommendation, Trip, User } from "./types";

const MOCK_LATENCY_MS = 120;
const inviteUrl = "travelhunter.app/i/jeju-3d";
const inviteToken = "jeju-3d";
const inviteCreatedAt = "2026-05-04T00:00:00Z";
const inviteExpiresAt = "2026-06-30T23:59:59Z";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function respond<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), MOCK_LATENCY_MS);
  });
}

const mockProfile = {
  region: "제주",
  style: "휴식",
  budget: "1인 40만원 이하",
};

export const mockApi: AppDataApi = {
  getPreviewUser: (): User => user,
  getOnboardingSlides: () => onboardingSlides,
  getProfileOptions: (): ProfileOptions => ({ regions, travelStyles, budgets }),
  getPreviewTrip: (): Trip => itinerary,
  login: () => respond({ accessToken: "mock-token", user }),
  signup: () => respond({ accessToken: "mock-token", user }),
  refreshSession: () => respond({ accessToken: "mock-token", user }),
  logout: () => respond({ loggedOut: true }),
  getCurrentUser: () => respond(user),
  getProfile: () => respond(mockProfile),
  updateProfile: (profile) => {
    Object.assign(mockProfile, profile);
    return respond(mockProfile);
  },
  listPolicies: (): Promise<Policy[]> => respond(policies),
  getPolicy: (policySlug?: string): Promise<Policy> => respond(getSeedPolicy(policySlug)),
  savePolicy: (policySlug: string) => respond({ policyId: policySlug, saved: true }),
  listTrips: (): Promise<Trip[]> => respond([itinerary]),
  createTrip: (request) => {
    if (request?.policySlug) {
      mockApi.addPolicyToTrip(itinerary.id, request.policySlug);
    }
    return respond(itinerary);
  },
  getTrip: (_tripId = itinerary.id): Promise<Trip> => respond(itinerary),
  addPolicyToTrip: (tripId: string, policySlug: string) => respond({ tripId, policyId: policySlug, added: true }),
  listRecommendations: (): Promise<Recommendation[]> => respond(recommendations),
  getInviteState: (tripId = itinerary.id): Promise<InviteState> =>
    respond({
      id: "1",
      tripId,
      inviteToken,
      inviteUrl,
      expiresAt: inviteExpiresAt,
      createdAt: inviteCreatedAt,
      acceptedAt: null,
      invited: false,
      copied: false,
    }),
  confirmInviteSent: (tripId = itinerary.id): Promise<InviteState> =>
    respond({
      id: "1",
      tripId,
      inviteToken,
      inviteUrl,
      expiresAt: inviteExpiresAt,
      createdAt: inviteCreatedAt,
      acceptedAt: "2026-05-04T00:10:00Z",
      invited: true,
      copied: false,
    }),
};
