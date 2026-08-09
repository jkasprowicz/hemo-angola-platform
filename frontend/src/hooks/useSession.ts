import { useQuery } from "@tanstack/react-query";

import { authService } from "../services/authService";


export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authService.getSession(),
    staleTime: 10_000,
  });
}

