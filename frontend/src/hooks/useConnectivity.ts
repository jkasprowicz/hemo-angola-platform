import { useEffect, useState } from "react";


export type ConnectivitySnapshot = {
  isNavigatorOnline: boolean;
  isApiReachable: boolean;
  isEffectivelyOnline: boolean;
};


export function useConnectivity() {
  const [state, setState] = useState<ConnectivitySnapshot>({
    isNavigatorOnline: navigator.onLine,
    isApiReachable: false,
    isEffectivelyOnline: false,
  });

  useEffect(() => {
    let active = true;

    const updateNavigator = () => {
      setState((current) => ({
        ...current,
        isNavigatorOnline: navigator.onLine,
        isEffectivelyOnline: navigator.onLine && current.isApiReachable,
      }));
    };

    const checkApi = async () => {
      try {
        const response = await fetch("/api/health/", { credentials: "include" });
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          isApiReachable: response.ok,
          isEffectivelyOnline: current.isNavigatorOnline && response.ok,
        }));
      } catch {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          isApiReachable: false,
          isEffectivelyOnline: false,
        }));
      }
    };

    window.addEventListener("online", updateNavigator);
    window.addEventListener("offline", updateNavigator);
    void checkApi();
    const interval = window.setInterval(() => void checkApi(), 10000);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("online", updateNavigator);
      window.removeEventListener("offline", updateNavigator);
    };
  }, []);

  return state;
}

