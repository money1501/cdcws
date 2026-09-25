import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from '@/lib/auth-client';
import { AuthModal } from '@/components/auth/AuthModal';

export type AuthReason =
  | 'export'
  | 'publish'
  | 'collaborate'
  | 'upload'
  | 'comment'
  | 'upvote'
  | 'voice'
  | 'save'
  | 'general';

export interface AuthModalOptions {
  reason?: AuthReason;
  title?: string;
  description?: string;
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void | Promise<void>;
}

interface AuthModalContextType {
  isOpen: boolean;
  options: AuthModalOptions | null;
  openAuthModal: (options?: AuthModalOptions) => void;
  closeAuthModal: () => void;
  requireAuth: (
    action: () => void | Promise<void>,
    options?: AuthModalOptions,
  ) => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AuthModalOptions | null>(null);
  const { data: session } = useSession();

  const openAuthModal = useCallback((opts?: AuthModalOptions) => {
    setOptions(opts ?? null);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const requireAuth = useCallback(
    (action: () => void | Promise<void>, opts?: AuthModalOptions) => {
      if (session?.user) {
        void action();
        return;
      }
      openAuthModal({
        ...opts,
        onSuccess: action,
      });
    },
    [session?.user, openAuthModal],
  );

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        options,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}
      <AuthModal
        isOpen={isOpen}
        options={options}
        onClose={closeAuthModal}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
