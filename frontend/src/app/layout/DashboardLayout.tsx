import React from "react";
import { Alert, AppShell, Box, Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { Outlet, useNavigate } from "react-router-dom";

import { useLogoutAction } from "../../hooks/useLogoutAction";
import type { BootstrapPayload } from "../../types/submission";


export function DashboardLayout({ bootstrap }: { bootstrap: BootstrapPayload }) {
  const navigate = useNavigate();
  const { logoutError, logoutMutation } = useLogoutAction();

  return (
    <AppShell header={{ height: 88 }} padding={{ base: "md", lg: "lg" }}>
      <AppShell.Header px="md" py="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Text fw={700}>HEMO-ANGOLA</Text>
            <Text component="h1" size="lg" fw={600}>
              Dashboard de Indicadores Hemoterápicos
            </Text>
            <Text size="sm" c="dimmed">
              {bootstrap.unit?.name ?? "Unidade não definida"}
            </Text>
          </Stack>
          <Group>
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate("/inicio")}
            >
              Voltar ao sistema
            </Button>
            <Button
              variant="subtle"
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
              disabled={logoutMutation.isPending}
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
