import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60000, // Keep data fresh for 1 minute
    gcTime: 300000, // Cache user data for 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Refresh every 2 minutes if logged in
      return query.state.data ? 120000 : false;
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
