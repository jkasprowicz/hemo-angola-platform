import { Stack, Text, Title } from "@mantine/core";


export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Stack gap={4}>
      <Title order={2}>{title}</Title>
      {description ? <Text c="dimmed">{description}</Text> : null}
    </Stack>
  );
}

