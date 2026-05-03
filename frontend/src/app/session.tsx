import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { user } from "../data/prototypeData";

type SessionUser = {
  name: string;
  email: string;
};

type Profile = {
  region: string;
  style: string;
  budget: string;
};

type SessionContextValue = {
  currentUser: SessionUser | null;
  profile: Profile;
  addedPolicy: boolean;
  likedPolicy: boolean;
  invited: boolean;
  login: () => void;
  logout: () => void;
  updateProfile: (key: keyof Profile, value: string) => void;
  addPolicy: () => void;
  togglePolicyLike: () => void;
  sendInvite: () => void;
};

const AUTH_STORAGE_KEY = "travel-hunter-production-auth";

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredUser(): SessionUser | null {
  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => readStoredUser());
  const [profile, setProfile] = useState<Profile>({
    region: "제주",
    style: "휴식",
    budget: "1인 40만원 이하",
  });
  const [addedPolicy, setAddedPolicy] = useState(false);
  const [likedPolicy, setLikedPolicy] = useState(false);
  const [invited, setInvited] = useState(false);

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      profile,
      addedPolicy,
      likedPolicy,
      invited,
      login: () => {
        const nextUser = { name: user.name, email: user.email };
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
        setCurrentUser(nextUser);
      },
      logout: () => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setCurrentUser(null);
      },
      updateProfile: (key, value) => {
        setProfile((current) => ({ ...current, [key]: value }));
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
