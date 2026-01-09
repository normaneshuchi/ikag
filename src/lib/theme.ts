"use client";

import { createTheme, MantineColorsTuple, rem } from "@mantine/core";

// Gold color palette
const gold: MantineColorsTuple = [
  "#FFF9E6", // 0 - lightest
  "#FFF3CC",
  "#FFE799",
  "#FFDB66",
  "#FFCF33",
  "#FFD700", // 5 - primary gold
  "#E6C200",
  "#CCB000",
  "#B39C00",
  "#998700", // 9 - darkest
];

export const theme = createTheme({
  // Use Outfit as the primary font
  fontFamily: "Outfit, sans-serif",
  fontFamilyMonospace: "Monaco, Courier, monospace",
  headings: {
    fontFamily: "Outfit, sans-serif",
    fontWeight: "600",
  },

  // Gold as primary color
  primaryColor: "gold",
  colors: {
    gold,
  },

  // Default radius for rounded corners
  defaultRadius: "md",

  // Spacing
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // Shadows - subtle for minimalist design
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.1)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.15)",
  },

  // Component-specific styles
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: "all 0.2s ease",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Textarea: {
      defaultProps: {
        radius: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
    },
    Notification: {
      defaultProps: {
        radius: "md",
      },
    },
  },

  // Other theme settings
  cursorType: "pointer",
  focusRing: "auto",
  respectReducedMotion: true,
});

// Gradient styles for buttons
export const gradientStyles = {
  // Primary gradient (gold to orange)
  primary: {
    from: "gold.5",
    to: "orange.5",
    deg: 135,
  },
  // Reverse gradient
  reverse: {
    from: "orange.5",
    to: "gold.5",
    deg: 135,
  },
  // Subtle gradient
  subtle: {
    from: "gold.3",
    to: "gold.5",
    deg: 135,
  },
};

// CSS for gradient border on outline buttons
export const gradientBorderStyles = `
  .gradient-border-button {
    position: relative;
    background: transparent;
    border: 2px solid transparent;
    transition: all 0.3s ease;
  }

  .gradient-border-button::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(135deg, #FFD700, #FF8C00);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .gradient-border-button:hover::before {
    opacity: 1;
  }

  .gradient-border-button:hover {
    border-color: transparent;
  }
`;
