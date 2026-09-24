import { AppRouter } from '@/routes/AppRouter';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { NotificationsProvider } from '@/lib/notifications-context';

function App() {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <AppRouter />
      </NotificationsProvider>
    </ToastProvider>
  );
}

export default App;
