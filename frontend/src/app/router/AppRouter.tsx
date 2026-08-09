import { Center, Loader } from "@mantine/core";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShellLayout } from "../layout/AppShellLayout";
import { DashboardLayout } from "../layout/DashboardLayout";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { useSession } from "../../hooks/useSession";
import { useBootstrap } from "../../hooks/useBootstrap";
import { HomePage } from "../../routes/HomePage";
import { CollectionPage } from "../../features/collections/pages/CollectionPage";
import { RecordsPage } from "../../features/records/pages/RecordsPage";
import { RecordDetailPage } from "../../features/records/pages/RecordDetailPage";
import { SyncPage } from "../../features/synchronization/pages/SyncPage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { DiagnosticPage } from "../../routes/DiagnosticPage";
import { AuditPage } from "../../routes/AuditPage";
import { initializeIndexedDb } from "../../lib/storage/indexedDb";
import { hydrateSyncMeta } from "../../lib/sync/syncEngine";


function ProtectedLayout({ variant }: { variant: "app" | "dashboard" }) {
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const bootstrap = useBootstrap(authenticated);

  useEffect(() => {
    void initializeIndexedDb();
    void hydrateSyncMeta();
  }, []);

  if (session.isLoading || bootstrap.isLoading) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!bootstrap.data) {
    return <Navigate to="/login" replace />;
  }

  if (variant === "dashboard") {
    return <DashboardLayout bootstrap={bootstrap.data} />;
  }

  return <AppShellLayout bootstrap={bootstrap.data} />;
}


export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout variant="app" />}>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/coleta" element={<CollectionPage />} />
          <Route path="/coleta/:recordId" element={<CollectionPage />} />
          <Route path="/registros" element={<RecordsPage />} />
          <Route path="/registros/:recordId" element={<RecordDetailPage />} />
          <Route path="/sincronizacao" element={<SyncPage />} />
          <Route path="/diagnostico" element={<DiagnosticPage />} />
          <Route path="/auditoria" element={<AuditPage />} />
        </Route>
        <Route element={<ProtectedLayout variant="dashboard" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
