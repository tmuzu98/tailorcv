import type { ParseResponse, TailorResponse } from "@tailorcv/shared";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  EMPTY_SESSION,
  SessionContext,
  loadSession,
  saveSession,
  type SessionData,
  type SessionValue,
} from "./sessionContext";

/** Provides the session (see sessionContext.ts) and mirrors it to sessionStorage. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SessionData>(loadSession);

  useEffect(() => saveSession(data), [data]);

  const setParsed = useCallback(
    (parsed: ParseResponse) => setData((d) => ({ ...d, parsed, tailorResult: null })),
    [],
  );
  const setJobDescription = useCallback(
    (jobDescription: string) => setData((d) => ({ ...d, jobDescription })),
    [],
  );
  const setTailorResult = useCallback(
    (tailorResult: TailorResponse) => setData((d) => ({ ...d, tailorResult })),
    [],
  );
  const reset = useCallback(() => setData(EMPTY_SESSION), []);

  const value = useMemo<SessionValue>(
    () => ({ ...data, setParsed, setJobDescription, setTailorResult, reset }),
    [data, setParsed, setJobDescription, setTailorResult, reset],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
