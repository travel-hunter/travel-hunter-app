import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  appDataApi,
  AuthResponse,
  LoginRequest,
  setApiAccessToken,
  SignupCompleteRequest,
  SignupRequest,
  SignupVerificationResponse,
  SignupVerifyResponse,
  Profile,
  User,
} from "../api";

type SessionContextValue = {
  currentUser: User | null;
  isSessionBootstrapping: boolean;
  profile: Profile;
  addedPolicy: boolean;
  addedPolicySlugs: Set<string>;
  likedPolicy: boolean;
  invited: boolean;
  login: (request?: LoginRequest) => Promise<void>;
  signup: (request?: SignupRequest) => Promise<SignupVerificationResponse>;
  verifySignup: (token: string) => Promise<SignupVerifyResponse>;
  completeSignup: (request: SignupCompleteRequest) => Promise<User>;
  completeOAuthSession: () => Promise<User>;
  logout: () => Promise<void>;
  saveNickname: (nickname: string) => Promise<User>;
  updateProfile: (key: keyof Profile, value: string) => void;
  saveProfile: (profile?: Partial<Profile>) => Promise<Profile>;
  addPolicy: (slug?: string) => void;
  isPolicyAdded: (slug: string) => boolean;
  togglePolicyLike: () => void;
  sendInvite: () => void;
  savedSlugs: Set<string>;
  addSavedSlug: (slug: string) => void;
  removeSavedSlug: (slug: string) => void;
};

const AUTH_STORAGE_KEY = "travel-hunter-production-auth";

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredAuth(): AuthResponse | null {
  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<AuthResponse>;
    if (!parsed.accessToken || !parsed.user) return null;
    return { accessToken: parsed.accessToken, user: parsed.user };
  } catch {
    return null;
  }
}

function persistAuth(auth: AuthResponse) {
  setApiAccessToken(auth.accessToken);
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearAuth() {
  setApiAccessToken(null);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function readRemoteProfile(): Promise<Profile> {
  return appDataApi.getProfile();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = readStoredAuth();
    if (stored) setApiAccessToken(stored.accessToken);
    return stored?.user ?? null;
  });
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    region: "제주",
    style: "휴식",
    budget: "1인 40만원 이하",
  });
  const [addedPolicy, setAddedPolicy] = useState(false);
  const [addedPolicySlugs, setAddedPolicySlugs] = useState<Set<string>>(new Set());
  const [likedPolicy, setLikedPolicy] = useState(false);
  const [invited, setInvited] = useState(false);
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    function loadSavedPolicies() {
      appDataApi.listSavedPolicies().then((p) => { if (!cancelled) setSavedSlugs(new Set(p.map((s) => s.slug))); }).catch(() => {});
    }

    async function applyAuth(auth: AuthResponse) {
      if (cancelled) return;
      persistAuth(auth);
      setCurrentUser(auth.user);
      const nextProfile = await readRemoteProfile();
      if (cancelled) return;
      setProfile(nextProfile);
      loadSavedPolicies();
    }

    async function verifyStoredSession() {
      try {
        const stored = readStoredAuth();
        if (!stored) {
          try {
            await applyAuth(await appDataApi.refreshSession());
          } catch {
            if (!cancelled && !readStoredAuth()) clearAuth();
          }
          return;
        }

        try {
          const user = await appDataApi.getCurrentUser();
          await applyAuth({ accessToken: stored.accessToken, user });
        } catch {
          if (cancelled) return;
          try {
            await applyAuth(await appDataApi.refreshSession());
            return;
          } catch {
            // Fall through to clearing the stale local session.
          }
          if (cancelled) return;
          if (readStoredAuth()?.accessToken === stored.accessToken) {
            clearAuth();
            setCurrentUser(null);
          }
        }
      } finally {
        if (!cancelled) {
          setIsSessionBootstrapping(false);
        }
      }
    }

    void verifyStoredSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      isSessionBootstrapping,
      profile,
      addedPolicy,
      addedPolicySlugs,
      likedPolicy,
      invited,
      login: async (request) => {
        const auth = await appDataApi.login(request);
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
        appDataApi.listSavedPolicies().then((p) => setSavedSlugs(new Set(p.map((s) => s.slug)))).catch(() => {});
      },
      signup: async (request) => {
        const result = await appDataApi.requestSignupVerification(request);
        setSavedSlugs(new Set());
        return result;
      },
      verifySignup: async (token) => appDataApi.verifySignup({ token }),
      completeSignup: async (request) => {
        const auth = await appDataApi.completeSignup(request);
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
        setSavedSlugs(new Set());
        return auth.user;
      },
      completeOAuthSession: async () => {
        const auth = await appDataApi.refreshSession();
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
        appDataApi.listSavedPolicies().then((p) => setSavedSlugs(new Set(p.map((s) => s.slug)))).catch(() => {});
        return auth.user;
      },
      saveNickname: async (nickname) => {
        const user = await appDataApi.updateNickname({ nickname });
        const stored = readStoredAuth();
        if (stored) persistAuth({ accessToken: stored.accessToken, user });
        setCurrentUser(user);
        return user;
      },
      logout: async () => {
        try {
          await appDataApi.logout();
        } finally {
          clearAuth();
          setCurrentUser(null);
          setSavedSlugs(new Set());
          setAddedPolicy(false);
          setAddedPolicySlugs(new Set());
        }
      },
      updateProfile: (key, value) => {
        setProfile((current) => ({ ...current, [key]: value }));
      },
      saveProfile: async (profilePatch) => {
        const savedProfile = await appDataApi.updateProfile({ ...profile, ...profilePatch });
        setProfile(savedProfile);
        try {
          const user = await appDataApi.getCurrentUser();
          const stored = readStoredAuth();
          if (stored) persistAuth({ accessToken: stored.accessToken, user });
          setCurrentUser(user);
        } catch {
          // Profile persistence already succeeded; stale user metadata can refresh on the next session check.
        }
        return savedProfile;
      },
      addPolicy: (slug?: string) => {
        setAddedPolicy(true);
        if (slug) {
          setAddedPolicySlugs((prev) => new Set(prev).add(slug));
        }
      },
      isPolicyAdded: (slug: string) => addedPolicySlugs.has(slug),
      togglePolicyLike: () => setLikedPolicy((current) => !current),
      sendInvite: () => setInvited(true),
      savedSlugs,
      addSavedSlug: (slug: string) => setSavedSlugs((prev) => new Set(prev).add(slug)),
      removeSavedSlug: (slug: string) =>
        setSavedSlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        }),
    }),
    [addedPolicy, addedPolicySlugs, currentUser, invited, isSessionBootstrapping, likedPolicy, profile, savedSlugs],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
