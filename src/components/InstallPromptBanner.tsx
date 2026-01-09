"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Group,
  Text,
  Button,
  CloseButton,
  Transition,
} from "@mantine/core";
import { IconDownload, IconDeviceMobile } from "@tabler/icons-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function checkIfInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(window.navigator as unknown as { standalone?: boolean }).standalone
  );
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => checkIfInstalled());

  useEffect(() => {
    // Check if already installed
    if (isInstalled) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom banner
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  if (isInstalled) return null;

  return (
    <Transition mounted={showBanner} transition="slide-up" duration={300}>
      {(styles) => (
        <Paper
          style={{
            ...styles,
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderRadius: "16px 16px 0 0",
            background: "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)",
          }}
          p="md"
          shadow="xl"
        >
          <Group justify="space-between" wrap="nowrap">
            <Group wrap="nowrap" gap="md">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconDeviceMobile size={28} color="white" />
              </div>
              <div>
                <Text fw={600} c="white" size="md">
                  Install IKAG
                </Text>
                <Text size="sm" c="white" opacity={0.9}>
                  Add to home screen for the best experience
                </Text>
              </div>
            </Group>

            <Group gap="xs" wrap="nowrap">
              <Button
                variant="white"
                color="dark"
                size="sm"
                leftSection={<IconDownload size={16} />}
                onClick={handleInstall}
              >
                Install
              </Button>
              <CloseButton
                variant="subtle"
                c="white"
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
              />
            </Group>
          </Group>
        </Paper>
      )}
    </Transition>
  );
}
