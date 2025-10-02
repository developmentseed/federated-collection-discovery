import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// Custom swagger style override for dark mode only
import "../css/swagger-dark.css";

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiDocs: any;
}

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>API Documentation</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh]">
          {/* Apply dark mode class conditionally */}
          <div className={isDark ? "swagger-dark" : ""}>
            <SwaggerUI spec={apiDocs} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiDocModal;
