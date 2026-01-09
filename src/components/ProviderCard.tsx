"use client";

import { type ElementType } from "react";
import {
  Card,
  Group,
  Text,
  Badge,
  Stack,
  Avatar,
  Rating,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconMapPin,
  IconClock,
} from "@tabler/icons-react";

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    image?: string | null;
    bio?: string | null;
    yearsOfExperience?: number;
    averageRating?: string | number | null;
    totalReviews?: number;
    isAvailable: boolean;
    verifiedAt?: Date | string | null;
    distance?: number; // in km
    services?: Array<{
      name: string;
      hourlyRate?: string | number | null;
    }>;
  };
  onClick?: () => void;
  showDistance?: boolean;
}

export function ProviderCard({
  provider,
  onClick,
  showDistance = true,
}: ProviderCardProps) {
  const isVerified = !!provider.verifiedAt;
  const rating = typeof provider.averageRating === "string" 
    ? parseFloat(provider.averageRating) 
    : provider.averageRating || 0;

  const CardComponent: ElementType = onClick ? "button" : "a";

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder
      component={CardComponent}
      href={onClick ? undefined : `/provider/${provider.id}`}
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        textDecoration: "none",
        color: "inherit",
        textAlign: "left",
        width: "100%",
      }}
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "var(--mantine-shadow-md)",
          },
        },
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group wrap="nowrap" gap="md">
          <Avatar
            src={provider.image}
            size={56}
            radius="xl"
            color="gold"
          >
            {provider.name.charAt(0).toUpperCase()}
          </Avatar>

          <Stack gap={4}>
            <Group gap="xs">
              <Text fw={600} size="lg">
                {provider.name}
              </Text>
              {isVerified && (
                <Tooltip label="Verified Provider">
                  <Badge
                    size="sm"
                    color="green"
                    variant="light"
                    leftSection={<IconCheck size={12} />}
                  >
                    Verified
                  </Badge>
                </Tooltip>
              )}
            </Group>

            {/* Rating */}
            <Group gap="xs">
              <Rating value={rating} fractions={2} readOnly size="sm" />
              <Text size="sm" c="dimmed">
                ({provider.totalReviews || 0} reviews)
              </Text>
            </Group>

            {/* Experience */}
            {provider.yearsOfExperience !== undefined && (
              <Group gap={4}>
                <IconClock size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  {provider.yearsOfExperience} years experience
                </Text>
              </Group>
            )}
          </Stack>
        </Group>

        <Stack align="flex-end" gap="xs">
          {/* Availability badge */}
          <Badge
            color={provider.isAvailable ? "green" : "gray"}
            variant={provider.isAvailable ? "filled" : "outline"}
          >
            {provider.isAvailable ? "Available" : "Unavailable"}
          </Badge>

          {/* Distance */}
          {showDistance && provider.distance !== undefined && (
            <Group gap={4}>
              <IconMapPin size={14} color="var(--mantine-color-gold-6)" />
              <Text size="sm" fw={500} c="gold.7">
                {provider.distance < 1
                  ? `${Math.round(provider.distance * 1000)}m`
                  : `${provider.distance.toFixed(1)}km`}
              </Text>
            </Group>
          )}
        </Stack>
      </Group>

      {/* Bio */}
      {provider.bio && (
        <Text size="sm" c="dimmed" mt="md" lineClamp={2}>
          {provider.bio}
        </Text>
      )}

      {/* Services */}
      {provider.services && provider.services.length > 0 && (
        <Group gap="xs" mt="md">
          {provider.services.slice(0, 3).map((service, index) => (
            <Badge key={index} variant="light" color="gold" size="sm">
              {service.name}
              {service.hourlyRate && ` - $${service.hourlyRate}/hr`}
            </Badge>
          ))}
          {provider.services.length > 3 && (
            <Badge variant="outline" color="gray" size="sm">
              +{provider.services.length - 3} more
            </Badge>
          )}
        </Group>
      )}
    </Card>
  );
}
