"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { forwardRef } from "react";

interface OutlineGradientButtonProps extends ButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: any;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export const OutlineGradientButton = forwardRef<
  HTMLButtonElement,
  OutlineGradientButtonProps
>(function OutlineGradientButton({ children, className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      variant="outline"
      className={`gradient-border-button ${className || ""}`}
      styles={{
        root: {
          position: "relative",
          background: "transparent",
          borderColor: "var(--mantine-color-gold-5)",
          color: "var(--mantine-color-gold-7)",
          transition: "all 0.3s ease",
          overflow: "visible",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "-2px",
            zIndex: -1,
            borderRadius: "inherit",
            padding: "2px",
            background: "linear-gradient(135deg, #FFD700, #FF8C00)",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            opacity: 0,
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
          },
          "&:hover": {
            borderColor: "transparent",
            background: "rgba(255, 215, 0, 0.05)",
            "&::before": {
              opacity: 1,
            },
          },
        },
      }}
      {...props}
    >
      {children}
    </Button>
  );
});

OutlineGradientButton.displayName = "OutlineGradientButton";
