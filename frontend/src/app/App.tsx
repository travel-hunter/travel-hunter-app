import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { PublicLayout, ServiceLayout } from "../components/AppLayout";
import { AiResultsPage, FriendInvitePage, ItineraryCreatePage, ItineraryDetailPage, ItineraryListPage } from "../pages/ItineraryPages";
import { LoginPage, SignupPage } from "../pages/AuthPages";
import { HomePage } from "../pages/HomePage";
import { MyPage } from "../pages/MyPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { PolicyDetailPage, PolicyListPage } from "../pages/PolicyPages";
import { ProfileSetupPage } from "../pages/ProfileSetupPage";
import { useSession } from "./session";

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
        </Route>
        <Route element={<ServiceLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/policies" element={<PolicyListPage />} />
          <Route path="/policies/:policyId" element={<PolicyDetailPage />} />
          <Route path="/trips" element={<ItineraryListPage />} />
          <Route path="/trips/new" element={<ItineraryCreatePage />} />
          <Route path="/trips/:tripId" element={<ItineraryDetailPage />} />
          <Route path="/ai-results" element={<AiResultsPage />} />
          <Route path="/friend-invite" element={<FriendInvitePage />} />
          <Route path="/mypage" element={<MyPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedRoute() {
  const { currentUser } = useSession();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}
