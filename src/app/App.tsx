import React, { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { SplitPane } from "@/components/layout/SplitPane";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { ErrorModal } from "@/components/common/ErrorModal";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";

export const App: React.FC = () => {
  const { currentDocument, loadDocumentFromPath, closeDocument } = useDocumentStore();
  const { toggleSidebar, setShadingMode } = useViewerSettingsStore();

  // Handle native file drag-and-drop & keyboard shortcuts
  useEffect(() => {
    let unlistenDragDrop: (() => void) | undefined;

    const setupTauriListeners = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<string[]>(
          "tauri://drag-drop",
          (event) => {
            const paths = event.payload;
            if (paths && paths.length > 0) {
              const pdoPath = paths.find((p) =>
                p.toLowerCase().endsWith(".pdo")
              );
              if (pdoPath) {
                loadDocumentFromPath(pdoPath);
              }
            }
          }
        );
        unlistenDragDrop = unlisten;
      } catch {
        // Fallback for browser mode
      }
    };

    setupTauriListeners();

    // Standard macOS keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd + W: Close document
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        closeDocument();
      }
      // Cmd + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      // 1: Solid+Edges, 2: Solid, 3: Wireframe
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "1") setShadingMode("solid_edges");
        if (e.key === "2") setShadingMode("solid");
        if (e.key === "3") setShadingMode("wireframe");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (unlistenDragDrop) unlistenDragDrop();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loadDocumentFromPath, closeDocument, toggleSidebar, setShadingMode]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Top Application Bar */}
      <Header />

      {/* Main Workspace Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {currentDocument ? (
          <>
            <main className="flex-1 overflow-hidden">
              <SplitPane />
            </main>
            <Sidebar />
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Feedback Modals */}
      <LoadingOverlay />
      <ErrorModal />
    </div>
  );
};
export default App;
