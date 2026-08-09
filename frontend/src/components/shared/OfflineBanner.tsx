import React from "react";
import { Alert, Group, Text } from "@mantine/core";


export function OfflineBanner({
  online,
  pendingCount,
}: {
  online: boolean;
  pendingCount: number;
}) {
  if (online) {
    return null;
  }

  return (
    <Alert color="orange" variant="light" title="Você está offline">
      <Group justify="space-between" align="start">
        <div>
          <Text size="sm">Seu trabalho continuará salvo neste dispositivo.</Text>
          <Text size="sm">Pendências de sincronização: {pendingCount}</Text>
        </div>
      </Group>
    </Alert>
  );
}
