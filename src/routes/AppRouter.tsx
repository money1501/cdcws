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
import { useSession } from '@/lib/auth-client';
import { DrawgonLoader } from '@/components/DrawgonLoader';

/** Protected screens render inside the persistent sidebar + header shell. */
function shell(element: React.ReactNode) {
  return (
    <ProtectedRoute>
      <AppShell>{element}</AppShell>
    </ProtectedRoute>
  );
}

/** Open screens render inside the shell without requiring immediate login. */
function openShell(element: React.ReactNode) {
  return <AppShell>{element}</AppShell>;
}

/**
 * Root route:
 * - Unauthenticated users get an immediate, responsive interactive whiteboard.
 * - Authenticated users get their Dashboard ("My Boards").
 */
function RootRoute() {
  const { data: session, isPending } = useSession();
  if (isPending) return <DrawgonLoader />;
  if (!session?.user) {
    return <BoardPage />;
  }
  return <AppShell><DashboardPage /></AppShell>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
  },
  {
    path: '/board',
    element: <BoardPage />,
  },
  {
    path: '/boards/new',
    element: <BoardPage />,
  },
  {
    path: '/boards/local',
    element: <BoardPage />,
  },
  {
    path: '/boards/:boardId',
    element: <BoardPage />,
  },
  {
    path: '/dashboard',
    element: shell(<DashboardPage />),
  },
  {
    path: '/community',
    element: openShell(<CommunityFeedPage />),
  },
  {
    path: '/community/boards/:boardId',
    element: openShell(<CommunityBoardPage />),
  },
  {
    path: '/communities',
    element: openShell(<CommunitiesPage />),
  },
  {
    path: '/c/:slug',
    element: openShell(<CommunityPage />),
  },
  {
    path: '/home',
    element: openShell(<HomePage />),
  },
  {
    path: '/saved',
    element: openShell(<SavedPage />),
  },
  {
    path: '/profile',
    element: shell(<ProfilePage />),
  },
  {
    path: '/users/:userId',
    element: openShell(<UserProfilePage />),
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
