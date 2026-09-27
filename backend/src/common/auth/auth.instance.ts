import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
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
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  plugins: [
    emailOTP({
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
            process.env.RESEND_FROM_EMAIL || 'Boared <onboarding@resend.dev>';
          const subject =
            type === 'sign-in'
              ? `Your Boared verification code: ${otp}`
              : `Your Boared verification code: ${otp}`;

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
                    <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Collaborative Whiteboard</p>
                  </div>
                  <p style="color: #374151; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
                    Here is your single-use verification code to sign in to your Boared account:
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
      expiresIn: 600, // 10 minutes
      otpLength: 6,
      disableSignUp: false, // Auto-creates account on first use
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
