import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { API_BASE_URL } from '@/lib/api-client';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut } = authClient;

export const useSession = authClient.useSession as unknown as () => {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      isAdmin?: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
    };
  } | null;
  isPending: boolean;
  error: any;
};
