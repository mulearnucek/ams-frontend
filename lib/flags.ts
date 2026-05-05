/**
 * Feature Flag Keys
 *
 * Centralised registry of every config key used as a feature flag.
 * Always import from here — never hardcode the key string directly in a component.
 *
 * Usage:
 *   import { FLAGS } from "@/lib/flags";
 *   const enabled = Boolean(config[FLAGS.NOTIFICATIONS]);
 *
 * To enable / disable a flag: update the matching key in the admin Config page
 * (or via the backend /config endpoint). The string value here must exactly
 * match the key stored in the database.
 */

export const FLAGS = {
  /** Controls all notification-related UI surfaces. */
  NOTIFICATIONS: "feature/notifications",

  // ── Auth ────────────────────────────────────────────────────────────────────

  GOOGLE_SIGNIN: "auth/google-signin",   // Show/hide the Google sign-in button
  EMAIL_SIGNIN: "auth/email-signin",     // Show/hide the email + password form
  SIGNUP: "auth/signup",                 // Allow students to self-onboard without a pre-assigned batch
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];
