import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    // 401 esetén null-t adunk vissza (nem dobunk hibát) – ez a normál "nincs bejelentkezve" állapot
    queryFn: getQueryFn({ on401: "returnNull" }),
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
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
