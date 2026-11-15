import type { TailorRequestInput, TailorResponse } from "@tailorcv/shared";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { tailorResume } from "../../api/resumes";

/**
 * Tailoring as a TanStack mutation (never auto-retried: each call costs AI time, the user chooses
 * to retry). `cancel()` aborts the request, and the API then cancels the AI call too. Leaving the
 * page also cancels.
 */
export function useTailorResume() {
  const controller = useRef<AbortController | null>(null);

  const mutation = useMutation<TailorResponse, Error, TailorRequestInput>({
    mutationFn: (input) => {
      controller.current?.abort();
      controller.current = new AbortController();
      return tailorResume(input, controller.current.signal);
    },
  });

  const cancel = useCallback(() => {
    controller.current?.abort();
    mutation.reset();
  }, [mutation]);

  useEffect(() => () => controller.current?.abort(), []);

  return { ...mutation, cancel };
}
