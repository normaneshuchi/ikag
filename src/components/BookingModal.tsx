"use client";

import { useState } from "react";
import {
  Modal,
  Stack,
  Textarea,
  Select,
  Switch,
  Group,
  Text,
  Alert,
  Badge,
  Avatar,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck, IconCalendar, IconMapPin } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GradientButton } from "@/components/ui/GradientButton";

interface Provider {
  id: string;
  name: string;
  image?: string | null;
  isAvailable: boolean;
  verifiedAt?: Date | string | null;
  services: Array<{
    id?: string;
    name: string;
    serviceTypeId?: string;
    hourlyRate?: string | number | null;
  }>;
}

interface BookingModalProps {
  opened: boolean;
  onClose: () => void;
  provider: Provider;
  userLocation: { lat: number; lng: number; address?: string } | null;
}

export function BookingModal({
  opened,
  onClose,
  provider,
  userLocation,
}: BookingModalProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const bookingMutation = useMutation({
    mutationFn: async (data: {
      providerId: string;
      serviceTypeId: string;
      description: string;
      latitude: number;
      longitude: number;
      address?: string;
      scheduledAt?: string;
    }) => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create booking");
      }
      return res.json();
    },
    onSuccess: () => {
      notifications.show({
        title: "Booking Created!",
        message: "Your service request has been sent to the provider",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      handleClose();
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Booking Failed",
        message: error.message,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  const handleClose = () => {
    setSelectedServiceId(null);
    setDescription("");
    setIsScheduled(false);
    setScheduledDate(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedServiceId || !userLocation) return;

    const selectedService = provider.services.find(
      (s) => s.serviceTypeId === selectedServiceId || s.id === selectedServiceId
    );
    if (!selectedService) return;

    // Handle scheduledDate - it could be a Date object or a string from DateTimePicker
    let scheduledAtIso: string | undefined;
    if (isScheduled && scheduledDate) {
      scheduledAtIso = scheduledDate instanceof Date 
        ? scheduledDate.toISOString() 
        : new Date(scheduledDate).toISOString();
    }

    bookingMutation.mutate({
      providerId: provider.id,
      serviceTypeId: selectedService.serviceTypeId || selectedServiceId,
      description,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      address: userLocation.address,
      scheduledAt: scheduledAtIso,
    });
  };

  const canSubmit =
    selectedServiceId &&
    description.length >= 10 &&
    userLocation &&
    (!isScheduled || scheduledDate);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Book Service"
      size="md"
      radius="lg"
      styles={{
        title: {
          fontWeight: 600,
          color: "var(--mantine-color-text)",
        },
        header: {
          backgroundColor: "var(--mantine-color-body)",
        },
        body: {
          backgroundColor: "var(--mantine-color-body)",
        },
        content: {
          backgroundColor: "var(--mantine-color-body)",
        },
      }}
    >
      <Stack gap="md">
        {/* Provider Info */}
        <Group
          p="md"
          style={{
            backgroundColor: "var(--mantine-color-default-hover)",
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Avatar src={provider.image} size={48} radius="xl" color="gold">
            {provider.name.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Group gap="xs">
              <Text fw={600} c="var(--mantine-color-text)">{provider.name}</Text>
              {provider.verifiedAt && (
                <Badge size="xs" color="green" variant="light">
                  Verified
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {provider.services.length} service{provider.services.length !== 1 ? "s" : ""} available
            </Text>
          </div>
        </Group>

        {/* Location */}
        {userLocation ? (
          <Group gap="xs" c="dimmed">
            <IconMapPin size={16} />
            <Text size="sm">{userLocation.address || "Your current location"}</Text>
          </Group>
        ) : (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            Please set your location before booking
          </Alert>
        )}

        {/* Service Selection */}
        <Select
          label="Select Service"
          placeholder="Choose a service"
          required
          data={provider.services.map((s) => ({
            value: s.serviceTypeId || s.id || s.name,
            label: `${s.name}${s.hourlyRate ? ` - KSh ${s.hourlyRate}/hr` : ""}`,
          }))}
          value={selectedServiceId}
          onChange={setSelectedServiceId}
        />

        {/* Description */}
        <Textarea
          label="Describe your needs"
          placeholder="Please describe what you need help with (minimum 10 characters)..."
          required
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          error={
            description.length > 0 && description.length < 10
              ? "Description must be at least 10 characters"
              : undefined
          }
        />

        {/* Scheduling */}
        <Switch
          label="Schedule for later"
          description="Book for a specific date and time instead of immediately"
          checked={isScheduled}
          onChange={(e) => setIsScheduled(e.currentTarget.checked)}
        />

        {isScheduled && (
          <DateTimePicker
            label="When do you need the service?"
            placeholder="Pick date and time"
            leftSection={<IconCalendar size={16} />}
            value={scheduledDate}
            onChange={(value) => setScheduledDate(value as Date | null)}
            minDate={new Date()}
            required={isScheduled}
          />
        )}

        {/* Submit */}
        <GradientButton
          onClick={handleSubmit}
          loading={bookingMutation.isPending}
          disabled={!canSubmit}
          fullWidth
          mt="md"
        >
          {isScheduled ? "Schedule Booking" : "Book Now"}
        </GradientButton>
      </Stack>
    </Modal>
  );
}
