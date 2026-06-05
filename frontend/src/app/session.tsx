import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  appDataApi,
  AuthResponse,
  LoginRequest,
  setApiAccessToken,
  SignupRequest,
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
  signup: (request?: SignupRequest) => Promise<void>;
  completeOAuthSession: () => Promise<void>;
  logout: () => Promise<void>;
  saveNickname: (nickname: string) => Promise<User>;
  updateProfile: (key: keyof Profile, value: string) => void;
  saveProfile: (profile?: Partial<Profile>) => Promise<Profile>;
  addPolicy: (slug?: string) => void;
  removeAddedPolicy: (slug: string) => void;
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
  const savedSlugAdditionsRef = useRef<Set<string>>(new Set());
  const savedSlugRemovalsRef = useRef<Set<string>>(new Set());

  function refreshSavedSlugsFromRemote(isCancelled?: () => boolean) {
    appDataApi
      .listSavedPolicies()
      .then((policies) => {
        if (isCancelled?.()) return;
        const next = new Set(policies.map((policy) => policy.slug));
        savedSlugRemovalsRef.current.forEach((slug) => next.delete(slug));
        savedSlugAdditionsRef.current.forEach((slug) => next.add(slug));
        setSavedSlugs(next);
      })
      .catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;

    async function applyAuth(auth: AuthResponse) {
      if (cancelled) return;
      persistAuth(auth);
      setCurrentUser(auth.user);
      const nextProfile = await readRemoteProfile();
      if (cancelled) return;
      setProfile(nextProfile);
      refreshSavedSlugsFromRemote(() => cancelled);
    }

    async function verifyStoredSession() {
      try {
        const stored = readStoredAuth();
        if (!stored) {
          try {
            await applyAuth(await appDataApi.refreshSession());
          } catch {
            clearAuth();
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
          clearAuth();
          setCurrentUser(null);
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
        refreshSavedSlugsFromRemote();
      },
      signup: async (request) => {
        const auth = await appDataApi.signup(request);
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
        savedSlugAdditionsRef.current.clear();
        savedSlugRemovalsRef.current.clear();
        setSavedSlugs(new Set());
      },
      completeOAuthSession: async () => {
        const auth = await appDataApi.refreshSession();
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
        refreshSavedSlugsFromRemote();
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
          savedSlugAdditionsRef.current.clear();
          savedSlugRemovalsRef.current.clear();
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
      removeAddedPolicy: (slug: string) =>
        setAddedPolicySlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          setAddedPolicy(next.size > 0);
          return next;
        }),
      isPolicyAdded: (slug: string) => addedPolicySlugs.has(slug),
      togglePolicyLike: () => setLikedPolicy((current) => !current),
      sendInvite: () => setInvited(true),
      savedSlugs,
      addSavedSlug: (slug: string) => {
        savedSlugRemovalsRef.current.delete(slug);
        savedSlugAdditionsRef.current.add(slug);
        setSavedSlugs((prev) => new Set(prev).add(slug));
      },
      removeSavedSlug: (slug: string) => {
        savedSlugAdditionsRef.current.delete(slug);
        savedSlugRemovalsRef.current.add(slug);
        setSavedSlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      },
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
