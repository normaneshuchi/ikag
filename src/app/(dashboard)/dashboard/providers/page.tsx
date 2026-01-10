"use client";

import { useState, useEffect } from "react";
import {
  Title,
  Text,
  SimpleGrid,
  Select,
  Stack,
  Paper,
  Slider,
  Group,
  Badge,
  Center,
  Loader,
  Alert,
  TextInput,
  Button,
  Switch,
} from "@mantine/core";
import { IconMapPin, IconAlertCircle, IconSearch, IconCurrentLocation } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { ProviderCard } from "@/components/ProviderCard";
import { BookingModal } from "@/components/BookingModal";
import { useProviderStream } from "@/hooks/useProviderStream";
import { getUserRole, useSession } from "@/lib/auth-client";

interface ServiceType {
  id: string;
  name: string;
  icon: string | null;
}

interface Provider {
  id: string;
  userId: string;
  name: string;
  bio: string | null;
  isAvailable: boolean;
  verifiedAt: Date | null;
  averageRating: string | null;
  distance: number;
  services: {
    id: string;
    serviceTypeId: string;
    name: string;
    hourlyRate: string | null;
  }[];
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/services");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

async function fetchProviders(params: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  serviceTypeId?: string;
}): Promise<Provider[]> {
  const searchParams = new URLSearchParams();
  if (params.lat) searchParams.set("lat", params.lat.toString());
  if (params.lng) searchParams.set("lng", params.lng.toString());
  if (params.radiusKm) searchParams.set("radius", (params.radiusKm * 1000).toString()); // Convert to meters
  if (params.serviceTypeId) searchParams.set("serviceTypeId", params.serviceTypeId);

  const res = await fetch(`/api/providers?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch providers");
  return res.json();
}

export default function FindProvidersPage() {
  const { data: session } = useSession();
  const role = getUserRole(session?.user);
  const isUser = role === "user";

  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Subscribe to real-time updates
  const { isConnected } = useProviderStream();

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServiceTypes,
  });

  const {
    data: providers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["providers", location?.lat, location?.lng, radiusKm, serviceTypeId],
    queryFn: () =>
      fetchProviders({
        lat: location?.lat,
        lng: location?.lng,
        radiusKm,
        serviceTypeId: serviceTypeId || undefined,
      }),
    enabled: !!location,
  });

  // Filter providers based on local filters
  const filteredProviders = providers.filter((p) => {
    if (verifiedOnly && !p.verifiedAt) return false;
    if (availableOnly && !p.isAvailable) return false;
    return true;
  });

  // Auto-get location on mount
  useEffect(() => {
    if (!location && navigator.geolocation) {
      getCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get address from coordinates (reverse geocoding)
        let address = "Current Location";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            address = data.display_name?.split(",").slice(0, 3).join(",") || "Current Location";
          }
        } catch {
          // Fallback to "Current Location" if geocoding fails
        }

        setLocation({
          lat: latitude,
          lng: longitude,
          address,
        });
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      }
    );
  };

  const handleBookProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setBookingModalOpen(true);
  };

  return (
    <Stack gap="lg">
      <div>
        <Group gap="xs" mb="xs">
          <Title order={2}>Find Providers</Title>
          {isConnected && (
            <Badge color="green" variant="dot" size="sm">
              Live
            </Badge>
          )}
        </Group>
        <Text c="dimmed" size="sm">
          Search for service providers near you
        </Text>
      </div>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Group>
            <TextInput
              flex={1}
              placeholder={location?.address || "Set your location"}
              leftSection={<IconMapPin size={16} />}
              readOnly
              value={location?.address || ""}
            />
            <Button
              variant="light"
              leftSection={<IconCurrentLocation size={16} />}
              onClick={getCurrentLocation}
              loading={isGettingLocation}
            >
              Use My Location
            </Button>
          </Group>

          {location && (
            <>
              <Group align="flex-end" gap="md" grow>
                <Select
                  label="Service Type"
                  placeholder="All services"
                  clearable
                  leftSection={<IconSearch size={16} />}
                  data={serviceTypes.map((s) => ({
                    value: s.id,
                    label: `${s.icon || ""} ${s.name}`.trim(),
                  }))}
                  value={serviceTypeId}
                  onChange={setServiceTypeId}
                />

                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500} mb="xs">
                    Search Radius: {radiusKm} km
                  </Text>
                  <Slider
                    value={radiusKm}
                    onChange={setRadiusKm}
                    min={1}
                    max={50}
                    marks={[
                      { value: 1, label: "1km" },
                      { value: 25, label: "25km" },
                      { value: 50, label: "50km" },
                    ]}
                  />
                </div>
              </Group>

              <Group>
                <Switch
                  label="Verified only"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.currentTarget.checked)}
                />
                <Switch
                  label="Available now"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.currentTarget.checked)}
                />
              </Group>
            </>
          )}
        </Stack>
      </Paper>

      {!location && !isGettingLocation && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconMapPin size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed">Getting your location...</Text>
          </Stack>
        </Center>
      )}

      {location && error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          Failed to load providers. Please try again.
        </Alert>
      )}

      {location && isLoading && (
        <Center py="xl">
          <Loader color="yellow" />
        </Center>
      )}

      {location && !isLoading && providers.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconSearch size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed">No providers found in this area</Text>
            <Text c="dimmed" size="sm">
              Try increasing the search radius or adjusting filters
            </Text>
          </Stack>
        </Center>
      )}

      {location && !isLoading && filteredProviders.length > 0 && (
        <>
          <Text c="dimmed" size="sm">
            Found {filteredProviders.length} provider{filteredProviders.length !== 1 ? "s" : ""} within {radiusKm}km
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={{
                  id: provider.id,
                  name: provider.name,
                  bio: provider.bio,
                  isAvailable: provider.isAvailable,
                  verifiedAt: provider.verifiedAt,
                  averageRating: provider.averageRating ?? undefined,
                  distance: provider.distance / 1000,
                  services: provider.services.map((s) => ({
                    id: s.id,
                    serviceTypeId: s.serviceTypeId,
                    name: s.name,
                    hourlyRate: s.hourlyRate,
                  })),
                }}
                showDistance={true}
                onBook={isUser && provider.isAvailable ? () => handleBookProvider(provider) : undefined}
              />
            ))}
          </SimpleGrid>
        </>
      )}

      {/* Booking Modal */}
      {selectedProvider && (
        <BookingModal
          opened={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedProvider(null);
          }}
          provider={{
            id: selectedProvider.id,
            name: selectedProvider.name,
            isAvailable: selectedProvider.isAvailable,
            verifiedAt: selectedProvider.verifiedAt,
            services: selectedProvider.services.map((s) => ({
              id: s.id,
              serviceTypeId: s.serviceTypeId,
              name: s.name,
              hourlyRate: s.hourlyRate,
            })),
          }}
          userLocation={location}
        />
      )}
    </Stack>
  );
}
