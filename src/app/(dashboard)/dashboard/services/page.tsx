"use client";

import { useState } from "react";
import {
  Title,
  Text,
  Card,
  Table,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Stack,
  Badge,
  Tooltip,
  Alert,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceTypeSchema } from "@/lib/schemas";
import { GradientButton } from "@/components/ui/GradientButton";
import { OutlineGradientButton } from "@/components/ui/OutlineGradientButton";

interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/admin/services");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

export default function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ["admin", "services"],
    queryFn: fetchServiceTypes,
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      description: "",
      icon: "",
      isActive: true,
    },
    validate: zodResolver(serviceTypeSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof form.values & { id: string }) => {
      const res = await fetch(`/api/admin/services/${values.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete service");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      setDeleteConfirm(null);
    },
  });

  const handleOpen = (service?: ServiceType) => {
    if (service) {
      setEditingService(service);
      form.setValues({
        name: service.name,
        description: service.description || "",
        icon: service.icon || "",
        isActive: service.isActive,
      });
    } else {
      setEditingService(null);
      form.reset();
    }
    open();
  };

  const handleClose = () => {
    setEditingService(null);
    form.reset();
    close();
  };

  const handleSubmit = (values: typeof form.values) => {
    if (editingService) {
      updateMutation.mutate({ ...values, id: editingService.id });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Service Types</Title>
          <Text c="dimmed" size="sm">
            Manage the types of services available on the platform
          </Text>
        </div>
        <GradientButton leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
          Add Service
        </GradientButton>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          Failed to load services. Please try again.
        </Alert>
      )}

      <Card withBorder radius="md">
        <Table.ScrollContainer minWidth={500}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Icon</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Status</Table.Th>
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
              ) : services.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} ta="center" py="xl">
                    <Text c="dimmed">No services found. Add your first service type.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                services.map((service) => (
                  <Table.Tr key={service.id}>
                    <Table.Td>
                      <Text size="xl">{service.icon || "📦"}</Text>
                    </Table.Td>
                    <Table.Td fw={500}>{service.name}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {service.description || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={service.isActive ? "green" : "gray"} variant="light">
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpen(service)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => setDeleteConfirm(service.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        opened={opened}
        onClose={handleClose}
        title={editingService ? "Edit Service Type" : "Add Service Type"}
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="e.g., Plumbing"
              required
              key={form.key("name")}
              {...form.getInputProps("name")}
            />

            <Textarea
              label="Description"
              placeholder="Describe this service type..."
              key={form.key("description")}
              {...form.getInputProps("description")}
            />

            <TextInput
              label="Icon"
              placeholder="e.g., 🔧"
              description="Use an emoji or icon code"
              key={form.key("icon")}
              {...form.getInputProps("icon")}
            />

            <Switch
              label="Active"
              description="Inactive services won't appear for users"
              key={form.key("isActive")}
              {...form.getInputProps("isActive", { type: "checkbox" })}
            />

            <Group justify="flex-end" mt="md">
              <OutlineGradientButton onClick={handleClose}>
                Cancel
              </OutlineGradientButton>
              <GradientButton
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingService ? "Save Changes" : "Add Service"}
              </GradientButton>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Service Type"
        centered
        size="sm"
      >
        <Text mb="lg">
          Are you sure you want to delete this service type? This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <OutlineGradientButton onClick={() => setDeleteConfirm(null)}>
            Cancel
          </OutlineGradientButton>
          <GradientButton
            color="red"
            loading={deleteMutation.isPending}
            onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
          >
            Delete
          </GradientButton>
        </Group>
      </Modal>
    </>
  );
}
