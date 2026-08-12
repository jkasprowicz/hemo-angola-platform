import { Alert, Button, Card, Group, Stack, Table, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CollectionStatusBadge, SyncStatusBadge } from "../../../components/shared/StatusBadge";
import { PageHeader } from "../../../components/shared/PageHeader";
import { useBootstrap } from "../../../hooks/useBootstrap";
import { useLocalDataRevision } from "../../../hooks/useLocalDataRevision";
import { useSession } from "../../../hooks/useSession";
import { runSync } from "../../../lib/sync/syncEngine";
import { getRecordCompletion } from "../../../lib/presentation/completion";
import { collectionService } from "../../collections/services/collectionService";
import { recordService } from "../../../services/recordService";
import type { LocalSubmissionRecord } from "../../../types/submission";

export function RecordsPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const localDataRevision = useLocalDataRevision();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<LocalSubmissionRecord[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const selectedPeriodFromQuery = searchParams.get("period");
  const source = searchParams.get("source");
  const selectedReportingPeriodId = selectedPeriodFromQuery
    ? Number(selectedPeriodFromQuery)
    : bootstrap.data?.reportingPeriod?.id;

  useEffect(() => {
    const load = async () => {
      const items = await recordService.listRecords({
        reportingPeriodId: selectedReportingPeriodId,
      });
      setRecords(items);
    };
    void load();
  }, [localDataRevision, selectedReportingPeriodId]);

  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [records],
  );

  const handleDelete = async (record: LocalSubmissionRecord) => {
    const confirmed = window.confirm(
      "Excluir definitivamente esta coleta deste dispositivo?\nEssa operação não pode ser desfeita.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setBusyRecordId(record.id);
      await collectionService.deleteCollection(record.id);
      setFeedbackMessage("Coleta local excluída deste dispositivo.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível excluir a coleta.");
    } finally {
      setBusyRecordId(null);
    }
  };

  const handleReopen = async (record: LocalSubmissionRecord) => {
    const confirmed = window.confirm("Reabrir esta coleta para correção?\nEla será removida da fila de envio.");
    if (!confirmed) {
      return;
    }

    try {
      setBusyRecordId(record.id);
      const reopened = await collectionService.reopenCollection(record.id);
      navigate(`/coleta/${reopened.id}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível reabrir a coleta.");
    } finally {
      setBusyRecordId(null);
    }
  };

  const handleRetrySync = async (record: LocalSubmissionRecord) => {
    try {
      setBusyRecordId(record.id);
      await runSync([record.id]);
      setFeedbackMessage("Tentativa de envio executada.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível reenviar a coleta.");
    } finally {
      setBusyRecordId(null);
    }
  };

  return (
    <Stack gap="md">
      <PageHeader title="Registros" description="Cada linha representa uma coleta real do período demonstrativo." />
      {feedbackMessage ? <Alert color="blue">{feedbackMessage}</Alert> : null}
      {source === "dashboard" ? (
        <Alert color="gray" variant="light">
          Exibindo registros locais filtrados pelo período selecionado no dashboard. O painel analítico usa dados recebidos no servidor; nem todo registro sincronizado permanece disponível neste dispositivo.
        </Alert>
      ) : null}
      <Card withBorder radius="md">
        <Table striped highlightOnHover visibleFrom="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Período</Table.Th>
              <Table.Th>Data</Table.Th>
              <Table.Th>Unidade</Table.Th>
              <Table.Th>Status da coleta</Table.Th>
              <Table.Th>Completude</Table.Th>
              <Table.Th>Status de envio</Table.Th>
              <Table.Th>Versão</Table.Th>
              <Table.Th>Última alteração</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedRecords.map((record) => (
              <Table.Tr key={record.id}>
                <Table.Td>{record.reportingPeriodLabel}</Table.Td>
                <Table.Td>{formatDate(record.collectionDate)}</Table.Td>
                <Table.Td>{bootstrap.data?.unit?.name ?? "Unidade demonstrativa"}</Table.Td>
                <Table.Td>
                  <CollectionStatusBadge status={record.collectionStatus} />
                </Table.Td>
                <Table.Td>{getRecordCompletion(record).overallCompletionPercentage}%</Table.Td>
                <Table.Td>
                  <SyncStatusBadge status={record.syncStatus} />
                </Table.Td>
                <Table.Td>{record.versionNumber > 0 ? record.versionNumber : "Rascunho"}</Table.Td>
                <Table.Td>{new Date(record.updatedAt).toLocaleString("pt-BR")}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {record.collectionStatus === "in_progress" || record.collectionStatus === "ready_for_review" ? (
                      <>
                        <Button size="xs" onClick={() => navigate(`/coleta/${record.id}`)}>
                          Continuar
                        </Button>
                        <Button size="xs" variant="light" onClick={() => navigate(`/registros/${record.id}`)}>
                          Ver
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => void handleDelete(record)}
                          loading={busyRecordId === record.id}
                          disabled={busyRecordId !== null}
                        >
                          Excluir
                        </Button>
                      </>
                    ) : null}
                    {record.collectionStatus === "closed" && record.syncStatus === "pending" ? (
                      <>
                        <Button size="xs" variant="light" onClick={() => navigate(`/registros/${record.id}`)}>
                          Ver
                        </Button>
                        <Button size="xs" onClick={() => void handleRetrySync(record)} loading={busyRecordId === record.id} disabled={busyRecordId !== null}>
                          Enviar
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => void handleReopen(record)}
                          loading={busyRecordId === record.id}
                          disabled={busyRecordId !== null}
                        >
                          Reabrir
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => void handleDelete(record)}
                          loading={busyRecordId === record.id}
                          disabled={busyRecordId !== null}
                        >
                          Excluir
                        </Button>
                      </>
                    ) : null}
                    {record.collectionStatus === "closed" && record.syncStatus === "error" ? (
                      <>
                        <Button size="xs" variant="light" onClick={() => navigate(`/registros/${record.id}`)}>
                          Ver
                        </Button>
                        <Button size="xs" onClick={() => void handleRetrySync(record)} loading={busyRecordId === record.id} disabled={busyRecordId !== null}>
                          Tentar novamente
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => void handleReopen(record)}
                          loading={busyRecordId === record.id}
                          disabled={busyRecordId !== null}
                        >
                          Reabrir
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => void handleDelete(record)}
                          loading={busyRecordId === record.id}
                          disabled={busyRecordId !== null}
                        >
                          Excluir local
                        </Button>
                      </>
                    ) : null}
                    {(record.collectionStatus === "received" ||
                      record.collectionStatus === "accepted" ||
                      record.collectionStatus === "rejected") ? (
                      <Button size="xs" variant="light" onClick={() => navigate(`/registros/${record.id}`)}>
                        Ver
                      </Button>
                    ) : null}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Stack gap="sm" hiddenFrom="md">
          {sortedRecords.map((record) => (
            <Card key={record.id} withBorder radius="md" p="sm">
              <Stack gap="xs">
                <Text fw={600}>{record.reportingPeriodLabel}</Text>
                <Text size="sm">{formatDate(record.collectionDate)}</Text>
                <Text size="sm" c="dimmed">
                  {bootstrap.data?.unit?.name ?? "Unidade demonstrativa"}
                </Text>
                <Group gap="xs">
                  <CollectionStatusBadge status={record.collectionStatus} />
                  <SyncStatusBadge status={record.syncStatus} />
                </Group>
                <Text size="sm">Completude: {getRecordCompletion(record).overallCompletionPercentage}%</Text>
                <Text size="sm">Versão: {record.versionNumber > 0 ? record.versionNumber : "Rascunho"}</Text>
                <Text size="sm">Atualizado em: {new Date(record.updatedAt).toLocaleString("pt-BR")}</Text>
                <Group gap="xs" wrap="wrap">
                  <Button size="xs" variant="light" onClick={() => navigate(`/registros/${record.id}`)}>
                    Ver detalhes
                  </Button>
                  {(record.collectionStatus === "in_progress" || record.collectionStatus === "ready_for_review") ? (
                    <Button size="xs" onClick={() => navigate(`/coleta/${record.id}`)}>
                      Continuar
                    </Button>
                  ) : null}
                  {record.collectionStatus === "closed" && (record.syncStatus === "pending" || record.syncStatus === "error") ? (
                    <Button size="xs" onClick={() => void handleRetrySync(record)} loading={busyRecordId === record.id} disabled={busyRecordId !== null}>
                      Enviar
                    </Button>
                  ) : null}
                </Group>
              </Stack>
            </Card>
          ))}
        </Stack>
        {sortedRecords.length === 0 ? (
          <Text c="dimmed" mt="md">
            Nenhuma coleta disponível neste dispositivo para o filtro atual.
          </Text>
        ) : null}
      </Card>
    </Stack>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Data não informada";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
