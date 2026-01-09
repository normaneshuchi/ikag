"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Card,
  ThemeIcon,
  Box,
  rem,
  Anchor,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconMapPin,
  IconShieldCheck,
  IconClock,
  IconDeviceMobile,
  IconBriefcase,
} from "@tabler/icons-react";
import Link from "next/link";
import { GradientButton } from "@/components/ui/GradientButton";
import { OutlineGradientButton } from "@/components/ui/OutlineGradientButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const features = [
  {
    icon: IconMapPin,
    title: "Location-Based Matching",
    description: "Find service providers in your area with our smart proximity search.",
  },
  {
    icon: IconShieldCheck,
    title: "Verified Providers",
    description: "All providers are verified to ensure quality and trustworthiness.",
  },
  {
    icon: IconClock,
    title: "Real-Time Availability",
    description: "See who's available right now and book instantly.",
  },
  {
    icon: IconDeviceMobile,
    title: "Works Offline",
    description: "Access your bookings and provider info even without internet.",
  },
];

const services = [
  { icon: "🔧", name: "Plumbing" },
  { icon: "🌱", name: "Gardening" },
  { icon: "🧹", name: "Cleaning" },
  { icon: "⚡", name: "Electrical" },
  { icon: "🎨", name: "Painting" },
  { icon: "🔨", name: "Handyman" },
];

export default function HomePage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  const heroBg = isDark 
    ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)"
    : "linear-gradient(135deg, #FFF8DC 0%, #FFFAF0 50%, #FFFFF0 100%)";

  return (
    <Box>
      {/* Theme Toggle */}
      <Box style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <ThemeToggle />
      </Box>

      {/* Hero Section */}
      <Box
        style={{
          background: heroBg,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container size="lg" py={rem(80)}>
          <Stack align="center" gap="xl">
            <Title
              order={1}
              ta="center"
              size={rem(56)}
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              IKAG Marketplace
            </Title>
            <Text
              size="xl"
              c="dimmed"
              ta="center"
              maw={600}
            >
              Find trusted local service providers for your everyday needs.
              From plumbing to gardening, cleaning to handyman services.
            </Text>
            <Group mt="lg">
              <GradientButton
                component={Link}
                href="/register"
                size="lg"
              >
                Get Started
              </GradientButton>
              <OutlineGradientButton
                component={Link}
                href="/login"
                size="lg"
              >
                Sign In
              </OutlineGradientButton>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Services Section */}
      <Container size="lg" py={rem(80)}>
        <Title order={2} ta="center" mb="md">
          Services Available
        </Title>
        <Text c="dimmed" ta="center" maw={600} mx="auto" mb="xl">
          Browse our wide range of local services
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
          {services.map((service) => (
            <Card
              key={service.name}
              withBorder
              padding="lg"
              radius="md"
              ta="center"
              style={{ cursor: "pointer" }}
            >
              <Text size={rem(40)} mb="xs">
                {service.icon}
              </Text>
              <Text fw={500}>{service.name}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* Features Section */}
      <Box bg={isDark ? "dark.8" : "gray.0"} py={rem(80)}>
        <Container size="lg">
          <Title order={2} ta="center" mb="md">
            Why Choose IKAG?
          </Title>
          <Text c="dimmed" ta="center" maw={600} mx="auto" mb="xl">
            We make finding and booking local services simple and reliable
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {features.map((feature) => (
              <Card key={feature.title} padding="lg" radius="md">
                <ThemeIcon
                  size="xl"
                  radius="md"
                  variant="gradient"
                  gradient={{ from: "yellow.6", to: "orange.5", deg: 135 }}
                  mb="md"
                >
                  <feature.icon size={24} />
                </ThemeIcon>
                <Text fw={500} mb="xs">
                  {feature.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {feature.description}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container size="lg" py={rem(80)}>
        <Card
          withBorder
          padding="xl"
          radius="lg"
          style={{
            background: "linear-gradient(135deg, #FFD700, #FF8C00)",
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon size={60} radius="xl" color="white" variant="filled">
              <IconBriefcase size={32} />
            </ThemeIcon>
            <Title order={2} c="white" ta="center">
              Are you a service provider?
            </Title>
            <Text c="white" ta="center" maw={500}>
              Join IKAG and connect with customers in your area.
              Set your own schedule and grow your business.
            </Text>
            <GradientButton
              component={Link}
              href="/register"
              size="lg"
              variant="white"
              color="dark"
              style={{ background: "white" }}
            >
              Join as Provider
            </GradientButton>
          </Stack>
        </Card>
      </Container>

      {/* Footer */}
      <Box bg={isDark ? "dark.9" : "gray.9"} py={rem(40)}>
        <Container size="lg">
          <Group justify="space-between" align="center">
            <div>
              <Title
                order={4}
                style={{
                  background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                IKAG Marketplace
              </Title>
              <Text size="sm" c="gray.5">
                © 2024 IKAG. All rights reserved.
              </Text>
            </div>
            <Group>
              <Anchor href="#" c="gray.5" size="sm">
                Terms
              </Anchor>
              <Anchor href="#" c="gray.5" size="sm">
                Privacy
              </Anchor>
              <Anchor href="#" c="gray.5" size="sm">
                Help
              </Anchor>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
