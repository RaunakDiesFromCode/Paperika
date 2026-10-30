import { create } from "zustand";
import { DocumentDto } from "@/types/document";

interface DocumentState {
  currentDocument: DocumentDto | null;
  isLoading: boolean;
  loadingStatus: string;
  errorMessage: string | null;
  errorDetails: string | null;
  recentFiles: string[];

  // Actions
  loadDocumentFromPath: (path: string) => Promise<boolean>;
  loadDocumentFromBytes: (bytes: Uint8Array, fileName: string) => Promise<boolean>;
  closeDocument: () => void;
  clearError: () => void;
  removeRecentFile: (path: string) => void;
}

const RECENT_FILES_KEY = "paperika_recent_files";

function getStoredRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentFiles(files: string[]) {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files.slice(0, 10)));
  } catch {}
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  isLoading: false,
  loadingStatus: "",
  errorMessage: null,
  errorDetails: null,
  recentFiles: getStoredRecentFiles(),

  loadDocumentFromPath: async (path: string) => {
    set({
      isLoading: true,
      loadingStatus: `Opening ${path.split("/").pop()}...`,
      errorMessage: null,
      errorDetails: null,
    });

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const doc = await invoke<DocumentDto>("open_pdo_file", { path });

      // Update recent files
      const updatedRecent = [
        path,
        ...get().recentFiles.filter((f) => f !== path),
      ].slice(0, 10);
      saveRecentFiles(updatedRecent);

      set({
        currentDocument: doc,
        isLoading: false,
        loadingStatus: "",
        recentFiles: updatedRecent,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        isLoading: false,
        loadingStatus: "",
        errorMessage: `Failed to open document: ${path.split("/").pop()}`,
        errorDetails: msg,
      });
      return false;
    }
  },

  loadDocumentFromBytes: async (bytes: Uint8Array, fileName: string) => {
    set({
      isLoading: true,
      loadingStatus: `Parsing ${fileName}...`,
      errorMessage: null,
      errorDetails: null,
    });

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const doc = await invoke<DocumentDto>("parse_pdo_bytes", {
        bytes: Array.from(bytes),
        fileName,
      });

      set({
        currentDocument: doc,
        isLoading: false,
        loadingStatus: "",
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        isLoading: false,
        loadingStatus: "",
        errorMessage: `Failed to parse document: ${fileName}`,
        errorDetails: msg,
      });
      return false;
    }
  },

  closeDocument: () => {
    set({
      currentDocument: null,
      errorMessage: null,
      errorDetails: null,
    });
  },

  clearError: () => {
    set({
      errorMessage: null,
      errorDetails: null,
    });
  },

  removeRecentFile: (path: string) => {
    const updated = get().recentFiles.filter((f) => f !== path);
    saveRecentFiles(updated);
    set({ recentFiles: updated });
  },
}));
