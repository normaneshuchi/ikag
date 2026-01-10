"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AppShell,
  Burger,
  Group,
  Title,
  NavLink,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  Divider,
  Box,
  rem,
  Drawer,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconSettings,
  IconLogout,
  IconUser,
  IconChevronDown,
  IconBriefcase,
  IconUsers,
  IconClipboardList,
  IconShieldCheck,
  IconMapPin,
} from "@tabler/icons-react";
import Link from "next/link";
import { authClient, useSession, getUserRole, type UserRole } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navItems: Record<UserRole, Array<{ label: string; href: string; icon: typeof IconHome }>> = {
  user: [
    { label: "Dashboard", href: "/dashboard", icon: IconHome },
    { label: "Find Providers", href: "/dashboard/providers", icon: IconMapPin },
    { label: "My Requests", href: "/dashboard/requests", icon: IconClipboardList },
  ],
  provider: [
    { label: "Dashboard", href: "/dashboard", icon: IconHome },
    { label: "My Profile", href: "/dashboard/profile", icon: IconUser },
    { label: "Service Requests", href: "/dashboard/requests", icon: IconClipboardList },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard", icon: IconHome },
    { label: "Service Types", href: "/dashboard/services", icon: IconBriefcase },
    { label: "Providers", href: "/dashboard/providers", icon: IconUsers },
    { label: "Verifications", href: "/dashboard/verifications", icon: IconShieldCheck },
  ],
};

// Navigation content component (reused in both desktop sidebar and mobile drawer)
function NavigationContent({
  items,
  pathname,
  role,
  onNavigate,
}: {
  items: Array<{ label: string; href: string; icon: typeof IconHome }>;
  pathname: string;
  role: UserRole;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Box mb="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {role === "admin" ? "Admin Panel" : role === "provider" ? "Provider Panel" : "My Account"}
        </Text>
      </Box>
      {items.map((item) => (
        <NavLink
          key={item.href}
          component={Link}
          href={item.href}
          label={item.label}
          leftSection={<item.icon size={18} />}
          active={pathname === item.href}
          variant="light"
          mb={4}
          style={{ borderRadius: rem(8) }}
          onClick={onNavigate}
        />
      ))}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  // Close drawer when navigating
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  const role = getUserRole(session?.user);
  const items = navItems[role];

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile Navigation Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="280px"
        padding="md"
        title={
          <Title
            order={4}
            style={{
              background: "linear-gradient(135deg, #FFD700, #FF8C00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            IKAG
          </Title>
        }
        hiddenFrom="sm"
        zIndex={300}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md" px="md">
          <NavigationContent
            items={items}
            pathname={pathname}
            role={role}
            onNavigate={closeDrawer}
          />
        </ScrollArea>
      </Drawer>

      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 280,
          breakpoint: "sm",
          collapsed: { mobile: true, desktop: false },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger
                opened={drawerOpened}
                onClick={openDrawer}
                hiddenFrom="sm"
                size="sm"
                aria-label="Toggle navigation"
              />
              <Title
                order={3}
                style={{
                  background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                IKAG
              </Title>
            </Group>

            <Group gap="sm">
              <ThemeToggle />
              <Menu
                width={200}
                position="bottom-end"
                transitionProps={{ transition: "pop-top-right" }}
                onClose={() => setUserMenuOpened(false)}
                onOpen={() => setUserMenuOpened(true)}
                withinPortal
              >
                <Menu.Target>
                  <UnstyledButton
                    style={{
                      padding: rem(4),
                      borderRadius: rem(8),
                    }}
                  >
                    <Group gap={7}>
                      <Avatar
                        src={session?.user?.image}
                        alt={session?.user?.name || "User"}
                        radius="xl"
                        size={30}
                        color="yellow"
                      >
                        {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                      </Avatar>
                      <Text fw={500} size="sm" visibleFrom="xs" c="var(--mantine-color-text)">
                        {session?.user?.name || "User"}
                      </Text>
                      <IconChevronDown
                        style={{
                          width: rem(12),
                          height: rem(12),
                          transform: userMenuOpened ? "rotate(180deg)" : "none",
                          transition: "transform 150ms ease",
                        }}
                      />
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Account</Menu.Label>
                  <Menu.Item
                    leftSection={<IconSettings size={14} />}
                    component={Link}
                    href="/dashboard/settings"
                  >
                    Settings
                  </Menu.Item>
                  <Divider my="xs" />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </AppShell.Header>

        {/* Desktop Navbar - always collapsed on mobile, shown on desktop */}
        <AppShell.Navbar p="md">
          <NavigationContent
            items={items}
            pathname={pathname}
            role={role}
          />
        </AppShell.Navbar>

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
