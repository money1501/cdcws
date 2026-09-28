import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { getDatabaseSsl } from '../../config/database-ssl';

const isProduction = process.env.NODE_ENV === 'production';
const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const resendConfigured = Boolean(process.env.RESEND_API_KEY);

console.log(
  `[Auth Startup] Initializing BetterAuth: Google OAuth: ${googleConfigured} (ClientId: ${Boolean(
    process.env.GOOGLE_CLIENT_ID,
  )}, ClientSecret: ${Boolean(
    process.env.GOOGLE_CLIENT_SECRET,
  )}), Resend OTP: ${resendConfigured}, FRONTEND_URL: ${process.env.FRONTEND_URL || 'none'}`,
);

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getDatabaseSsl(),
});

/**
 * Periodically clean up unverified accounts older than 48 hours to prevent
 * abandoned or bot signups from cluttering the database.
 */
async function cleanupStaleUnverifiedAccounts() {
  try {
    const res = await dbPool.query(
      `DELETE FROM "user" WHERE "emailVerified" = false AND "createdAt" < NOW() - INTERVAL '48 hours'`,
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(
        `[Auth Cleanup] Deleted ${res.rowCount} stale unverified account(s) older than 48 hours.`,
      );
    }
  } catch (err) {
    // Database might not be reachable immediately at local startup
    if (process.env.NODE_ENV === 'production') {
      console.error('[Auth Cleanup] Error during unverified accounts cleanup:', err);
    }
  }
}

cleanupStaleUnverifiedAccounts();
setInterval(cleanupStaleUnverifiedAccounts, 60 * 60 * 1000);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: {
    dialect: new PostgresDialect({
      pool: dbPool,
    }),
    type: 'postgres',
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 600, // 10 minutes
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // If an unverified user signs up again, delete the stale unverified user row
      // so BetterAuth can create a fresh user and send a new verification code.
      if (ctx.path.startsWith('/sign-up/email')) {
        const body = ctx.body as Record<string, any> | undefined;
        const email = body?.email?.toLowerCase()?.trim();
        if (email) {
          try {
            await dbPool.query(
              'DELETE FROM "user" WHERE LOWER("email") = LOWER($1) AND "emailVerified" = false',
              [email],
            );
          } catch (err) {
            console.error('[Auth Hook] Error cleaning up unverified user before signup:', err);
          }
        }
      }

      if (ctx.path.startsWith('/sign-in/social')) {
        const body = ctx.body as Record<string, any> | undefined;
        if (!body?.callbackURL || body.callbackURL === ctx.context.baseURL) {
          ctx.body = {
            ...body,
            callbackURL: process.env.FRONTEND_URL || 'https://boared.live/',
          };
        }
      }
    }),
  },

  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      allowedAttempts: 5,
      expiresIn: 600, // 10 minutes
      otpLength: 6,
      disableSignUp: false, // Auto-creates verified account on first use in OTP flow
      rateLimit: {
        window: 600, // 10 minutes
        max: 3, // max 3 codes per window
      },
      async sendVerificationOTP({ email, otp, type }) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.warn(
            `[EmailOTP] RESEND_API_KEY is not configured. OTP for ${email} (${type}) is: ${otp}`,
          );
          return;
        }

        try {
          const fromEmail =
            process.env.EMAIL_FROM ||
            process.env.RESEND_FROM_EMAIL ||
            'Boared <noreply@boared.live>';

          let subject = `Your Boared verification code: ${otp}`;
          let heading = 'Verify your email';
          let description =
            'Here is your single-use verification code to activate your Boared account:';

          if (type === 'sign-in') {
            subject = `Your Boared sign-in code: ${otp}`;
            heading = 'Sign in to Boared';
            description =
              'Here is your single-use verification code to sign in to your Boared account:';
          } else if (type === 'forget-password') {
            subject = `Your Boared password reset code: ${otp}`;
            heading = 'Reset your password';
            description =
              'Here is your single-use verification code to reset your Boared password:';
          } else if (type === 'email-verification') {
            subject = `Your Boared verification code: ${otp}`;
            heading = 'Verify your email';
            description =
              'Here is your single-use verification code to verify your email and activate your Boared account:';
          }

          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [email],
              subject,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0;">Boared</h1>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">${heading}</p>
                  </div>
                  <p style="color: #374151; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
                    ${description}
                  </p>
                  <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: monospace, Courier, sans-serif; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
                  </div>
                  <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin-bottom: 0;">
                    This code will expire in <strong>10 minutes</strong>. If you didn't request this code, you can safely ignore this email.
                  </p>
                </div>
              `,
              text: `Your Boared verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you didn't request this code, please ignore this email.`,
            }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error('[EmailOTP] Failed to send email via Resend:', errBody);
          }
        } catch (error) {
          console.error('[EmailOTP] Error sending verification email:', error);
        }
      },
    }),
  ],
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
  account: {
    storeStateStrategy: 'database',
    skipStateCookieCheck: true,
  },
  trustedOrigins: Array.from(
    new Set(
      [
        process.env.FRONTEND_URL?.replace(/\/+$/, ''),
        'https://boared.live',
        'https://www.boared.live',
        'http://localhost:5173',
        'http://localhost:3000',
      ].filter(Boolean) as string[],
    ),
  ),
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      secure: isProduction,
      httpOnly: true,
      path: '/',
    },
    useSecureCookies: false,
  },
});


