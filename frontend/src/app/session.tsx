import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
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
  profile: Profile;
  addedPolicy: boolean;
  likedPolicy: boolean;
  invited: boolean;
  login: (request?: LoginRequest) => Promise<void>;
  signup: (request?: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (key: keyof Profile, value: string) => void;
  saveProfile: (profile?: Partial<Profile>) => Promise<Profile>;
  addPolicy: () => void;
  togglePolicyLike: () => void;
  sendInvite: () => void;
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
  const [profile, setProfile] = useState<Profile>({
    region: "제주",
    style: "휴식",
    budget: "1인 40만원 이하",
  });
  const [addedPolicy, setAddedPolicy] = useState(false);
  const [likedPolicy, setLikedPolicy] = useState(false);
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyStoredSession() {
      const stored = readStoredAuth();
      if (!stored) {
        try {
          const refreshed = await appDataApi.refreshSession();
          if (cancelled) return;
          persistAuth(refreshed);
          setCurrentUser(refreshed.user);
          setProfile(await readRemoteProfile());
        } catch {
          clearAuth();
        }
        return;
      }

      try {
        const user = await appDataApi.getCurrentUser();
        if (cancelled) return;
        const nextAuth = { accessToken: stored.accessToken, user };
        persistAuth(nextAuth);
        setCurrentUser(user);
        setProfile(await readRemoteProfile());
      } catch {
        if (cancelled) return;
        try {
          const refreshed = await appDataApi.refreshSession();
          if (cancelled) return;
          persistAuth(refreshed);
          setCurrentUser(refreshed.user);
          setProfile(await readRemoteProfile());
          return;
        } catch {
          // Fall through to clearing the stale local session.
        }
        clearAuth();
        setCurrentUser(null);
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
      profile,
      addedPolicy,
      likedPolicy,
      invited,
      login: async (request) => {
        const auth = await appDataApi.login(request);
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
      },
      signup: async (request) => {
        const auth = await appDataApi.signup(request);
        persistAuth(auth);
        setCurrentUser(auth.user);
        setProfile(await readRemoteProfile());
      },
      logout: async () => {
        try {
          await appDataApi.logout();
        } finally {
          clearAuth();
          setCurrentUser(null);
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
      addPolicy: () => setAddedPolicy(true),
      togglePolicyLike: () => setLikedPolicy((current) => !current),
      sendInvite: () => setInvited(true),
    }),
    [addedPolicy, currentUser, invited, likedPolicy, profile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
