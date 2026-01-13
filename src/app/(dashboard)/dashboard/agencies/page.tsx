"use client";

import { useState } from "react";
import {
  Title,
  Text,
  Card,
  Table,
  Badge,
  Group,
  ActionIcon,
  Stack,
  Button,
  Modal,
  TextInput,
  Textarea,
  Loader,
  Center,
  Avatar,
  Menu,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconDotsVertical,
  IconEye,
  IconPlus,
  IconSearch,
  IconBuilding,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, getUserRole } from "@/lib/auth-client";
import Link from "next/link";

interface Agency {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  email: string | null;
  phone: string | null;
  status: "pending" | "verified" | "suspended";
  ownerId: string;
  ownerName: string;
  memberCount: number;
  serviceCount: number;
  createdAt: string;
}

async function fetchAgencies(status?: string): Promise<Agency[]> {
  const url = status ? `/api/agencies?status=${status}` : "/api/agencies";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch agencies");
  return res.json();
}

async function createAgency(data: { name: string; description?: string; email?: string; phone?: string }): Promise<Agency> {
  const res = await fetch("/api/agencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create agency");
  }
  return res.json();
}

async function deleteAgency(id: string): Promise<void> {
  const res = await fetch(`/api/agencies/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete agency");
  }
}

const statusColors: Record<string, string> = {
  pending: "yellow",
  verified: "green",
  suspended: "red",
};

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userRole = getUserRole(session);
  const [search, setSearch] = useState("");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [formData, setFormData] = useState({ name: "", description: "", email: "", phone: "" });

  const { data: agencies, isLoading, error } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => fetchAgencies(),
    enabled: !!session?.user,
  });

  const createMutation = useMutation({
    mutationFn: createAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      closeCreateModal();
      setFormData({ name: "", description: "", email: "", phone: "" });
      notifications.show({
        title: "Success",
        message: "Agency created successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      notifications.show({
        title: "Success",
        message: "Agency deleted successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const filteredAgencies = agencies?.filter((agency) =>
    agency.name.toLowerCase().includes(search.toLowerCase()) ||
    agency.ownerName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!formData.name.trim()) {
      notifications.show({
        title: "Error",
        message: "Agency name is required",
        color: "red",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />}>
        Failed to load agencies. Please try again later.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Agencies</Title>
          <Text c="dimmed" size="sm">
            Manage service agencies and their members
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Create Agency
        </Button>
      </Group>

      <Card withBorder>
        <Stack gap="md">
          <TextInput
            placeholder="Search agencies..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {!filteredAgencies?.length ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <IconBuilding size={48} stroke={1.5} color="gray" />
                <Text c="dimmed">No agencies found</Text>
                <Button variant="light" onClick={openCreateModal}>
                  Create your first agency
                </Button>
              </Stack>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Agency</Table.Th>
                    <Table.Th>Owner</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Members</Table.Th>
                    <Table.Th>Services</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th w={50} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredAgencies.map((agency) => (
                    <Table.Tr key={agency.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar src={agency.logo} radius="sm" size="md">
                            <IconBuilding size={20} />
                          </Avatar>
                          <div>
                            <Text fw={500} size="sm">
                              {agency.name}
                            </Text>
                            {agency.email && (
                              <Text size="xs" c="dimmed">
                                {agency.email}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{agency.ownerName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={statusColors[agency.status]} variant="light">
                          {agency.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{agency.memberCount}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{agency.serviceCount}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {new Date(agency.createdAt).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              component={Link}
                              href={`/dashboard/agencies/${agency.id}`}
                              leftSection={<IconEye size={14} />}
                            >
                              View Details
                            </Menu.Item>
                            {(userRole === "admin" || agency.ownerId === session?.user?.id) && (
                              <>
                                <Menu.Item
                                  component={Link}
                                  href={`/dashboard/agencies/${agency.id}/edit`}
                                  leftSection={<IconEdit size={14} />}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => deleteMutation.mutate(agency.id)}
                                >
                                  Delete
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Stack>
      </Card>

      {/* Create Agency Modal */}
      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create Agency">
        <Stack gap="md">
          <TextInput
            label="Agency Name"
            placeholder="Enter agency name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Describe your agency"
            minRows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="agency@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextInput
            label="Phone"
            placeholder="+1 234 567 8900"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>
              Create Agency
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
