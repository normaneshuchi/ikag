"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { gradientStyles } from "@/lib/theme";
import { forwardRef } from "react";

interface GradientButtonProps extends ButtonProps {
  gradientType?: "primary" | "reverse" | "subtle";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: any;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  function GradientButton({ gradientType = "primary", children, ...props }, ref) {
    return (
      <Button
        ref={ref}
        variant="gradient"
        gradient={gradientStyles[gradientType]}
        styles={{
          root: {
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
          },
        }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GradientButton.displayName = "GradientButton";
