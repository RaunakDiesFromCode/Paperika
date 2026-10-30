import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
import { useDocumentStore } from "@/stores/useDocumentStore";

export const ErrorModal: React.FC = () => {
  const { errorMessage, errorDetails, clearError } = useDocumentStore();
  const [showDetails, setShowDetails] = useState(false);

  if (!errorMessage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-rose-900/60 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-950/60 bg-rose-950/20 px-4 py-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h3 className="text-xs font-semibold">Document Error</h3>
          </div>
          <button
            onClick={clearError}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-medium text-neutral-200">{errorMessage}</p>

          {errorDetails && (
            <div>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300"
              >
                <span>{showDetails ? "Hide technical details" : "Show technical details"}</span>
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {showDetails && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded bg-neutral-950 p-2.5 font-mono text-[11px] text-rose-300/80 border border-neutral-800">
                  {errorDetails}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-neutral-800 bg-neutral-950/40 px-4 py-2.5">
          <button
            onClick={clearError}
            className="rounded-lg bg-neutral-800 px-3.5 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
