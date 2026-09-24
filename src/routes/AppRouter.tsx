import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { BoardPage } from '@/pages/BoardPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { CommunityFeedPage } from '@/pages/CommunityFeedPage';
import { CommunityBoardPage } from '@/pages/CommunityBoardPage';
import { CommunitiesPage } from '@/pages/CommunitiesPage';
import { CommunityPage } from '@/pages/CommunityPage';
import { HealthCheckPage } from '@/pages/HealthCheckPage';
import { HomePage } from '@/pages/HomePage';
import { SavedPage } from '@/pages/SavedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { JoinBoardPage } from '@/pages/JoinBoardPage';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

/** New screens render inside the persistent sidebar + header shell. */
function shell(element: React.ReactNode) {
  return (
    <ProtectedRoute>
      <AppShell>{element}</AppShell>
    </ProtectedRoute>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: shell(<DashboardPage />),
  },
  {
    path: '/boards/:boardId',
    element: (
      <ProtectedRoute>
        <BoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/community',
    element: shell(<CommunityFeedPage />),
  },
  {
    path: '/community/boards/:boardId',
    element: (
      <ProtectedRoute>
        <CommunityBoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/communities',
    element: shell(<CommunitiesPage />),
  },
  {
    path: '/c/:slug',
    element: shell(<CommunityPage />),
  },
  {
    path: '/home',
    element: shell(<HomePage />),
  },
  {
    path: '/saved',
    element: shell(<SavedPage />),
  },
  {
    path: '/profile',
    element: shell(<ProfilePage />),
  },
  {
    path: '/users/:userId',
    element: shell(<UserProfilePage />),
  },
  {
    path: '/settings',
    element: shell(<SettingsPage />),
  },
  {
    path: '/join/:token',
    element: (
      <ProtectedRoute>
        <JoinBoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/boards/join/:token',
    element: (
      <ProtectedRoute>
        <JoinBoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/debug/health',
    element: <HealthCheckPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
