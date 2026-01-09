"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  Textarea,
  MultiSelect,
  Group,
  Badge,
  Divider,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { providerProfileSchema } from "@/lib/schemas";
import { GradientButton } from "@/components/ui/GradientButton";
import { LocationPicker } from "@/components/LocationPicker";
import { AvailabilityToggle } from "@/components/AvailabilityToggle";
import { useSession } from "@/lib/auth-client";

interface ServiceType {
  id: string;
  name: string;
  icon: string | null;
}

interface ProviderProfile {
  id: string;
  bio: string | null;
  isAvailable: boolean;
  verifiedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  serviceIds: string[];
}

interface LocationValue {
  latitude: number;
  longitude: number;
  address?: string;
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/services");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

async function fetchProfile(): Promise<ProviderProfile | null> {
  const res = await fetch("/api/provider/profile");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export default function ProviderProfilePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [availability, setAvailability] = useState(false);

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServiceTypes,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["provider", "profile"],
    queryFn: fetchProfile,
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      bio: "",
      serviceIds: [] as string[],
    },
    validate: zodResolver(providerProfileSchema.pick({ bio: true, serviceIds: true })),
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      form.setValues({
        bio: profile.bio || "",
        serviceIds: profile.serviceIds || [],
      });
      setAvailability(profile.isAvailable);
      if (profile.latitude && profile.longitude) {
        setLocation({
          latitude: profile.latitude,
          longitude: profile.longitude,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const availabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const res = await fetch("/api/provider/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });
      if (!res.ok) throw new Error("Failed to update availability");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", "profile"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: { bio: string; serviceIds: string[]; latitude?: number; longitude?: number }) => {
      const res = await fetch("/api/provider/profile", {
        method: profile ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", "profile"] });
      notifications.show({
        title: "Profile saved",
        message: "Your profile has been updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to save profile. Please try again.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    saveMutation.mutate({
      ...values,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
  };

  const handleAvailabilityChange = useCallback(async (isAvailable: boolean) => {
    setAvailability(isAvailable);
    await availabilityMutation.mutateAsync(isAvailable);
  }, [availabilityMutation]);

  const handleLocationChange = useCallback((newLocation: LocationValue | null) => {
    setLocation(newLocation);
  }, []);

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>My Profile</Title>
        <Text c="dimmed" size="sm">
          Manage your provider profile and services
        </Text>
      </div>

      {/* Verification Status */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <div>
            <Text fw={500}>Verification Status</Text>
            <Text size="sm" c="dimmed">
              {profile?.verifiedAt
                ? "Your profile is verified. Customers can find you in search results."
                : "Submit your profile to be verified by an admin."}
            </Text>
          </div>
          <Badge
            size="lg"
            variant="light"
            color={profile?.verifiedAt ? "green" : "yellow"}
            leftSection={profile?.verifiedAt ? <IconCheck size={14} /> : <IconClock size={14} />}
          >
            {profile?.verifiedAt ? "Verified" : "Pending"}
          </Badge>
        </Group>
      </Paper>

      {/* Availability Toggle */}
      {profile && (
        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="xs">Availability Status</Title>
          <AvailabilityToggle
            isAvailable={availability}
            onChange={handleAvailabilityChange}
            disabled={availabilityMutation.isPending}
          />
        </Paper>
      )}

      {/* Profile Form */}
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              value={session?.user?.name || ""}
              disabled
              description="Your name from your account"
            />

            <Textarea
              label="Bio"
              placeholder="Tell customers about yourself and your experience..."
              minRows={3}
              key={form.key("bio")}
              {...form.getInputProps("bio")}
            />

            <MultiSelect
              label="Services Offered"
              placeholder="Select the services you offer"
              data={serviceTypes.map((s) => ({
                value: s.id,
                label: `${s.icon || ""} ${s.name}`.trim(),
              }))}
              key={form.key("serviceIds")}
              {...form.getInputProps("serviceIds")}
            />

            <Divider />

            <div>
              <Text fw={500} mb="xs">
                Service Location
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Set your base location for proximity-based matching
              </Text>
              <LocationPicker
                value={location ?? undefined}
                onChange={handleLocationChange}
                label="Your service area"
                description="Customers nearby will be able to find you"
              />
            </div>

            <Group justify="flex-end" mt="md">
              <GradientButton type="submit" loading={saveMutation.isPending}>
                {profile ? "Save Changes" : "Create Profile"}
              </GradientButton>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
