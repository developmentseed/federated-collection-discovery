import { cva } from "class-variance-authority"

/**
 * Responsive spacing utilities for consistent gaps and padding
 */
export const stack = cva("flex flex-col", {
  variants: {
    gap: {
      xs: "gap-1 sm:gap-2",
      sm: "gap-2 sm:gap-3",
      md: "gap-3 sm:gap-4",
      lg: "gap-4 sm:gap-6",
      xl: "gap-6 sm:gap-8",
    },
  },
  defaultVariants: {
    gap: "md",
  },
})

export const hstack = cva("flex flex-row items-center", {
  variants: {
    gap: {
      xs: "gap-1 sm:gap-2",
      sm: "gap-2 sm:gap-3",
      md: "gap-3 sm:gap-4",
      lg: "gap-4 sm:gap-6",
    },
  },
  defaultVariants: {
    gap: "md",
  },
})

/**
 * Responsive text size utilities
 */
export const text = cva("", {
  variants: {
    size: {
      xs: "text-[10px] sm:text-xs",
      sm: "text-xs sm:text-sm",
      base: "text-sm sm:text-base",
      lg: "text-base sm:text-lg",
      xl: "text-lg sm:text-xl",
      "2xl": "text-xl sm:text-2xl",
      "3xl": "text-2xl sm:text-3xl",
      "4xl": "text-3xl lg:text-4xl",
    },
  },
  defaultVariants: {
    size: "base",
  },
})

/**
 * Touch-friendly button/interactive element sizes
 */
export const touchTarget = cva("", {
  variants: {
    size: {
      default: "min-h-[44px]",
      sm: "min-h-[36px]",
      lg: "min-h-[52px]",
      icon: "h-8 w-8 sm:h-9 sm:w-9",
      "icon-lg": "h-11 w-11",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

/**
 * Icon size utilities
 */
export const icon = cva("", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-3 w-3 sm:h-4 sm:w-4",
      md: "h-4 w-4",
      lg: "h-5 w-5 sm:h-6 sm:w-6",
      xl: "h-6 w-6 sm:h-8 sm:w-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

/**
 * Container/panel padding utilities
 */
export const container = cva("w-full", {
  variants: {
    padding: {
      none: "p-0",
      xs: "p-2 sm:p-3",
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-6",
      lg: "p-6 sm:p-8",
    },
    maxWidth: {
      full: "max-w-full",
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "4xl": "max-w-4xl",
      "7xl": "max-w-7xl",
      custom: "max-w-[2000px]",
    },
  },
  defaultVariants: {
    padding: "md",
    maxWidth: "full",
  },
})

/**
 * Responsive modal/dialog widths
 */
export const dialog = cva("", {
  variants: {
    size: {
      sm: "w-[95vw] max-w-md",
      md: "w-[95vw] max-w-2xl",
      lg: "w-[95vw] sm:w-[90vw] lg:w-[70vw] xl:w-[60vw] 2xl:max-w-[50vw]",
      full: "w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[90vw]",
    },
    height: {
      auto: "",
      constrained: "max-h-[90vh] overflow-y-auto",
    },
  },
  defaultVariants: {
    size: "md",
    height: "constrained",
  },
})

/**
 * Sidebar/panel widths
 */
export const sidebar = cva("w-full flex-shrink-0", {
  variants: {
    size: {
      sm: "lg:w-[320px] xl:w-[360px]",
      md: "lg:w-[420px] xl:w-[480px]",
      lg: "lg:w-[520px] xl:w-[600px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

/**
 * Sheet/drawer widths for mobile
 */
export const sheet = cva("", {
  variants: {
    size: {
      sm: "w-[80vw] sm:w-[320px]",
      md: "w-[90vw] sm:w-[400px]",
      lg: "w-[95vw] sm:w-[500px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

/**
 * Responsive visibility utilities
 */
export const visibility = {
  mobile: "lg:hidden",
  desktop: "hidden lg:block",
  tablet: "hidden sm:block lg:hidden",
  desktopInline: "hidden lg:inline",
  mobileInline: "sm:hidden",
}

/**
 * Common layout patterns
 */
export const layout = {
  flexCol: "flex flex-col",
  flexRow: "flex flex-row items-center",
  flexColSm: "flex flex-col sm:flex-row",
  grid2: "grid grid-cols-1 sm:grid-cols-2 gap-4",
  grid3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
}
