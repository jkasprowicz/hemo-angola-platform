import { Alert, Button, Card, Group, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PageHeader } from "../components/shared/PageHeader";
import { CollectionStatusBadge, SyncStatusBadge } from "../components/shared/StatusBadge";
import { submissionLocalRepository } from "../repositories/local/submissionLocalRepository";
import { useSyncStore } from "../lib/sync/syncStore";
import { useLocalDataRevision } from "../hooks/useLocalDataRevision";
import { useBootstrap } from "../hooks/useBootstrap";
import { useSession } from "../hooks/useSession";
import { useConnectivity } from "../hooks/useConnectivity";
import { collectionService } from "../features/collections/services/collectionService";
import { getRecordCompletion } from "../lib/presentation/completion";
import type { LocalSubmissionRecord } from "../types/submission";

export function HomePage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const connectivity = useConnectivity();
  const localDataRevision = useLocalDataRevision();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeRecord, setActiveRecord] = useState<LocalSubmissionRecord | null>(null);
  const [periodRecords, setPeriodRecords] = useState<LocalSubmissionRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);

  const selectedPeriod = useMemo(() => {
    if (!bootstrap.data || !selectedMonth || !selectedYear) {
      return bootstrap.data?.reportingPeriod ?? null;
    }

    return (
      bootstrap.data.reportingPeriods.find(
        (period) =>
          String(period.reference_month) === selectedMonth && String(period.reference_year) === selectedYear,
      ) ?? null
    );
  }, [bootstrap.data, selectedMonth, selectedYear]);

  useEffect(() => {
    if (searchParams.get("saved")) {
      setFeedbackMessage("Coleta salva neste dispositivo.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!bootstrap.data?.reportingPeriod) {
      return;
    }

    setSelectedMonth(String(bootstrap.data.reportingPeriod.reference_month));
    setSelectedYear(String(bootstrap.data.reportingPeriod.reference_year));
  }, [bootstrap.data?.reportingPeriod]);

  useEffect(() => {
    const load = async () => {
      if (!bootstrap.data?.unit || !selectedPeriod) {
        return;
      }

      const [active, records] = await Promise.all([
        collectionService.getActiveCollection(bootstrap.data, selectedPeriod),
        submissionLocalRepository.listRecords({
          reportingPeriodId: selectedPeriod.id,
        }),
      ]);

      setActiveRecord(active);
      setPeriodRecords(records);
      setPendingCount(records.filter((record) => record.collectionStatus === "closed" && ["pending", "error"].includes(record.syncStatus)).length);
    };
    void load();
  }, [bootstrap.data, localDataRevision, selectedPeriod]);

  const completeness = useMemo(() => getRecordCompletion(activeRecord).overallCompletionPercentage, [activeRecord]);
  const activeDraftCount = useMemo(
    () =>
      periodRecords.filter((record) => record.collectionStatus === "in_progress" || record.collectionStatus === "ready_for_review")
        .length,
    [periodRecords],
  );
  const periodRecordCount = periodRecords.length;
  const yearOptions = useMemo(
    () =>
      [...new Set((bootstrap.data?.reportingPeriods ?? []).map((period) => String(period.reference_year)))].map((year) => ({
        value: year,
        label: year,
      })),
    [bootstrap.data?.reportingPeriods],
  );
  const monthOptions = useMemo(
    () => {
      const seenMonths = new Set<string>();
      return (bootstrap.data?.reportingPeriods ?? [])
        .filter((period) => (selectedYear ? String(period.reference_year) === selectedYear : true))
        .sort((left, right) => left.reference_month - right.reference_month)
        .filter((period) => {
          const value = String(period.reference_month);
          if (seenMonths.has(value)) {
            return false;
          }
          seenMonths.add(value);
          return true;
        })
        .map((period) => ({
          value: String(period.reference_month),
          label: period.label.split("/")[0],
        }));
    },
    [bootstrap.data?.reportingPeriods, selectedYear],
  );

  const handleStartCollection = async () => {
    if (!bootstrap.data || !selectedPeriod) {
      return;
    }

    setFeedbackMessage(null);
    setIsStarting(true);
    try {
      const created = await collectionService.startCollection(bootstrap.data, bootstrap.data.catalog, selectedPeriod);
      navigate(`/coleta/${created.id}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível iniciar a coleta.");
    } finally {
      setIsStarting(false);
    }
  };

  if (!bootstrap.data) {
    return null;
  }

  return (
    <Stack gap="md">
      <PageHeader
        title="Início"
        description="Resumo operacional do período demonstrativo, com foco em iniciar, continuar e enviar coletas."
      />

      {feedbackMessage ? <Alert color="yellow">{feedbackMessage}</Alert> : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard title="Unidade" value={bootstrap.data.unit?.name ?? "Não definida"} />
        <MetricCard title="Período" value={selectedPeriod?.label ?? "Não definido"} />
        <MetricCard title="Conectividade" value={connectivity.isEffectivelyOnline ? "Online" : "Offline"} />
        <MetricCard
          title="Última sincronização"
          value={lastSyncAt ? new Date(lastSyncAt).toLocaleString("pt-BR") : "Ainda não realizada"}
        />
      </SimpleGrid>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Período de referência</Text>
          {bootstrap.data.reportingPeriodPolicy ? (
            <Text size="sm" c="dimmed">
              Janela demonstrativa permitida: {new Date(bootstrap.data.reportingPeriodPolicy.minDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} até{" "}
              {new Date(bootstrap.data.reportingPeriodPolicy.maxDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}.
            </Text>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Mês"
              data={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
              allowDeselect={false}
            />
            <Select
              label="Ano"
              data={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
              allowDeselect={false}
            />
          </SimpleGrid>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Coleta atual</Text>
          <Text size="sm">{selectedPeriod?.label ?? "Período não selecionado"}</Text>
          <Text c="dimmed" size="sm">
            {periodRecordCount} coleta(s) registrada(s) neste período.
          </Text>
          {activeRecord ? (
            <>
              <Group>
                <CollectionStatusBadge status={activeRecord.collectionStatus} />
                <SyncStatusBadge status={activeRecord.syncStatus} />
              </Group>
              <Text size="sm">{activeDraftCount} coleta(s) em preenchimento.</Text>
              <Text size="sm">Data da coleta: {formatDate(activeRecord.collectionDate)}</Text>
              <Text size="sm">Completude: {completeness}%</Text>
              <Text size="sm">
                Última gravação: {new Date(activeRecord.updatedAt).toLocaleString("pt-BR")}
              </Text>
              <Group>
                <Button onClick={() => navigate(`/coleta/${activeRecord.id}`)}>Continuar</Button>
                <Button variant="light" onClick={() => void handleStartCollection()} loading={isStarting} disabled={!selectedPeriod}>
                  Iniciar nova coleta
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Text c="dimmed">Nenhuma coleta em preenchimento para {selectedPeriod?.label ?? "o período selecionado"}.</Text>
              <Button onClick={() => void handleStartCollection()} loading={isStarting} disabled={!selectedPeriod}>
                Iniciar nova coleta
              </Button>
            </>
          )}
        </Stack>
      </Card>

      {pendingCount > 0 ? (
        <Card withBorder radius="md">
          <Stack gap="sm">
            <Text fw={600}>{pendingCount} coleta(s) aguardando envio</Text>
            <Button variant="light" onClick={() => navigate("/sincronizacao")}>
              Ver sincronização
            </Button>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Data não informada";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card withBorder radius="md">
      <Text size="sm" c="dimmed">
        {title}
      </Text>
      <Text fw={700} size="xl">
        {value}
      </Text>
    </Card>
  );
}
