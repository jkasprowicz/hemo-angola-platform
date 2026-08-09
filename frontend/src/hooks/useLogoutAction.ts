import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authService } from "../services/authService";
import { useSyncStore } from "../lib/sync/syncStore";


export function useLogoutAction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setLogoutError(null);
      useSyncStore.getState().resetAll();
      queryClient.clear();
      queryClient.setQueryData(["session"], { authenticated: false });
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      console.error(error);
      setLogoutError("Não foi possível encerrar a sessão. Tente novamente.");
    },
  });

  return {
    logoutError,
    logoutMutation,
  };
}
