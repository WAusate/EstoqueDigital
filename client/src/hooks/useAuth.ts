import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  role?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: Boolean(user),
  };
}
