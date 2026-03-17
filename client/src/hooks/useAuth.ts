import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache user data (React Query v5)
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Csak akkor frissítsen automatikusan, ha már be van jelentkezve
      return query.state.data ? 60000 : false;
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
