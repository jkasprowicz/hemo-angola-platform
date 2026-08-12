import { Alert, Badge, Box, Button, Container, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { HemoDataBrand } from "../../../components/brand/HemoDataBrand";
import { authService } from "../../../services/authService";

const demoUsername = import.meta.env.VITE_DEMO_USERNAME ?? "operador";
const demoCredentialsHint = import.meta.env.VITE_DEMO_CREDENTIALS_HINT ?? "";


export function LoginPage() {
  const isMobileLayout = useMediaQuery("(max-width: 48em)");
  const form = useForm({
    initialValues: { username: demoUsername, password: "" },
    validate: {
      username: (value) => (value.trim().length < 3 ? "Informe o usuário." : null),
      password: (value) => (value.trim().length < 3 ? "Informe a senha." : null),
    },
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (values: typeof form.values) => authService.login(values.username, values.password),
    onSuccess: async () => {
      const session = await queryClient.fetchQuery({
        queryKey: ["session"],
        queryFn: () => authService.getSession(),
        staleTime: 0,
      });

      if (!session.authenticated) {
        setErrorMessage("Não foi possível confirmar a sessão autenticada.");
        return;
      }

      await queryClient.fetchQuery({
        queryKey: ["bootstrap"],
        queryFn: () => authService.getBootstrap(),
        staleTime: 0,
      });
      navigate("/");
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    },
  });

  return (
    <Box mih="100vh" py={{ base: "xl", md: 80 }} px="md">
      <Container size={520}>
        <Paper
          withBorder
          radius="xl"
          p={{ base: "lg", sm: "xl" }}
          shadow="sm"
          style={{
            marginInline: "auto",
            width: "100%",
            maxWidth: 520,
            background:
              "linear-gradient(180deg, rgba(244,251,252,0.98) 0%, rgba(255,255,255,0.99) 22%, rgba(255,255,255,1) 100%)",
            borderColor: "#d9edf2",
          }}
        >
          <Stack gap="lg">
            <Stack gap="sm" align={isMobileLayout ? "stretch" : "center"}>
              <HemoDataBrand variant="default" />
              <Text component="h1" fw={700} size="xl" ta={isMobileLayout ? "left" : "center"}>
                Entrar
              </Text>
              <Text c="dimmed" size="sm" ta={isMobileLayout ? "left" : "center"}>
                Use suas credenciais para acessar a plataforma.
              </Text>
              <Badge variant="light" color="gray" radius="sm" w="fit-content">
                Ambiente demonstrativo
              </Badge>
            </Stack>

            {errorMessage ? <Alert color="red">{errorMessage}</Alert> : null}

            <form
              onSubmit={form.onSubmit((values) => {
                setErrorMessage(null);
                loginMutation.mutate(values);
              })}
            >
              <Stack gap="sm">
                <TextInput
                  label="Usuário"
                  placeholder={demoUsername}
                  size="md"
                  radius="md"
                  {...form.getInputProps("username")}
                />
                <PasswordInput
                  label="Senha"
                  placeholder="Sua senha"
                  size="md"
                  radius="md"
                  {...form.getInputProps("password")}
                />
                <Button type="submit" size="md" radius="md" loading={loginMutation.isPending} fullWidth>
                  Entrar
                </Button>
              </Stack>
            </form>

            {demoCredentialsHint ? <Alert color="gray" variant="light">{demoCredentialsHint}</Alert> : null}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
