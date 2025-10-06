import { Loader2 } from "lucide-react";
import { cn } from "@/utils/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export function LoadingSpinner({
  size = "md",
  className,
  text,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeMap[size])}
        aria-hidden="true"
      />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}
