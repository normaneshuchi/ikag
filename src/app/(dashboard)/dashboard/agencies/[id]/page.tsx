"use client";

import { useState, use } from "react";
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
  NumberInput,
  Select,
  Loader,
  Center,
  Avatar,
  Alert,
  Tabs,
  Switch,
  Paper,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconPlus,
  IconBuilding,
  IconTrash,
  IconUsers,
  IconBriefcase,
  IconCalendar,
  IconPhone,
  IconMail,
  IconWorld,
  IconArrowLeft,
  IconUserPlus,
  IconCheckbox,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, getUserRole } from "@/lib/auth-client";
import Link from "next/link";

interface AgencyMember {
  id: string;
  userId: string | null;
  isExternal: boolean;
  externalName: string | null;
  externalEmail: string | null;
  externalPhone: string | null;
  role: "owner" | "manager" | "provider";
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  createdAt: string;
}

interface AgencyService {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeIcon: string | null;
  hourlyRate: number | null;
  description: string | null;
  isActive: boolean;
}

interface ServiceType {
  id: string;
  name: string;
  icon: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Agency {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: "pending" | "verified" | "suspended";
  ownerId: string;
  ownerName: string;
  verifiedAt: string | null;
  createdAt: string;
  members: AgencyMember[];
  services: AgencyService[];
}

async function fetchAgency(id: string): Promise<Agency> {
  const res = await fetch(`/api/agencies/${id}`);
  if (!res.ok) throw new Error("Failed to fetch agency");
  return res.json();
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/services");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function addMember(agencyId: string, data: {
  userId?: string;
  isExternal: boolean;
  externalName?: string;
  externalEmail?: string;
  externalPhone?: string;
  role: string;
}): Promise<AgencyMember> {
  const res = await fetch(`/api/agencies/${agencyId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add member");
  }
  return res.json();
}

async function removeMember(agencyId: string, memberId: string): Promise<void> {
  const res = await fetch(`/api/agencies/${agencyId}/members/${memberId}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove member");
  }
}

async function addService(agencyId: string, data: {
  serviceTypeId: string;
  hourlyRate?: number;
  description?: string;
}): Promise<AgencyService> {
  const res = await fetch(`/api/agencies/${agencyId}/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add service");
  }
  return res.json();
}

async function removeService(agencyId: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/agencies/${agencyId}/services?serviceId=${serviceId}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove service");
  }
}

async function verifyAgency(agencyId: string): Promise<void> {
  const res = await fetch(`/api/agencies/${agencyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "verified" }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to verify agency");
  }
}

const statusColors: Record<string, string> = {
  pending: "yellow",
  verified: "green",
  suspended: "red",
};

const roleColors: Record<string, string> = {
  owner: "blue",
  manager: "cyan",
  provider: "gray",
};

export default function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userRole = getUserRole(session);

  // Modals
  const [memberModalOpened, { open: openMemberModal, close: closeMemberModal }] = useDisclosure(false);
  const [serviceModalOpened, { open: openServiceModal, close: closeServiceModal }] = useDisclosure(false);

  // Form state
  const [isExternal, setIsExternal] = useState(false);
  const [memberForm, setMemberForm] = useState({
    userId: "",
    externalName: "",
    externalEmail: "",
    externalPhone: "",
    role: "provider",
  });
  const [serviceForm, setServiceForm] = useState({
    serviceTypeId: "",
    hourlyRate: 0,
    description: "",
  });

  const { data: agency, isLoading, error } = useQuery({
    queryKey: ["agency", id],
    queryFn: () => fetchAgency(id),
    enabled: !!id && !!session?.user,
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ["serviceTypes"],
    queryFn: fetchServiceTypes,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: userRole === "admin",
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: Parameters<typeof addMember>[1]) => addMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", id] });
      closeMemberModal();
      resetMemberForm();
      notifications.show({
        title: "Success",
        message: "Member added successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", id] });
      notifications.show({
        title: "Success",
        message: "Member removed successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: (data: Parameters<typeof addService>[1]) => addService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", id] });
      closeServiceModal();
      setServiceForm({ serviceTypeId: "", hourlyRate: 0, description: "" });
      notifications.show({
        title: "Success",
        message: "Service added successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const removeServiceMutation = useMutation({
    mutationFn: (serviceId: string) => removeService(id, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", id] });
      notifications.show({
        title: "Success",
        message: "Service removed successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyAgency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", id] });
      notifications.show({
        title: "Success",
        message: "Agency verified successfully",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    },
  });

  const resetMemberForm = () => {
    setIsExternal(false);
    setMemberForm({
      userId: "",
      externalName: "",
      externalEmail: "",
      externalPhone: "",
      role: "provider",
    });
  };

  const handleAddMember = () => {
    if (isExternal) {
      if (!memberForm.externalName.trim()) {
        notifications.show({ title: "Error", message: "External member name is required", color: "red" });
        return;
      }
      addMemberMutation.mutate({
        isExternal: true,
        externalName: memberForm.externalName,
        externalEmail: memberForm.externalEmail || undefined,
        externalPhone: memberForm.externalPhone || undefined,
        role: memberForm.role,
      });
    } else {
      if (!memberForm.userId) {
        notifications.show({ title: "Error", message: "Please select a user", color: "red" });
        return;
      }
      addMemberMutation.mutate({
        isExternal: false,
        userId: memberForm.userId,
        role: memberForm.role,
      });
    }
  };

  const handleAddService = () => {
    if (!serviceForm.serviceTypeId) {
      notifications.show({ title: "Error", message: "Please select a service type", color: "red" });
      return;
    }
    addServiceMutation.mutate({
      serviceTypeId: serviceForm.serviceTypeId,
      hourlyRate: serviceForm.hourlyRate || undefined,
      description: serviceForm.description || undefined,
    });
  };

  const canManage = userRole === "admin" || agency?.ownerId === session?.user?.id;

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !agency) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />}>
        Failed to load agency. Please try again later.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            href="/dashboard/agencies"
          >
            Back
          </Button>
        </Group>
        {canManage && agency.status === "pending" && userRole === "admin" && (
          <Button
            leftSection={<IconCheck size={16} />}
            color="green"
            onClick={() => verifyMutation.mutate()}
            loading={verifyMutation.isPending}
          >
            Verify Agency
          </Button>
        )}
      </Group>

      {/* Agency Info Card */}
      <Card withBorder padding="lg">
        <Group gap="lg" align="flex-start">
          <Avatar src={agency.logo} size={100} radius="md">
            <IconBuilding size={48} />
          </Avatar>
          <Stack gap="xs" style={{ flex: 1 }}>
            <Group>
              <Title order={2}>{agency.name}</Title>
              <Badge color={statusColors[agency.status]} size="lg">
                {agency.status}
              </Badge>
            </Group>
            {agency.description && (
              <Text c="dimmed">{agency.description}</Text>
            )}
            <Group gap="xl" mt="xs">
              {agency.email && (
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="gray">
                    <IconMail size={14} />
                  </ThemeIcon>
                  <Text size="sm">{agency.email}</Text>
                </Group>
              )}
              {agency.phone && (
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="gray">
                    <IconPhone size={14} />
                  </ThemeIcon>
                  <Text size="sm">{agency.phone}</Text>
                </Group>
              )}
              {agency.website && (
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="gray">
                    <IconWorld size={14} />
                  </ThemeIcon>
                  <Text size="sm">{agency.website}</Text>
                </Group>
              )}
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              Owner: {agency.ownerName} • Created: {new Date(agency.createdAt).toLocaleDateString()}
            </Text>
          </Stack>
        </Group>
      </Card>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconUsers size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Members</Text>
              <Text fw={700} size="xl">{agency.members?.length || 0}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" variant="light" color="green">
              <IconBriefcase size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Services</Text>
              <Text fw={700} size="xl">{agency.services?.length || 0}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" variant="light" color="cyan">
              <IconCalendar size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Bookings</Text>
              <Text fw={700} size="xl">0</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" variant="light" color={agency.verifiedAt ? "green" : "yellow"}>
              <IconCheckbox size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Status</Text>
              <Text fw={700} size="sm">{agency.verifiedAt ? "Verified" : "Pending"}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <Tabs.List>
          <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
            Members ({agency.members?.length || 0})
          </Tabs.Tab>
          <Tabs.Tab value="services" leftSection={<IconBriefcase size={16} />}>
            Services ({agency.services?.length || 0})
          </Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>
            Calendar
          </Tabs.Tab>
        </Tabs.List>

        {/* Members Tab */}
        <Tabs.Panel value="members" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={500}>Team Members</Text>
              {canManage && (
                <Button size="sm" leftSection={<IconUserPlus size={16} />} onClick={openMemberModal}>
                  Add Member
                </Button>
              )}
            </Group>

            {!agency.members?.length ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <IconUsers size={48} stroke={1.5} color="gray" />
                  <Text c="dimmed">No members yet</Text>
                </Stack>
              </Center>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Member</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    {canManage && <Table.Th w={50} />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {agency.members.map((member) => (
                    <Table.Tr key={member.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar src={member.userImage} radius="xl" size="sm">
                            {(member.isExternal ? member.externalName : member.userName)?.charAt(0)}
                          </Avatar>
                          <Text size="sm">
                            {member.isExternal ? member.externalName : member.userName}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={member.isExternal ? "orange" : "blue"} variant="light" size="sm">
                          {member.isExternal ? "External" : "Platform"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={roleColors[member.role]} variant="outline" size="sm">
                          {member.role}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {member.isExternal ? member.externalEmail : member.userEmail}
                        </Text>
                      </Table.Td>
                      {canManage && (
                        <Table.Td>
                          {member.role !== "owner" && (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => removeMemberMutation.mutate(member.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          )}
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        {/* Services Tab */}
        <Tabs.Panel value="services" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={500}>Agency Services</Text>
              {canManage && (
                <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openServiceModal}>
                  Add Service
                </Button>
              )}
            </Group>

            {!agency.services?.length ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <IconBriefcase size={48} stroke={1.5} color="gray" />
                  <Text c="dimmed">No services offered yet</Text>
                </Stack>
              </Center>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Service</Table.Th>
                    <Table.Th>Hourly Rate</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Status</Table.Th>
                    {canManage && <Table.Th w={50} />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {agency.services.map((service) => (
                    <Table.Tr key={service.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Text size="lg">{service.serviceTypeIcon}</Text>
                          <Text size="sm">{service.serviceTypeName}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {service.hourlyRate ? `$${service.hourlyRate}/hr` : "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" lineClamp={1}>
                          {service.description || "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={service.isActive ? "green" : "gray"} variant="light" size="sm">
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </Table.Td>
                      {canManage && (
                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => removeServiceMutation.mutate(service.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        {/* Calendar Tab */}
        <Tabs.Panel value="calendar" pt="md">
          <Card withBorder>
            <Stack align="center" py="xl">
              <IconCalendar size={64} stroke={1.5} color="gray" />
              <Text c="dimmed">Booking calendar coming soon</Text>
              <Text size="sm" c="dimmed">
                View and manage all member bookings in a calendar view
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Add Member Modal */}
      <Modal opened={memberModalOpened} onClose={closeMemberModal} title="Add Member">
        <Stack gap="md">
          <Switch
            label="External member (not on platform)"
            checked={isExternal}
            onChange={(e) => setIsExternal(e.currentTarget.checked)}
          />

          {isExternal ? (
            <>
              <TextInput
                label="Name"
                placeholder="Full name"
                required
                value={memberForm.externalName}
                onChange={(e) => setMemberForm({ ...memberForm, externalName: e.target.value })}
              />
              <TextInput
                label="Email"
                placeholder="email@example.com"
                value={memberForm.externalEmail}
                onChange={(e) => setMemberForm({ ...memberForm, externalEmail: e.target.value })}
              />
              <TextInput
                label="Phone"
                placeholder="+1 234 567 8900"
                value={memberForm.externalPhone}
                onChange={(e) => setMemberForm({ ...memberForm, externalPhone: e.target.value })}
              />
            </>
          ) : (
            <Select
              label="Select User"
              placeholder="Search users..."
              searchable
              data={users?.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })) || []}
              value={memberForm.userId}
              onChange={(value) => setMemberForm({ ...memberForm, userId: value || "" })}
            />
          )}

          <Select
            label="Role"
            data={[
              { value: "provider", label: "Provider" },
              { value: "manager", label: "Manager" },
            ]}
            value={memberForm.role}
            onChange={(value) => setMemberForm({ ...memberForm, role: value || "provider" })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeMemberModal}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} loading={addMemberMutation.isPending}>
              Add Member
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Service Modal */}
      <Modal opened={serviceModalOpened} onClose={closeServiceModal} title="Add Service">
        <Stack gap="md">
          <Select
            label="Service Type"
            placeholder="Select a service"
            searchable
            required
            data={serviceTypes?.map((s) => ({ value: s.id, label: `${s.icon || ""} ${s.name}` })) || []}
            value={serviceForm.serviceTypeId}
            onChange={(value) => setServiceForm({ ...serviceForm, serviceTypeId: value || "" })}
          />
          <NumberInput
            label="Hourly Rate"
            placeholder="0.00"
            prefix="$"
            min={0}
            decimalScale={2}
            value={serviceForm.hourlyRate}
            onChange={(value) => setServiceForm({ ...serviceForm, hourlyRate: Number(value) || 0 })}
          />
          <Textarea
            label="Description"
            placeholder="Describe this service offering..."
            minRows={2}
            value={serviceForm.description}
            onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeServiceModal}>
              Cancel
            </Button>
            <Button onClick={handleAddService} loading={addServiceMutation.isPending}>
              Add Service
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
