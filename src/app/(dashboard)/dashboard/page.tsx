"use client";

import {
  Title,
  Text,
  SimpleGrid,
  Card,
  Stack,
  Group,
  ThemeIcon,
  Badge,
  Skeleton,
} from "@mantine/core";
import {
  IconBriefcase,
  IconUsers,
  IconClipboardList,
  IconMapPin,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import { useSession, getUserRole } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between">
        <Stack gap={0}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          {loading ? (
            <Skeleton height={32} width={60} mt={4} />
          ) : (
            <Text fw={700} size="xl">
              {value}
            </Text>
          )}
        </Stack>
        <ThemeIcon size="xl" radius="md" variant="light" color={color}>
          <Icon size={24} />
        </ThemeIcon>
      </Group>
    </Card>
  );
}

function UserDashboard() {
  return (
    <>
      <Title order={2} mb="sm">
        Welcome to IKAG
      </Title>
      <Text c="dimmed" mb="xl">
        Find and book local service providers for your everyday needs.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
        <StatCard
          title="Active Requests"
          value={0}
          icon={IconClipboardList}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={0}
          icon={IconCheck}
          color="green"
        />
        <StatCard
          title="Nearby Providers"
          value={12}
          icon={IconMapPin}
          color="yellow"
        />
        <StatCard
          title="Pending Reviews"
          value={0}
          icon={IconClock}
          color="orange"
        />
      </SimpleGrid>

      <Title order={3} mb="md">
        Quick Actions
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        <Card withBorder padding="lg" radius="md" component="a" href="/dashboard/providers">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: "yellow.6", to: "orange.5" }}>
              <IconMapPin size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>Find Providers</Text>
              <Text size="sm" c="dimmed">Browse nearby service providers</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder padding="lg" radius="md" component="a" href="/dashboard/requests">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: "blue.6", to: "cyan.5" }}>
              <IconClipboardList size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>My Requests</Text>
              <Text size="sm" c="dimmed">View your service requests</Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>
    </>
  );
}

function ProviderDashboard() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["provider", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/provider/profile");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const isAvailable = profile?.isAvailable ?? false;

  return (
    <>
      <Title order={2} mb="sm">
        Provider Dashboard
      </Title>
      <Text c="dimmed" mb="xl">
        Manage your services and respond to customer requests.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
        <StatCard
          title="New Requests"
          value={0}
          icon={IconClipboardList}
          color="blue"
        />
        <StatCard
          title="Completed Jobs"
          value={0}
          icon={IconCheck}
          color="green"
        />
        <StatCard
          title="Average Rating"
          value="N/A"
          icon={IconUsers}
          color="yellow"
        />
        <StatCard
          title="This Week"
          value="$0"
          icon={IconBriefcase}
          color="orange"
        />
      </SimpleGrid>

      <Group mb="md">
        <Title order={3}>Status</Title>
        {isLoading ? (
          <Skeleton height={24} width={80} radius="xl" />
        ) : (
          <Badge color={isAvailable ? "green" : "red"} variant="dot" size="lg">
            {isAvailable ? "Online" : "Offline"}
          </Badge>
        )}
      </Group>

      <Text c="dimmed" size="sm">
        {isAvailable ? (
          "You are visible to customers and can receive requests."
        ) : (
          <>
            Toggle your availability from your{" "}
            <Text component={Link} href="/dashboard/profile" c="gold" inherit style={{ textDecoration: "underline" }}>
              profile
            </Text>{" "}
            to start receiving requests.
          </>
        )}
      </Text>
    </>
  );
}

function AdminDashboard() {
  return (
    <>
      <Title order={2} mb="sm">
        Admin Dashboard
      </Title>
      <Text c="dimmed" mb="xl">
        Manage the IKAG marketplace platform.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
        <StatCard
          title="Total Providers"
          value={0}
          icon={IconUsers}
          color="blue"
        />
        <StatCard
          title="Service Types"
          value={0}
          icon={IconBriefcase}
          color="green"
        />
        <StatCard
          title="Pending Verifications"
          value={0}
          icon={IconClock}
          color="yellow"
        />
        <StatCard
          title="Active Requests"
          value={0}
          icon={IconClipboardList}
          color="orange"
        />
      </SimpleGrid>

      <Title order={3} mb="md">
        Quick Actions
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        <Card withBorder padding="lg" radius="md" component="a" href="/dashboard/services">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: "yellow.6", to: "orange.5" }}>
              <IconBriefcase size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>Manage Services</Text>
              <Text size="sm" c="dimmed">Add or edit service types</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder padding="lg" radius="md" component="a" href="/dashboard/verifications">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: "green.6", to: "teal.5" }}>
              <IconCheck size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>Verify Providers</Text>
              <Text size="sm" c="dimmed">Review pending verifications</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder padding="lg" radius="md" component="a" href="/dashboard/providers">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: "blue.6", to: "cyan.5" }}>
              <IconUsers size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>All Providers</Text>
              <Text size="sm" c="dimmed">View and manage providers</Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>
    </>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = getUserRole(session?.user);

  if (role === "admin") {
    return <AdminDashboard />;
  }

  if (role === "provider") {
    return <ProviderDashboard />;
  }

  return <UserDashboard />;
}
