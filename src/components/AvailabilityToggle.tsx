"use client";

import { Switch, Group, Text, Loader } from "@mantine/core";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface AvailabilityToggleProps {
  isAvailable: boolean;
  onChange: (isAvailable: boolean) => Promise<void>;
  disabled?: boolean;
}

export function AvailabilityToggle({
  isAvailable,
  onChange,
  disabled = false,
}: AvailabilityToggleProps) {
  const [loading, setLoading] = useState(false);
  const [optimisticValue, setOptimisticValue] = useState(isAvailable);

  // Sync with prop changes
  useEffect(() => {
    setOptimisticValue(isAvailable);
  }, [isAvailable]);

  const handleChange = async (checked: boolean) => {
    setOptimisticValue(checked);
    setLoading(true);
    try {
      await onChange(checked);
    } catch (error) {
      // Rollback on error
      setOptimisticValue(!checked);
      console.error("Failed to update availability:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Group
      p="md"
      style={{
        backgroundColor: optimisticValue
          ? "var(--mantine-color-green-0)"
          : "var(--mantine-color-gray-0)",
        borderRadius: "var(--mantine-radius-lg)",
        transition: "background-color 0.3s ease",
      }}
    >
      <div style={{ flex: 1 }}>
        <Group gap="xs">
          {optimisticValue ? (
            <IconCircleCheck
              size={20}
              color="var(--mantine-color-green-6)"
            />
          ) : (
            <IconCircleX size={20} color="var(--mantine-color-gray-5)" />
          )}
          <Text fw={500}>
            {optimisticValue ? "Available for work" : "Not available"}
          </Text>
        </Group>
        <Text size="sm" c="dimmed" mt={4}>
          {optimisticValue
            ? "Customers can find and request your services"
            : "You won't appear in search results"}
        </Text>
      </div>
      {loading ? (
        <Loader size="sm" />
      ) : (
        <Switch
          checked={optimisticValue}
          onChange={(event) => handleChange(event.currentTarget.checked)}
          disabled={disabled || loading}
          size="lg"
          color="green"
          styles={{
            track: {
              cursor: disabled ? "not-allowed" : "pointer",
            },
          }}
        />
      )}
    </Group>
  );
}
