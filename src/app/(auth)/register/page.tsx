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
  SegmentedControl,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import {
  IconMail,
  IconLock,
  IconUser,
  IconAlertCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { registerSchema } from "@/lib/schemas";
import { GradientButton } from "@/components/ui/GradientButton";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user" as "user" | "provider",
    },
    validate: zodResolver(registerSchema),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        // @ts-expect-error - role is a custom field defined in auth config
        role: values.role,
      });

      if (result.error) {
        setError(result.error.message || "Registration failed");
        return;
      }

      // Auto sign-in after registration
      await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

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

      <Title order={2} ta="center" mb="md">
        Create an account
      </Title>

      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Join IKAG to find or offer services
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
            label="Full Name"
            placeholder="John Doe"
            leftSection={<IconUser size={16} />}
            key={form.key("name")}
            {...form.getInputProps("name")}
          />

          <TextInput
            label="Email"
            placeholder="you@example.com"
            leftSection={<IconMail size={16} />}
            key={form.key("email")}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Password"
            placeholder="At least 8 characters"
            leftSection={<IconLock size={16} />}
            key={form.key("password")}
            {...form.getInputProps("password")}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Repeat your password"
            leftSection={<IconLock size={16} />}
            key={form.key("confirmPassword")}
            {...form.getInputProps("confirmPassword")}
          />

          <Box>
            <Text size="sm" fw={500} mb="xs">
              I want to
            </Text>
            <SegmentedControl
              fullWidth
              data={[
                { label: "Find Services", value: "user" },
                { label: "Offer Services", value: "provider" },
              ]}
              key={form.key("role")}
              {...form.getInputProps("role")}
            />
          </Box>

          <GradientButton type="submit" fullWidth loading={loading} mt="md">
            Create account
          </GradientButton>
        </Stack>
      </form>

      <Text c="dimmed" size="sm" ta="center" mt="xl">
        Already have an account?{" "}
        <Anchor component={Link} href="/login" fw={500}>
          Sign in
        </Anchor>
      </Text>
    </Paper>
  );
}
