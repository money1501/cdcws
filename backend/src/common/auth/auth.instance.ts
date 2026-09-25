import { betterAuth } from 'better-auth';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { getDatabaseSsl } from '../../config/database-ssl';

/**
 * In development the frontend (localhost:5173) and API (localhost:3000) are
 * the same site, so the default `SameSite=Lax` session cookie is sent freely.
 * Deployed they are not: the frontend sits on Netlify and the API on its own
 * host, which makes every auth request cross-site. Browsers drop a `Lax`
 * cookie there, so login appears to succeed and the very next request arrives
 * anonymous — bouncing the user straight back to /login.
 *
 * `SameSite=None` requires `Secure`, which requires HTTPS. That combination is
 * only correct in production; forcing it locally would stop the cookie from
 * being stored over plain http at all.
 */
const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: {
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: getDatabaseSsl(),
      }),
    }),
    type: 'postgres',
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      /**
       * Master Admin flag: Grants ownership-bypass permissions across the system.
       * Note: isAdmin is not set via signup inputs and should be updated directly
       * in the database (e.g. UPDATE "user" SET "isAdmin" = true WHERE email = '...';).
       */
      isAdmin: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
  ...(isProduction && {
    advanced: {
      defaultCookieAttributes: {
        sameSite: 'none' as const,
        secure: true,
        // Chrome's CHIPS partitioning: third-party cookies without it are
        // being phased out, and a partitioned cookie is still fine here
        // because the session is only ever read by this one API origin.
        partitioned: true,
      },
    },
  }),
});
