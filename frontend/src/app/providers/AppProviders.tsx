import "@mantine/core/styles.css";
import "../styles/global.css";

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

import { AppRouter } from "../router/AppRouter";


export function AppProviders() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={{
          primaryColor: "cyan",
          defaultRadius: "md",
          fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
        }}
      >
        <AppRouter />
      </MantineProvider>
    </QueryClientProvider>
  );
}
