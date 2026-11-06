import {
  ParseResponseSchema,
  TailorResponseSchema,
  type ParseResponse,
  type TailorResponse,
} from "@tailorcv/shared";
import { createContext, useContext } from "react";
import { z } from "zod";

/**
 * Session state for the 4-step flow (D-73: React context). Mirrored to sessionStorage so a page
 * refresh doesn't lose the user's work; it lives only in this browser tab and is never sent
 * anywhere. Storage access is wrapped in try/catch: private mode or blocked storage must never
 * break the app, it just means no persistence.
 *
 * (Context, types and helpers live here; the <SessionProvider> component lives in session.tsx,
 * so React Fast Refresh keeps working.)
 */
export const SESSION_STORAGE_KEY = "tailorcv.session.v1";

const StoredSessionSchema = z.object({
  parsed: ParseResponseSchema.nullable(),
  jobDescription: z.string(),
  tailorResult: TailorResponseSchema.nullable(),
});
export type SessionData = z.infer<typeof StoredSessionSchema>;

export const EMPTY_SESSION: SessionData = { parsed: null, jobDescription: "", tailorResult: null };

export interface SessionValue extends SessionData {
  /** A new resume clears the old tailoring result (it belonged to the previous resume). */
  setParsed: (parsed: ParseResponse) => void;
  setJobDescription: (text: string) => void;
  setTailorResult: (result: TailorResponse) => void;
  reset: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function loadSession(): SessionData {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return EMPTY_SESSION;
    const parsed = StoredSessionSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY); // stale shape from an older version
  } catch {
    // unavailable storage or corrupt JSON: start fresh
  }
  return EMPTY_SESSION;
}

export function saveSession(data: SessionData): void {
  try {
    if (!data.parsed && !data.jobDescription && !data.tailorResult) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // quota exceeded / storage blocked: keep working in memory
  }
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
