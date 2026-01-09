"use client";

import { useState, useCallback, useEffect } from "react";
import {
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  Paper,
  Loader,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconCurrentLocation,
  IconMapPin,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { geocodeAddress, reverseGeocode, type GeocodingResult } from "@/lib/geocoding";

interface LocationPickerProps {
  value?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  onChange: (location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null) => void;
  error?: string;
  label?: string;
  description?: string;
  required?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  error,
  label = "Location",
  description,
  required = false,
}: LocationPickerProps) {
  const [addressInput, setAddressInput] = useState("");
  const [debouncedAddress] = useDebouncedValue(addressInput, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchResult, setSearchResult] = useState<GeocodingResult | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Search for address when debounced value changes
  useEffect(() => {
    if (debouncedAddress.length < 3) {
      setSearchResult(null);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      setLocationError(null);
      try {
        const result = await geocodeAddress(debouncedAddress);
        setSearchResult(result);
        if (!result) {
          setLocationError("Address not found");
        }
      } catch {
        setLocationError("Failed to search address");
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedAddress]);

  // Get current location using browser geolocation
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        const result = await reverseGeocode(latitude, longitude);
        
        onChange({
          latitude,
          longitude,
          address: result?.displayName || undefined,
        });
        
        if (result?.displayName) {
          setAddressInput(result.displayName);
        }
        
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError("Location permission denied");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable");
            break;
          case err.TIMEOUT:
            setLocationError("Location request timed out");
            break;
          default:
            setLocationError("Failed to get location");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [onChange]);

  // Select a search result
  const selectSearchResult = useCallback(() => {
    if (searchResult) {
      onChange({
        latitude: searchResult.latitude,
        longitude: searchResult.longitude,
        address: searchResult.displayName,
      });
      setAddressInput(searchResult.displayName);
      setSearchResult(null);
    }
  }, [searchResult, onChange]);

  // Clear location
  const clearLocation = useCallback(() => {
    onChange(null);
    setAddressInput("");
    setSearchResult(null);
    setLocationError(null);
  }, [onChange]);

  return (
    <Stack gap="xs">
      {label && (
        <Text size="sm" fw={500}>
          {label}
          {required && <span style={{ color: "red" }}> *</span>}
        </Text>
      )}
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}

      {/* Current location button */}
      <Button
        variant="light"
        leftSection={
          isGettingLocation ? (
            <Loader size="xs" />
          ) : (
            <IconCurrentLocation size={18} />
          )
        }
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        fullWidth
      >
        {isGettingLocation ? "Getting location..." : "Use my current location"}
      </Button>

      {/* Address search input */}
      <TextInput
        placeholder="Or search for an address..."
        value={addressInput}
        onChange={(e) => setAddressInput(e.target.value)}
        leftSection={<IconMapPin size={18} />}
        rightSection={
          isSearching ? (
            <Loader size="xs" />
          ) : addressInput ? (
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => {
                setAddressInput("");
                setSearchResult(null);
              }}
            >
              <IconX size={14} />
            </ActionIcon>
          ) : (
            <IconSearch size={16} />
          )
        }
        error={error || locationError}
      />

      {/* Search result */}
      {searchResult && !value && (
        <Paper p="sm" withBorder>
          <Group justify="space-between" wrap="nowrap">
            <div style={{ overflow: "hidden" }}>
              <Text size="sm" lineClamp={2}>
                {searchResult.displayName}
              </Text>
              <Text size="xs" c="dimmed">
                {searchResult.latitude.toFixed(6)}, {searchResult.longitude.toFixed(6)}
              </Text>
            </div>
            <Button size="xs" onClick={selectSearchResult}>
              Select
            </Button>
          </Group>
        </Paper>
      )}

      {/* Selected location display */}
      {value && (
        <Paper p="sm" withBorder bg="gold.0">
          <Group justify="space-between" wrap="nowrap">
            <div style={{ overflow: "hidden" }}>
              <Group gap="xs">
                <IconMapPin size={16} color="var(--mantine-color-gold-6)" />
                <Text size="sm" fw={500}>
                  Location set
                </Text>
              </Group>
              {value.address && (
                <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
                  {value.address}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </Text>
            </div>
            <Tooltip label="Clear location">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={clearLocation}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
