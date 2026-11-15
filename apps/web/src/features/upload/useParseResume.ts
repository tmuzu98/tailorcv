import type { ParseResponse } from "@tailorcv/shared";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { parseResume } from "../../api/resumes";

/**
 * Upload + parse as a TanStack mutation (never auto-retried: the user chooses to retry).
 * `cancel()` aborts the request; the API then cancels the AI call too (Day 9). Leaving the page
 * also cancels, so a slow parse never keeps running for nobody.
 */
export function useParseResume() {
  const controller = useRef<AbortController | null>(null);

  const mutation = useMutation<ParseResponse, Error, File>({
    mutationFn: (file) => {
      controller.current?.abort();
      controller.current = new AbortController();
      return parseResume(file, controller.current.signal);
    },
  });

  const cancel = useCallback(() => {
    controller.current?.abort();
    mutation.reset();
  }, [mutation]);

  useEffect(() => () => controller.current?.abort(), []);

  return { ...mutation, cancel };
}
