import { Group, Stack, Text } from "@mantine/core";

type HemoDataBrandProps = {
  variant?: "compact" | "default";
  showSubtitle?: boolean;
};

export function HemoDataBrand({
  variant = "default",
  showSubtitle = true,
}: HemoDataBrandProps) {
  const compact = variant === "compact";
  const compactHeader = compact && !showSubtitle;

  return (
    <Group gap={compact ? "xs" : "md"} wrap="nowrap" align="center">
      <BloodDropSymbol size={compactHeader ? 28 : compact ? 34 : 48} />
      <Stack gap={compact ? 0 : 2} style={{ minWidth: 0 }}>
        <Text
          fw={800}
          size={compactHeader ? "md" : compact ? "lg" : "xl"}
          lts={compactHeader ? "0.02em" : compact ? "0.04em" : "0.08em"}
          c="cyan.8"
          style={{ lineHeight: 1, whiteSpace: "nowrap" }}
        >
          HEMO-DATA
        </Text>
        {showSubtitle ? (
          <Text size={compact ? "sm" : "md"} c="dimmed" style={{ lineHeight: 1.2 }}>
            Plataforma de Indicadores Hemoterápicos
          </Text>
        ) : null}
      </Stack>
    </Group>
  );
}

function BloodDropSymbol({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Símbolo HEMO-DATA"
      style={{ flex: "0 0 auto" }}
    >
      <path
        d="M32 6C24.1 16.4 18 24.8 18 35.7C18 45.4 24.3 53 32 53C39.7 53 46 45.4 46 35.7C46 24.8 39.9 16.4 32 6Z"
        fill="#C92A2A"
      />
    </svg>
  );
}
