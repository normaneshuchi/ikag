"use client";

import {
  Title,
  Text,
  Card,
  Table,
  Badge,
  Group,
  ActionIcon,
  Stack,
  Menu,
  Alert,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconDotsVertical,
  IconCheck,
  IconX,
  IconEye,
  IconClipboardList,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useSession, getUserRole } from "@/lib/auth-client";

interface ServiceRequest {
  id: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  description: string | null;
  createdAt: Date;
  user?: { name: string };
  provider?: { user: { name: string } };
  serviceType: { name: string; icon: string | null };
}

async function fetchRequests(role: string): Promise<ServiceRequest[]> {
  const endpoint = role === "provider" ? "/api/provider/requests" : "/api/user/requests";
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

const statusColors: Record<string, string> = {
  pending: "yellow",
  accepted: "blue",
  in_progress: "cyan",
  completed: "green",
  cancelled: "red",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function RequestsPage() {
  const { data: session } = useSession();
  const role = getUserRole(session?.user);

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["requests", role],
    queryFn: () => fetchRequests(role),
    enabled: !!session,
  });

  return (
    <>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>
            {role === "provider" ? "Service Requests" : "My Requests"}
          </Title>
          <Text c="dimmed" size="sm">
            {role === "provider"
              ? "Manage incoming service requests"
              : "Track your service requests"}
          </Text>
        </div>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          Failed to load requests. Please try again.
        </Alert>
      )}

      <Card withBorder radius="md">
        <Table.ScrollContainer minWidth={600}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Service</Table.Th>
                <Table.Th>{role === "provider" ? "Customer" : "Provider"}</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={6} ta="center" py="xl">
                    <Text c="dimmed">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : requests.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} ta="center" py="xl">
                    <Stack align="center" gap="xs">
                      <IconClipboardList size={32} color="var(--mantine-color-gray-5)" />
                      <Text c="dimmed">No requests yet</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                requests.map((request) => (
                  <Table.Tr key={request.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text>{request.serviceType.icon || "📦"}</Text>
                        <Text size="sm" fw={500}>
                          {request.serviceType.name}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {role === "provider"
                          ? request.user?.name || "Unknown"
                          : request.provider?.user?.name || "Pending"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {request.description || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColors[request.status]} variant="light">
                        {statusLabels[request.status]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            View Details
                          </Menu.Item>
                          {role === "provider" && request.status === "pending" && (
                            <>
                              <Menu.Item leftSection={<IconCheck size={14} />} color="green">
                                Accept
                              </Menu.Item>
                              <Menu.Item leftSection={<IconX size={14} />} color="red">
                                Decline
                              </Menu.Item>
                            </>
                          )}
                          {role === "user" && request.status === "pending" && (
                            <Menu.Item leftSection={<IconX size={14} />} color="red">
                              Cancel
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
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
