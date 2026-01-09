"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Stack,
  Anchor,
  Center,
  Box,
  Alert,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { IconMail, IconLock, IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/schemas";
import { GradientButton } from "@/components/ui/GradientButton";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: "",
    },
    validate: zodResolver(loginSchema),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        return;
      }

      // Redirect based on role
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper radius="lg" p="xl" withBorder shadow="xl">
      <Center mb="lg">
        <Box>
          <Title
            order={1}
            ta="center"
            style={{
              background: "linear-gradient(135deg, #FFD700, #FF8C00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            IKAG
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            Marketplace
          </Text>
        </Box>
      </Center>

      <Title c="gray" order={2} ta="center" mb="md">
        Welcome back
      </Title>

      <Text c="gray" size="sm" ta="center" mb="xl">
        Sign in to your account to continue
      </Text>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          variant="light"
        >
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Email"
            placeholder="you@example.com"
            leftSection={<IconMail size={16} />}
            key={form.key("email")}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            leftSection={<IconLock size={16} />}
            key={form.key("password")}
            {...form.getInputProps("password")}
          />

          <GradientButton type="submit" fullWidth loading={loading} mt="md">
            Sign in
          </GradientButton>
        </Stack>
      </form>

      <Text c="dimmed" size="sm" ta="center" mt="xl">
        Don&apos;t have an account?{" "}
        <Anchor component={Link} href="/register" fw={500}>
          Sign up
        </Anchor>
      </Text>
    </Paper>
  );
}
