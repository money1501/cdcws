import { AppRouter } from '@/routes/AppRouter';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { NotificationsProvider } from '@/lib/notifications-context';
import { AuthModalProvider } from '@/lib/auth-modal-context';
import { ConfirmProvider } from '@/components/dialog';

function App() {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <AuthModalProvider>
          <ConfirmProvider>
            <AppRouter />
          </ConfirmProvider>
        </AuthModalProvider>
      </NotificationsProvider>
    </ToastProvider>
  );
}

export default App;
