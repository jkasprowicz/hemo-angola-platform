import { useQuery } from "@tanstack/react-query";

import { authService } from "../services/authService";


export function useBootstrap(enabled: boolean) {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => authService.getBootstrap(),
    enabled,
    staleTime: 10_000,
  });
}

