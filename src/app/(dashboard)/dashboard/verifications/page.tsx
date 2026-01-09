"use client";

import {
  Title,
  Text,
  Card,
  Table,
  Group,
  Avatar,
  Badge,
  Alert,
  Stack,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GradientButton } from "@/components/ui/GradientButton";
import { OutlineGradientButton } from "@/components/ui/OutlineGradientButton";

interface PendingProvider {
  id: string;
  userId: string;
  bio: string | null;
  isAvailable: boolean;
  verifiedAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  services: {
    serviceType: {
      id: string;
      name: string;
    };
  }[];
  createdAt: Date;
}

async function fetchPendingProviders(): Promise<PendingProvider[]> {
  const res = await fetch("/api/admin/verifications");
  if (!res.ok) throw new Error("Failed to fetch verifications");
  return res.json();
}

export default function AdminVerificationsPage() {
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading, error } = useQuery({
    queryKey: ["admin", "verifications"],
    queryFn: fetchPendingProviders,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ providerId, approved }: { providerId: string; approved: boolean }) => {
      const res = await fetch(`/api/admin/verifications/${providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error("Failed to update verification");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
  });

  return (
    <>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Provider Verifications</Title>
          <Text c="dimmed" size="sm">
            Review and approve provider verification requests
          </Text>
        </div>
        <Badge size="lg" variant="light" color="yellow">
          {providers.length} Pending
        </Badge>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          Failed to load verifications. Please try again.
        </Alert>
      )}

      <Card withBorder radius="md">
        <Table.ScrollContainer minWidth={600}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Provider</Table.Th>
                <Table.Th>Services</Table.Th>
                <Table.Th>Bio</Table.Th>
                <Table.Th>Applied</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={5} ta="center" py="xl">
                    <Text c="dimmed">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : providers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} ta="center" py="xl">
                    <Stack align="center" gap="xs">
                      <IconCheck size={32} color="var(--mantine-color-green-6)" />
                      <Text c="dimmed">No pending verifications</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                providers.map((provider) => (
                  <Table.Tr key={provider.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar color="yellow" radius="xl">
                          {provider.user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text size="sm" fw={500}>
                            {provider.user.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {provider.user.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {provider.services.map((s) => (
                          <Badge key={s.serviceType.id} size="sm" variant="light">
                            {s.serviceType.name}
                          </Badge>
                        ))}
                        {provider.services.length === 0 && (
                          <Text size="sm" c="dimmed">None</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>
                        {provider.bio || "No bio provided"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(provider.createdAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <GradientButton
                          size="xs"
                          leftSection={<IconCheck size={14} />}
                          loading={verifyMutation.isPending}
                          onClick={() => verifyMutation.mutate({ providerId: provider.id, approved: true })}
                        >
                          Approve
                        </GradientButton>
                        <OutlineGradientButton
                          size="xs"
                          leftSection={<IconX size={14} />}
                          onClick={() => verifyMutation.mutate({ providerId: provider.id, approved: false })}
                        >
                          Reject
                        </OutlineGradientButton>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </>
  );
}
