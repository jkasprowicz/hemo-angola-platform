import React from "react";
import { Alert, AppShell, Box, Burger, Button, Group, NavLink, Stack, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconChartBar, IconCloudUpload, IconClipboardList, IconFileSearch, IconHome2, IconListDetails, IconStethoscope } from "@tabler/icons-react";
import { useEffect } from "react";
import { NavLink as RouterNavLink, Outlet, useLocation } from "react-router-dom";

import { HemoDataBrand } from "../../components/brand/HemoDataBrand";
import { ContextBar } from "../../features/context/components/ContextBar";
import { OfflineBanner } from "../../components/shared/OfflineBanner";
import { useConnectivity } from "../../hooks/useConnectivity";
import { useLogoutAction } from "../../hooks/useLogoutAction";
import { useSyncStore } from "../../lib/sync/syncStore";
import type { BootstrapPayload } from "../../types/submission";


export function AppShellLayout({ bootstrap }: { bootstrap: BootstrapPayload }) {
  const [opened, { toggle, close }] = useDisclosure();
  const isCompactHeader = useMediaQuery("(max-width: 48em)") ?? false;
  const location = useLocation();
  const connectivity = useConnectivity();
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const { logoutError, logoutMutation } = useLogoutAction();

  useEffect(() => {
    if (!opened) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, opened]);

  useEffect(() => {
    close();
  }, [close, location.pathname]);

  const handleNavClick = () => {
    close();
  };

  return (
    <AppShell
      header={{ height: isCompactHeader ? 64 : 72 }}
      navbar={{
        width: 280,
        breakpoint: "md",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header px="md" py={isCompactHeader ? "xs" : "md"}>
        <Group justify="space-between" align="center" wrap="nowrap" style={{ minHeight: "100%" }}>
          <Group
            gap={isCompactHeader ? "xs" : "sm"}
            wrap="nowrap"
            align="center"
            style={{ flex: "1 1 auto", minWidth: 0 }}
          >
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
              aria-label={opened ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            />
            <Box style={{ minWidth: 0 }}>
              <HemoDataBrand variant="compact" showSubtitle={!isCompactHeader} />
            </Box>
          </Group>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            loading={logoutMutation.isPending}
            disabled={logoutMutation.isPending}
            style={{ flexShrink: 0 }}
          >
            Sair
          </Button>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack gap="xs">
          <NavLink
            component={RouterNavLink}
            to="/inicio"
            active={location.pathname === "/inicio" || location.pathname === "/"}
            label="Início"
            leftSection={<IconHome2 size={18} />}
            onClick={handleNavClick}
          />
          <NavLink
            component={RouterNavLink}
            to="/coleta"
            active={location.pathname === "/coleta" || location.pathname.startsWith("/coleta/")}
            label="Coleta"
            leftSection={<IconClipboardList size={18} />}
            onClick={handleNavClick}
          />
          <NavLink
            component={RouterNavLink}
            to="/registros"
            active={location.pathname === "/registros" || location.pathname.startsWith("/registros/")}
            label="Registros"
            leftSection={<IconListDetails size={18} />}
            onClick={handleNavClick}
          />
          <NavLink
            component={RouterNavLink}
            to="/sincronizacao"
            active={location.pathname === "/sincronizacao"}
            label="Sincronização"
            leftSection={<IconCloudUpload size={18} />}
            rightSection={pendingCount > 0 ? <Text size="xs">{pendingCount}</Text> : null}
            onClick={handleNavClick}
          />
          <NavLink
            component={RouterNavLink}
            to="/dashboard"
            active={location.pathname === "/dashboard"}
            label="Dashboard"
            leftSection={<IconChartBar size={18} />}
            onClick={handleNavClick}
          />
          <NavLink
            component={RouterNavLink}
            to="/diagnostico"
            active={location.pathname === "/diagnostico"}
            label="Diagnóstico"
            leftSection={<IconStethoscope size={18} />}
            onClick={handleNavClick}
          />
          {["admin", "manager"].includes(bootstrap.user.role) ? (
            <NavLink
              component={RouterNavLink}
              to="/auditoria"
              active={location.pathname === "/auditoria"}
              label="Auditoria"
              leftSection={<IconFileSearch size={18} />}
              onClick={handleNavClick}
            />
          ) : null}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Stack gap="md">
          <OfflineBanner online={connectivity.isEffectivelyOnline} pendingCount={pendingCount} />
          {logoutError ? <Alert color="red">{logoutError}</Alert> : null}
          <ContextBar bootstrap={bootstrap} />
          <Outlet />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
