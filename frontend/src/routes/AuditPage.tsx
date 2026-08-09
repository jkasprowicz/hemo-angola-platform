import { Alert, Card, Select, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "../components/shared/PageHeader";
import { useBootstrap } from "../hooks/useBootstrap";
import { useSession } from "../hooks/useSession";
import { auditService, type AuditLogEvent } from "../services/auditService";


export function AuditPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setErrorMessage(null);
        const response = await auditService.listEvents({
          action: selectedAction ?? undefined,
          period: selectedPeriod ? Number(selectedPeriod) : undefined,
        });
        setEvents(response.events);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a auditoria.");
      }
    };
    void load();
  }, [selectedAction, selectedPeriod]);

  const actionOptions = useMemo(
    () =>
      [...new Set(events.map((event) => event.action))]
        .sort((left, right) => left.localeCompare(right))
        .map((action) => ({ value: action, label: action })),
    [events],
  );

  if (!bootstrap.data) {
    return null;
  }

  if (!["admin", "manager"].includes(bootstrap.data.user.role)) {
    return (
      <Stack gap="md">
        <PageHeader title="Auditoria" description="Acesso restrito a perfis autorizados." />
        <Alert color="yellow">Este ambiente demonstrativo restringe a auditoria administrativa a gestores e administradores.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        title="Auditoria"
        description="Trilha administrativa central de autenticação, coleta, sincronização e recebimento."
      />

      {errorMessage ? <Alert color="red">{errorMessage}</Alert> : null}

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Filtros</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              label="Ação"
              data={actionOptions}
              value={selectedAction}
              onChange={setSelectedAction}
              clearable
            />
            <Select
              label="Período"
              data={bootstrap.data.reportingPeriods.map((period) => ({ value: String(period.id), label: period.label }))}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              clearable
            />
          </SimpleGrid>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Eventos recentes</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data/hora</Table.Th>
                <Table.Th>Usuário</Table.Th>
                <Table.Th>Ação</Table.Th>
                <Table.Th>Entidade</Table.Th>
                <Table.Th>Origem</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {events.map((event) => (
                <Table.Tr key={event.id}>
                  <Table.Td>{new Date(event.timestamp).toLocaleString("pt-BR")}</Table.Td>
                  <Table.Td>{event.user_name || "Sistema"}</Table.Td>
                  <Table.Td>{event.action}</Table.Td>
                  <Table.Td>{event.entity_type}</Table.Td>
                  <Table.Td>{event.source}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {events.length === 0 ? <Text c="dimmed">Nenhum evento de auditoria encontrado para os filtros selecionados.</Text> : null}
        </Stack>
      </Card>
    </Stack>
  );
}
