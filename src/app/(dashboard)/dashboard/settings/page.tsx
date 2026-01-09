"use client";

import {
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconUser,
  IconMail,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useSession, getUserRole } from "@/lib/auth-client";
import { GradientButton } from "@/components/ui/GradientButton";
import { OutlineGradientButton } from "@/components/ui/OutlineGradientButton";

export default function SettingsPage() {
  const { data: session, refetch } = useSession();

  const form = useForm({
    initialValues: {
      name: session?.user?.name || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: { name: string }) => {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      notifications.show({
        title: "Settings saved",
        message: "Your settings have been updated",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to save settings",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    updateMutation.mutate(values);
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Settings</Title>
        <Text c="dimmed" size="sm">
          Manage your account settings
        </Text>
      </div>

      <Paper withBorder p="lg" radius="md">
        <Title order={4} mb="md">
          Profile Information
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Your name"
              leftSection={<IconUser size={16} />}
              {...form.getInputProps("name")}
            />

            <TextInput
              label="Email"
              value={session?.user?.email || ""}
              leftSection={<IconMail size={16} />}
              disabled
              description="Email cannot be changed"
            />

            <TextInput
              label="Role"
              value={getUserRole(session?.user)}
              disabled
              description="Contact support to change your role"
            />

            <Group justify="flex-end" mt="md">
              <GradientButton type="submit" loading={updateMutation.isPending}>
                Save Changes
              </GradientButton>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Title order={4} mb="md" c="red">
          Danger Zone
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Permanently delete your account and all associated data.
        </Text>
        <OutlineGradientButton color="red">
          Delete Account
        </OutlineGradientButton>
      </Paper>
    </Stack>
  );
}
