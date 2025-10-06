import { useState, useEffect, lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const RedocStandalone = lazy(() =>
  import("redoc").then((mod) => ({ default: mod.RedocStandalone }))
);

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
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading documentation..." />
              </div>
            }
          >
            <RedocStandalone
              spec={apiDocs}
              options={{
                theme: {
                  colors: {
                    primary: {
                      main: isDark ? "#ffffff" : "#000000",
                    },
                  },
                  typography: {
                    fontSize: "14px",
                    fontFamily: "inherit",
                  },
                },
                scrollYOffset: 0,
                hideDownloadButton: false,
                disableSearch: false,
                nativeScrollbars: true,
              }}
            />
          </Suspense>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiDocModal;
