import React from "react";
import { Alert, AppShell, Box, Button, Group, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import { Outlet, useNavigate } from "react-router-dom";

import { HemoDataBrand } from "../../components/brand/HemoDataBrand";
import { useLogoutAction } from "../../hooks/useLogoutAction";
import type { BootstrapPayload } from "../../types/submission";

const headerActionStyles = {
  root: {
    paddingInline: "14px",
    paddingBlock: "9px",
    borderRadius: "9px",
    minHeight: 44,
    transition: "background-color 120ms ease, outline-color 120ms ease",
  },
  label: {
    color: "var(--mantine-color-cyan-7)",
  },
} as const;


export function DashboardLayout({ bootstrap: _bootstrap }: { bootstrap: BootstrapPayload }) {
  const navigate = useNavigate();
  const { logoutError, logoutMutation } = useLogoutAction();
  const isMobileLayout = useMediaQuery("(max-width: 48em)");
  void _bootstrap;

  return (
    <AppShell header={{ height: isMobileLayout ? 120 : 88 }} padding={{ base: "md", lg: "lg" }}>
      <AppShell.Header px="md" py="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <HemoDataBrand variant="compact" />
            <Text component="h1" size="lg" fw={600}>
              Dashboard de Indicadores Hemoterápicos
            </Text>
          </Stack>
          <Group
            wrap="wrap"
            gap="sm"
            justify={isMobileLayout ? "space-between" : "flex-end"}
            align="center"
            style={{
              flex: isMobileLayout ? "1 1 100%" : undefined,
              minWidth: 0,
            }}
          >
            <Button
              variant={isMobileLayout ? "subtle" : "default"}
              size={isMobileLayout ? "sm" : "md"}
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate("/inicio")}
              styles={{
                ...headerActionStyles,
                root: {
                  ...headerActionStyles.root,
                  "&:hover": {
                    backgroundColor: "var(--mantine-color-cyan-0)",
                  },
                  "&:active": {
                    backgroundColor: "var(--mantine-color-cyan-1)",
                  },
                  "&:focusVisible": {
                    outline: "2px solid var(--mantine-color-cyan-3)",
                    outlineOffset: 2,
                  },
                },
              }}
              style={{
                flex: isMobileLayout ? "0 1 auto" : "0 0 auto",
                minWidth: 0,
              }}
            >
              {isMobileLayout ? "Sistema" : "Voltar ao sistema"}
            </Button>
            <Button
              variant="subtle"
              size={isMobileLayout ? "sm" : "md"}
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
              disabled={logoutMutation.isPending}
              styles={{
                ...headerActionStyles,
                root: {
                  ...headerActionStyles.root,
                  "&:hover": {
                    backgroundColor: "var(--mantine-color-cyan-0)",
                  },
                  "&:active": {
                    backgroundColor: "var(--mantine-color-cyan-1)",
                  },
                  "&:focusVisible": {
                    outline: "2px solid var(--mantine-color-cyan-3)",
                    outlineOffset: 2,
                  },
                },
              }}
              style={{
                flex: isMobileLayout ? "0 0 auto" : "0 0 auto",
                minWidth: 0,
              }}
            >
              Sair
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Box maw={1440} mx="auto" w="100%">
          <Stack gap="lg">
            {logoutError ? <Alert color="red">{logoutError}</Alert> : null}
            <Outlet />
          </Stack>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
