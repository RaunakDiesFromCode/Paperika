import React from "react";
import { Loader2 } from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";

export const LoadingOverlay: React.FC = () => {
  const { isLoading, loadingStatus } = useDocumentStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-xs font-medium text-neutral-300">
          {loadingStatus || "Parsing PDO document…"}
        </p>
      </div>
    </div>
  );
};
