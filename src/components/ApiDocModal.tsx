import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiDocs: any;
}

const customScalarCss = `
  .light-mode,
  .dark-mode {
    --scalar-color-1: hsl(var(--foreground));
    --scalar-color-2: hsl(var(--muted-foreground));
    --scalar-color-3: hsl(var(--foreground));
    --scalar-color-accent: hsl(var(--primary));
    --scalar-background-1: hsl(var(--background));
    --scalar-background-2: hsl(var(--card));
    --scalar-background-3: hsl(var(--muted));
    --scalar-background-accent: hsl(var(--primary));
    --scalar-border-color: hsl(var(--border));
    --scalar-sidebar-background-1: hsl(var(--card));
    --scalar-sidebar-item-hover-background: hsl(var(--accent));
    --scalar-sidebar-item-active-background: hsl(var(--accent));
    --scalar-sidebar-border-color: hsl(var(--border));
    --scalar-sidebar-color-1: hsl(var(--card-foreground));
    --scalar-sidebar-color-2: hsl(var(--muted-foreground));
    --scalar-sidebar-color-active: hsl(var(--accent-foreground));
    --scalar-sidebar-search-background: hsl(var(--muted));
    --scalar-sidebar-search-border-color: hsl(var(--border));
    --scalar-sidebar-search-color: hsl(var(--foreground));
  }
`;

const ApiDocModal: React.FC<ApiDocModalProps> = ({
  isOpen,
  onClose,
  apiDocs,
}) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Clear hash when modal closes to avoid confusion
  useEffect(() => {
    if (!isOpen && window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>API Documentation</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh]">
          <ApiReferenceReact
            configuration={{
              theme: "none",
              darkMode: isDark,
              hideModels: false,
              content: apiDocs,
              customCss: customScalarCss,
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiDocModal;
