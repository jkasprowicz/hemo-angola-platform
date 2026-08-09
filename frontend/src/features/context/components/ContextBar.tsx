import { Alert, Group, Paper, Stack, Text } from "@mantine/core";

import { getDisplayRole } from "../../../lib/presentation/labels";
import type { BootstrapPayload } from "../../../types/submission";


export function ContextBar({ bootstrap }: { bootstrap: BootstrapPayload }) {
  return (
    <Stack gap="sm">
      <Alert color="blue" variant="light">
        {bootstrap.demoNotice}
      </Alert>
      <Paper withBorder p="md" radius="md">
        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">
              Instituição demonstrativa
            </Text>
            <Text fw={600}>{bootstrap.institution.name}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Unidade
            </Text>
            <Text fw={600}>{bootstrap.unit?.name ?? "Não definida"}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Período de referência
            </Text>
            <Text fw={600}>{bootstrap.reportingPeriod?.label ?? "Não definido"}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Perfil
            </Text>
            <Text fw={600}>{bootstrap.user.displayRole ?? getDisplayRole(bootstrap.user.role)}</Text>
          </div>
        </Group>
      </Paper>
    </Stack>
  );
}
