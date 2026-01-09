import { Container, Box } from "@mantine/core";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #FFF8DC 0%, #FFFAF0 50%, #FFFFF0 100%)",
      }}
    >
      <Container size="xs" p="xl">
        {children}
      </Container>
    </Box>
  );
}
