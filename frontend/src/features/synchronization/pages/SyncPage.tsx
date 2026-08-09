import { Alert, Button, Card, Checkbox, Group, Stack, Table, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "../../../components/shared/PageHeader";
import { SyncStatusBadge } from "../../../components/shared/StatusBadge";
import { useBootstrap } from "../../../hooks/useBootstrap";
import { useConnectivity } from "../../../hooks/useConnectivity";
import { useSession } from "../../../hooks/useSession";
import { submissionLocalRepository } from "../../../repositories/local/submissionLocalRepository";
import { runSync } from "../../../lib/sync/syncEngine";
import { useSyncStore } from "../../../lib/sync/syncStore";
import type { LocalSubmissionRecord } from "../../../types/submission";
import { useLocalDataRevision } from "../../../hooks/useLocalDataRevision";


export function SyncPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const connectivity = useConnectivity();
  const [records, setRecords] = useState<LocalSubmissionRecord[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const syncStore = useSyncStore();
  const localDataRevision = useLocalDataRevision();

  useEffect(() => {
    const load = async () => {
      const items = await submissionLocalRepository.listRecords();
      setRecords(items);
    };
    void load();
  }, [localDataRevision, syncStore.pendingCount, syncStore.lastSyncAt]);

  const pendingRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.collectionStatus === "closed" &&
          (record.syncStatus === "pending" || record.syncStatus === "error"),
      ),
    [records],
  );

  const syncHistory = useMemo(
    () =>
      records
        .flatMap((record) =>
          record.eventHistory
            .filter((event) => event.type === "sync_succeeded" || event.type === "sync_failed")
            .map((event) => ({
              recordId: record.id,
              period: record.reportingPeriodLabel,
              result: event.label,
              occurredAt: event.occurredAt,
            })),
        )
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, 10),
    [records],
  );

  const allSelected = pendingRecords.length > 0 && pendingRecords.every((record) => selectedRecordIds.includes(record.id));

  const toggleRecordSelection = (recordId: string, checked: boolean) => {
    setSelectedRecordIds((current) =>
      checked ? [...new Set([...current, recordId])] : current.filter((item) => item !== recordId),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRecordIds(checked ? pendingRecords.map((record) => record.id) : []);
  };

  const handleSyncSelected = async () => {
    if (!connectivity.isEffectivelyOnline) {
      syncStore.setLastError("Não foi possível sincronizar os dados. Verifique a conexão e tente novamente.");
      return;
    }
    await runSync(selectedRecordIds);
    setSelectedRecordIds([]);
  };

  return (
    <Stack gap="md">
      <PageHeader
        title="Sincronização"
        description="Envie manualmente apenas as coletas fechadas e acompanhe o histórico recente."
      />
      <Card withBorder radius="md">
        <Stack gap="xs">
          <Text>Conexão: {connectivity.isEffectivelyOnline ? "Online" : "Offline"}</Text>
          <Text>Coletas elegíveis para envio: {pendingRecords.length}</Text>
          <Text>
            Última sincronização: {syncStore.lastSyncAt ? new Date(syncStore.lastSyncAt).toLocaleString("pt-BR") : "Ainda não realizada"}
          </Text>
          {!connectivity.isEffectivelyOnline ? (
            <Alert color="orange" variant="light">
              A sincronização exige conexão ativa. As coletas continuarão salvas neste dispositivo até novo envio.
            </Alert>
          ) : null}
          <Group>
            <Checkbox
              label="Selecionar todos"
              checked={allSelected}
              indeterminate={selectedRecordIds.length > 0 && !allSelected}
              onChange={(event) => handleSelectAll(event.currentTarget.checked)}
            />
            <Button
              onClick={() => void handleSyncSelected()}
              loading={syncStore.isSyncing}
              disabled={selectedRecordIds.length === 0 || !connectivity.isEffectivelyOnline}
            >
              Sincronizar selecionados
            </Button>
          </Group>
          {syncStore.lastError ? <Alert color="red">{syncStore.lastError}</Alert> : null}
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Pendentes de envio</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Período</Table.Th>
                <Table.Th>Unidade</Table.Th>
                <Table.Th>Versão</Table.Th>
                <Table.Th>Status de envio</Table.Th>
                <Table.Th>Última tentativa</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pendingRecords.map((record) => (
                <Table.Tr key={record.id}>
                  <Table.Td>
                    <Checkbox
                      checked={selectedRecordIds.includes(record.id)}
                      onChange={(event) => toggleRecordSelection(record.id, event.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>{record.reportingPeriodLabel}</Table.Td>
                  <Table.Td>{bootstrap.data?.unit?.name ?? "Unidade demonstrativa"}</Table.Td>
                  <Table.Td>{record.versionNumber || 1}</Table.Td>
                  <Table.Td>
                    <SyncStatusBadge status={record.syncStatus} />
                  </Table.Td>
                  <Table.Td>
                    {record.lastSyncAttemptAt ? new Date(record.lastSyncAttemptAt).toLocaleString("pt-BR") : "Ainda não tentado"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {pendingRecords.length === 0 ? <Text c="dimmed">Nenhuma coleta fechada aguardando envio.</Text> : null}
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Histórico recente</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Período</Table.Th>
                <Table.Th>Resultado</Table.Th>
                <Table.Th>Data/hora</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {syncHistory.map((item) => (
                <Table.Tr key={`${item.recordId}-${item.occurredAt}`}>
                  <Table.Td>{item.period}</Table.Td>
                  <Table.Td>{item.result}</Table.Td>
                  <Table.Td>{new Date(item.occurredAt).toLocaleString("pt-BR")}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {syncHistory.length === 0 ? <Text c="dimmed">Nenhum evento recente de sincronização.</Text> : null}
        </Stack>
      </Card>
    </Stack>
  );
}
