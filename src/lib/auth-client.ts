import { createAuthClient } from 'better-auth/react';
import { API_BASE_URL } from '@/lib/api-client';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
});

export const { signIn, signUp, signOut } = authClient;

export const useSession = authClient.useSession as unknown as () => {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
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
