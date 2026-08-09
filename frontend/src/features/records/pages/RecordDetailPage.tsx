import { Alert, Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getVariablesForModule, getSortedModules } from "../../../domain/collection/catalogEngine";
import { CollectionStatusBadge, SyncStatusBadge } from "../../../components/shared/StatusBadge";
import { PageHeader } from "../../../components/shared/PageHeader";
import { useBootstrap } from "../../../hooks/useBootstrap";
import { useSession } from "../../../hooks/useSession";
import { getRecordCompletion } from "../../../lib/presentation/completion";
import { getCollectionStatusLabel, getSyncStatusLabel } from "../../../lib/presentation/labels";
import { recordService } from "../../../services/recordService";
import type { LocalSubmissionRecord } from "../../../types/submission";


export function RecordDetailPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const [record, setRecord] = useState<LocalSubmissionRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const params = useParams<{ recordId: string }>();

  useEffect(() => {
    const load = async () => {
      if (!params.recordId) {
        return;
      }

      const currentRecord = await recordService.getRecord(params.recordId);
      if (!currentRecord) {
        setErrorMessage("O registro solicitado não foi encontrado neste dispositivo.");
        return;
      }

      setRecord(currentRecord);
    };
    void load();
  }, [params.recordId]);

  if (!bootstrap.data) {
    return null;
  }

  if (errorMessage) {
    return (
      <Stack gap="md">
        <PageHeader title="Detalhe do registro" description="Não foi possível carregar a coleta solicitada." />
        <Alert color="red">{errorMessage}</Alert>
      </Stack>
    );
  }

  if (!record) {
    return null;
  }

  const modules = getSortedModules(bootstrap.data.catalog);

  return (
    <Stack gap="md">
      <PageHeader title="Detalhe do registro" description="Visualização completa da coleta demonstrativa." />
      <Card withBorder radius="md">
        <Stack gap="sm">
          <Group>
            <CollectionStatusBadge status={record.collectionStatus} />
            <SyncStatusBadge status={record.syncStatus} />
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <InfoItem label="ID da coleta" value={record.id} />
            <InfoItem label="Unidade" value={bootstrap.data.unit?.name ?? "Não definida"} />
            <InfoItem label="Período" value={record.reportingPeriodLabel} />
            <InfoItem label="Status da coleta" value={getCollectionStatusLabel(record.collectionStatus)} />
            <InfoItem label="Status de envio" value={getSyncStatusLabel(record.syncStatus)} />
            <InfoItem label="Completude" value={`${getRecordCompletion(record).overallCompletionPercentage}%`} />
            <InfoItem label="Versão" value={record.versionNumber > 0 ? String(record.versionNumber) : "Rascunho"} />
            <InfoItem label="Criado em" value={new Date(record.createdAt).toLocaleString("pt-BR")} />
            <InfoItem label="Atualizado em" value={new Date(record.lastSavedAt).toLocaleString("pt-BR")} />
          </SimpleGrid>
          <Group>
            {(record.collectionStatus === "in_progress" || record.collectionStatus === "ready_for_review") ? (
              <Button onClick={() => navigate(`/coleta/${record.id}`)}>Continuar edição</Button>
            ) : null}
            {record.collectionStatus === "closed" ? (
              <Button onClick={() => navigate("/sincronizacao")}>Enviar</Button>
            ) : null}
          </Group>
        </Stack>
      </Card>

      <Text fw={700}>Dados informados</Text>
      {modules.map((module) => {
        const moduleVariables = getVariablesForModule(bootstrap.data.catalog, module.code);
        const moduleIndicators = record.validationSummary.calculatedIndicators.filter(
          (indicator) => indicator.moduleCode === module.code,
        );

        return (
          <Card key={module.code} withBorder radius="md">
            <Stack gap="xs">
              <Text fw={600}>{module.name}</Text>
              {moduleVariables.map((variable) => (
                <ReviewRow
                  key={variable.code}
                  label={variable.name}
                  value={formatResponseValue(record.responses[variable.code])}
                />
              ))}
              {moduleIndicators.map((indicator) => (
                <ReviewRow
                  key={indicator.code}
                  label={indicator.name}
                  value={indicator.value === null ? "Aguardando dados válidos" : `${indicator.value} ${indicator.unit}`}
                />
              ))}
            </Stack>
          </Card>
        );
      })}

      <Card withBorder radius="md">
        <Stack gap="xs">
          <Text fw={600}>Observação geral do período</Text>
          <Text size="sm">{formatResponseValue(record.generalObservation)}</Text>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="xs">
          <Text fw={600}>Histórico</Text>
          {record.eventHistory.map((event) => (
            <Stack key={event.id} gap={2}>
              <Text fw={500}>
                {new Date(event.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — {event.actorName} — {event.label}
              </Text>
              <Text size="sm" c="dimmed">
                {event.action} · {new Date(event.occurredAt).toLocaleString("pt-BR")}
              </Text>
              {event.detail ? <Text size="sm">{event.detail}</Text> : null}
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between">
      <Text size="sm">{label}</Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Group>
  );
}

function formatResponseValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR").format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "Não informado";
}
