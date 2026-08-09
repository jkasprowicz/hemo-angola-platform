import { Card, Code, List, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { PageHeader } from "../components/shared/PageHeader";
import { httpClient } from "../lib/api/httpClient";


type HealthPayload = {
  status: string;
  database: string;
  authentication: string;
  csrf: string;
  pipeline: string[];
};


export function DiagnosticPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    void httpClient.get<HealthPayload>("/api/health/").then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <Stack gap="md">
      <PageHeader title="Diagnóstico" description="Área técnica da Sprint 0 mantida fora da home principal." />
      <Card withBorder radius="md">
        <Stack>
          <Text fw={600}>Saúde do backend</Text>
          <Code block>{JSON.stringify(health, null, 2)}</Code>
        </Stack>
      </Card>
      <Card withBorder radius="md">
        <Text fw={600}>Pipeline preservado</Text>
        <List mt="sm">
          <List.Item>submission</List.Item>
          <List.Item>validation</List.Item>
          <List.Item>accepted data</List.Item>
          <List.Item>consolidation</List.Item>
          <List.Item>dashboard</List.Item>
        </List>
      </Card>
    </Stack>
  );
}

