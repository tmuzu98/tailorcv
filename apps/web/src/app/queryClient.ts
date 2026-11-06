import { QueryClient } from "@tanstack/react-query";

/**
 * Mutations (parse/tailor) never auto-retry: they're slow AI calls and the user decides to retry
 * from the error message. Queries (health) retry once.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
