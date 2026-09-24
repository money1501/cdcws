import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

export interface AppNotification {
  id: string;
  type: 'follow' | 'collab_invite' | 'board_updated' | 'info';
  title: string;
  body: string;
  /** ISO date string */
  createdAt: string;
  read: boolean;
  /** Optional link to navigate to */
  link?: string;
}

interface NotificationsCtx {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  refresh: () => void;
}

const Ctx = createContext<NotificationsCtx>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  refresh: () => {},
});

/**
 * Polls `/notifications` every 30 s. If the backend doesn't have that
 * endpoint yet, it silently swallows the error and returns an empty list.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get<AppNotification[]>('/notifications');
      setNotifications(res.data ?? []);
    } catch {
      // Backend may not have this endpoint yet — fail silently
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    timerRef.current = setInterval(() => void fetchNotifications(), 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchNotifications]);

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    apiClient.patch(`/notifications/${id}/read`).catch(() => {});
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    apiClient.patch('/notifications/read-all').catch(() => {});
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, markAllRead, markRead, refresh: fetchNotifications }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  return useContext(Ctx);
}
