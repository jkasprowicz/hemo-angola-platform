import { Alert, Button, Container, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { authService } from "../../../services/authService";

const demoUsername = import.meta.env.VITE_DEMO_USERNAME ?? "operador";
const demoCredentialsHint = import.meta.env.VITE_DEMO_CREDENTIALS_HINT ?? "";


export function LoginPage() {
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
    <Container size={420} py="xl">
      <Paper withBorder radius="md" p="xl">
        <Stack gap="md">
          <div>
            <Text size="xs" tt="uppercase" c="blue" fw={700}>
              HEMO-ANGOLA
            </Text>
            <Title order={1}>Entrar</Title>
            <Text c="dimmed" size="sm">
              Use a conta demonstrativa para validar o fluxo operacional crítico.
            </Text>
          </div>

          {errorMessage ? <Alert color="red">{errorMessage}</Alert> : null}

          <form
            onSubmit={form.onSubmit((values) => {
              setErrorMessage(null);
              loginMutation.mutate(values);
            })}
          >
            <Stack gap="sm">
              <TextInput label="Usuário" placeholder={demoUsername} {...form.getInputProps("username")} />
              <PasswordInput label="Senha" placeholder="Sua senha" {...form.getInputProps("password")} />
              <Button type="submit" loading={loginMutation.isPending}>
                Entrar
              </Button>
            </Stack>
          </form>

          {demoCredentialsHint ? <Alert color="gray" variant="light">{demoCredentialsHint}</Alert> : null}
        </Stack>
      </Paper>
    </Container>
  );
}
