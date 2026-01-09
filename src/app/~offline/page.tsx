"use client";

import { Container, Title, Text, Button, Stack, Center, Paper } from "@mantine/core";
import { IconWifiOff, IconRefresh } from "@tabler/icons-react";

export default function OfflinePage() {
  return (
    <Container size="sm" py="xl">
      <Center style={{ minHeight: "60vh" }}>
        <Paper p="xl" radius="lg" shadow="md" style={{ textAlign: "center" }}>
          <Stack align="center" gap="lg">
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconWifiOff size={40} color="white" />
            </div>

            <Title order={2}>You&apos;re Offline</Title>

            <Text c="dimmed" size="lg" maw={400}>
              It looks like you&apos;ve lost your internet connection. Some features
              may not be available until you&apos;re back online.
            </Text>

            <Text size="sm" c="dimmed">
              Don&apos;t worry — any pending requests will sync automatically when
              you reconnect.
            </Text>

            <Button
              variant="gradient"
              gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
              size="lg"
              leftSection={<IconRefresh size={20} />}
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
}
