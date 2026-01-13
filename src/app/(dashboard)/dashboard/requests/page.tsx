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
  Menu,
  Alert,
  Button,
  Modal,
  Select,
  Textarea,
  TextInput,
  Loader,
  Center,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconDotsVertical,
  IconCheck,
  IconX,
  IconEye,
  IconClipboardList,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, getUserRole } from "@/lib/auth-client";

interface ServiceRequest {
  id: string;
  status: "pending" | "matched" | "accepted" | "in_progress" | "completed" | "cancelled";
  description: string | null;
  createdAt: Date;
  address?: string | null;
  user?: { id: string; name: string };
  provider?: { id: string; user: { id: string; name: string } };
  serviceType: { id: string; name: string; icon: string | null };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Provider {
  id: string;
  userName: string;
  userEmail: string;
  isAvailable: boolean;
  verifiedAt: string | null;
  services: Array<{ serviceTypeId: string; serviceName: string }>;
}

interface ServiceType {
  id: string;
  name: string;
  icon: string | null;
}

async function fetchRequests(role: string): Promise<ServiceRequest[]> {
  const endpoint = role === "admin" 
    ? "/api/admin/requests" 
    : role === "provider" 
      ? "/api/provider/requests" 
      : "/api/user/requests";
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users?role=user");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function fetchProviders(): Promise<Provider[]> {
  const res = await fetch("/api/admin/providers?verifiedOnly=true");
  if (!res.ok) throw new Error("Failed to fetch providers");
  return res.json();
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/services");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

const statusColors: Record<string, string> = {
  pending: "yellow",
  matched: "orange",
  accepted: "blue",
  in_progress: "cyan",
  completed: "green",
  cancelled: "red",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  matched: "Matched",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function RequestsPage() {
  const { data: session } = useSession();
  const role = getUserRole(session?.user);
  const queryClient = useQueryClient();

  // Modal state
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

  // Form state for admin/provider request creation
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["requests", role],
    queryFn: () => fetchRequests(role),
    enabled: !!session,
  });

  // Fetch users and providers for admin
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    enabled: role === "admin",
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: fetchProviders,
    enabled: role === "admin" || role === "provider",
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServiceTypes,
    enabled: role === "admin" || role === "provider",
  });

  // Filter providers by selected service type
  const filteredProviders = selectedServiceTypeId
    ? providers.filter(p => p.services.some(s => s.serviceTypeId === selectedServiceTypeId))
    : providers;

  // For provider self-service - get their own profile
  const { data: myProviderProfile } = useQuery({
    queryKey: ["my-provider-profile"],
    queryFn: async () => {
      const res = await fetch("/api/provider/profile");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: role === "provider",
  });

  // Filter services for provider self-service
  const myServices = role === "provider" && myProviderProfile?.services
    ? serviceTypes.filter(st => 
        myProviderProfile.services.some((ps: { serviceTypeId: string }) => ps.serviceTypeId === st.id)
      )
    : serviceTypes;

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: {
      serviceTypeId: string;
      providerId?: string;
      userId?: string;
      description: string;
      latitude: number;
      longitude: number;
      address?: string;
      isSelfService?: boolean;
    }) => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create request");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      notifications.show({
        title: "Request Created",
        message: data.message,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      handleCloseModal();
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleCloseModal = () => {
    setSelectedUserId(null);
    setSelectedProviderId(null);
    setSelectedServiceTypeId(null);
    setDescription("");
    setAddress("");
    closeCreateModal();
  };

  const handleCreateRequest = () => {
    if (!selectedServiceTypeId) {
      notifications.show({
        title: "Error",
        message: "Please select a service type",
        color: "red",
      });
      return;
    }

    if (!description || description.length < 10) {
      notifications.show({
        title: "Error",
        message: "Description must be at least 10 characters",
        color: "red",
      });
      return;
    }

    // Default location (Nairobi) - in production, would use actual location
    const defaultLocation = { lat: -1.2921, lng: 36.8219 };

    if (role === "admin") {
      if (!selectedUserId) {
        notifications.show({
          title: "Error",
          message: "Please select a user",
          color: "red",
        });
        return;
      }

      createRequestMutation.mutate({
        serviceTypeId: selectedServiceTypeId,
        userId: selectedUserId,
        providerId: selectedProviderId || undefined,
        description,
        latitude: defaultLocation.lat,
        longitude: defaultLocation.lng,
        address: address || undefined,
      });
    } else if (role === "provider") {
      // Provider self-service
      createRequestMutation.mutate({
        serviceTypeId: selectedServiceTypeId,
        description,
        latitude: defaultLocation.lat,
        longitude: defaultLocation.lng,
        address: address || undefined,
        isSelfService: true,
      });
    }
  };

  const canCreateRequest = role === "admin" || role === "provider";

  return (
    <>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>
            {role === "admin" 
              ? "All Requests" 
              : role === "provider" 
                ? "Service Requests" 
                : "My Requests"}
          </Title>
          <Text c="dimmed" size="sm">
            {role === "admin"
              ? "Manage all service requests and pair users with providers"
              : role === "provider"
                ? "Manage incoming service requests"
                : "Track your service requests"}
          </Text>
        </div>
        {canCreateRequest && (
          <Button
            leftSection={<IconPlus size={16} />}
            variant="gradient"
            gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
            onClick={openCreateModal}
          >
            {role === "admin" ? "Create & Pair Request" : "Self-Service Request"}
          </Button>
        )}
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
                <Table.Th>{role === "provider" ? "Customer" : role === "admin" ? "User" : "Provider"}</Table.Th>
                {role === "admin" && <Table.Th>Provider</Table.Th>}
                <Table.Th>Description</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={role === "admin" ? 7 : 6} ta="center" py="xl">
                    <Center>
                      <Loader color="gold" />
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : requests.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={role === "admin" ? 7 : 6} ta="center" py="xl">
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
                          : role === "admin"
                            ? request.user?.name || "Unknown"
                            : request.provider?.user?.name || "Pending"}
                      </Text>
                    </Table.Td>
                    {role === "admin" && (
                      <Table.Td>
                        <Text size="sm">
                          {request.provider?.user?.name || "Unassigned"}
                        </Text>
                      </Table.Td>
                    )}
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
                          {role === "provider" && request.status === "matched" && (
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

      {/* Create Request Modal */}
      <Modal
        opened={createModalOpened}
        onClose={handleCloseModal}
        title={role === "admin" ? "Create & Pair Request" : "Self-Service Request"}
        size="lg"
      >
        <Stack gap="md">
          {role === "admin" && (
            <>
              <Select
                label="Select User"
                placeholder="Choose a user"
                searchable
                data={users.map(u => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                }))}
                value={selectedUserId}
                onChange={setSelectedUserId}
                leftSection={<IconSearch size={16} />}
                required
              />
            </>
          )}

          <Select
            label="Service Type"
            placeholder="Choose a service"
            searchable
            data={(role === "provider" ? myServices : serviceTypes).map(st => ({
              value: st.id,
              label: `${st.icon || "📦"} ${st.name}`,
            }))}
            value={selectedServiceTypeId}
            onChange={(value) => {
              setSelectedServiceTypeId(value);
              setSelectedProviderId(null); // Reset provider when service changes
            }}
            required
          />

          {role === "admin" && (
            <Select
              label="Assign Provider (Optional)"
              placeholder="Choose a provider to pair"
              searchable
              clearable
              data={filteredProviders.map(p => ({
                value: p.id,
                label: `${p.userName} (${p.userEmail})${p.verifiedAt ? " ✓" : ""}`,
              }))}
              value={selectedProviderId}
              onChange={setSelectedProviderId}
              disabled={!selectedServiceTypeId}
              description={selectedServiceTypeId ? `${filteredProviders.length} providers offer this service` : "Select a service first"}
            />
          )}

          <Textarea
            label="Description"
            placeholder="Describe the service needed..."
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Address (Optional)"
            placeholder="Service location address"
            value={address}
            onChange={(e) => setAddress(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
              onClick={handleCreateRequest}
              loading={createRequestMutation.isPending}
            >
              {role === "admin" 
                ? selectedProviderId 
                  ? "Create & Pair" 
                  : "Create Request"
                : "Create Self-Service"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
