import { Alert, Button, Card, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "../../../components/shared/PageHeader";
import { CollectionForm } from "../components/CollectionForm";
import { useBootstrap } from "../../../hooks/useBootstrap";
import { useSession } from "../../../hooks/useSession";
import { collectionService } from "../services/collectionService";
import type { LocalSubmissionRecord } from "../../../types/submission";


export function CollectionPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const [record, setRecord] = useState<LocalSubmissionRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const params = useParams<{ recordId?: string }>();

  useEffect(() => {
    const load = async () => {
      if (!bootstrap.data) {
        return;
      }

      setErrorMessage(null);

      if (!params.recordId) {
        const activeCollection = await collectionService.getActiveCollection(bootstrap.data);
        setRecord(activeCollection);
        return;
      }

      const existingRecord = await collectionService.getCollection(params.recordId);
      if (!existingRecord) {
        setErrorMessage("A coleta solicitada não foi encontrada neste dispositivo.");
        setRecord(null);
        return;
      }

      setRecord(existingRecord);
    };

    void load();
  }, [bootstrap.data, params.recordId]);

  if (!bootstrap.data) {
    return null;
  }

  if (!params.recordId) {
    return (
      <Stack gap="md">
        <PageHeader
          title="Coleta"
          description="A coleta só é criada por ação explícita. Use a Home para iniciar uma nova coleta ou continuar a existente."
        />
        <Alert color="gray" variant="light">
          O instrumento abaixo é demonstrativo e não representa a matriz final de indicadores de Angola.
        </Alert>
        <Card withBorder radius="md">
          <Stack>
            <Text fw={600}>
              {record ? "Já existe uma coleta em andamento para este período." : "Nenhuma coleta iniciada neste período."}
            </Text>
            <Button onClick={() => navigate(record ? `/coleta/${record.id}` : "/")}>
              {record ? "Continuar coleta" : "Ir para a Home"}
            </Button>
          </Stack>
        </Card>
      </Stack>
    );
  }

  if (errorMessage) {
    return (
      <Stack gap="md">
        <PageHeader title="Coleta" description="Não foi possível abrir a coleta solicitada." />
        <Alert color="red">{errorMessage}</Alert>
      </Stack>
    );
  }

  if (!record) {
    return null;
  }

  return (
    <Stack gap="md">
      <PageHeader
        title="Coleta"
        description="Preenchimento demonstrativo em etapas, com salvamento automático local e fechamento controlado."
      />
      <Alert color="gray" variant="light">
        O instrumento abaixo é demonstrativo e não representa a matriz final de indicadores de Angola.
      </Alert>
      <Card withBorder radius="md">
        <Stack>
          <Text fw={600}>Referência operacional</Text>
          <Text c="dimmed">
            Preencha, revise e feche a coleta. Toda alteração relevante será salva localmente antes de qualquer sincronização.
          </Text>
        </Stack>
      </Card>
      <CollectionForm
        bootstrap={bootstrap.data}
        existingRecord={record}
        onClosed={(recordId) => navigate(`/registros/${recordId}`)}
        onSavedAndExit={(recordId) => navigate(`/?saved=${recordId}`)}
      />
    </Stack>
  );
}
