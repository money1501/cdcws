import { AppRouter } from '@/routes/AppRouter';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { NotificationsProvider } from '@/lib/notifications-context';
import { AuthModalProvider } from '@/lib/auth-modal-context';

function App() {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <AuthModalProvider>
          <AppRouter />
        </AuthModalProvider>
      </NotificationsProvider>
    </ToastProvider>
  );
}

export default App;
