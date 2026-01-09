"use client";

import { Container, Box, useMantineColorScheme } from "@mantine/core";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colorScheme } = useMantineColorScheme();
  
  const lightBg = "linear-gradient(135deg, #FFF8DC 0%, #FFFAF0 50%, #FFFFF0 100%)";
  const darkBg = "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)";

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colorScheme === "dark" ? darkBg : lightBg,
        position: "relative",
      }}
    >
      <Box style={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>
      <Container size="xs" p="xl" style={{ minWidth: 320 }}>
        {children}
      </Container>
    </Box>
  );
}
