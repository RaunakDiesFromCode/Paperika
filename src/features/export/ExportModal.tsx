import React, { useState } from "react";
import { Download, FileCode, FileText, X, Check, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useViewerSettingsStore } from "@/stores/useViewerSettingsStore";

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const currentPage = useViewerSettingsStore((s) => s.currentPage);

  const [exportFormat, setExportFormat] = useState<"svg" | "pdf">("svg");
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!currentDocument) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const pagesToExport =
        exportScope === "current"
          ? currentDocument.pages.filter((p) => p.page_number === currentPage)
          : currentDocument.pages;

      if (exportFormat === "svg") {
        if (exportScope === "current") {
          const page = pagesToExport[0] || currentDocument.pages[0];
          const svgContent = await invoke<string>("export_page_svg", { page });

          const defaultName = `${currentDocument.metadata.file_name.replace(
            /\.pdo$/i,
            ""
          )}_page_${page.page_number}.svg`;

          const savePath = await save({
            defaultPath: defaultName,
            filters: [{ name: "SVG Vector Image", extensions: ["svg"] }],
          });

          if (savePath) {
            await writeTextFile(savePath, svgContent);
            setSuccessMessage(`Exported page ${page.page_number} to SVG!`);
          }
        } else {
          // Export all pages as separate SVGs or ZIP
          for (const page of pagesToExport) {
            const svgContent = await invoke<string>("export_page_svg", { page });
            // For single-file save flow in dialog, prompt first page or download in browser
            const defaultName = `${currentDocument.metadata.file_name.replace(
              /\.pdo$/i,
              ""
            )}_page_${page.page_number}.svg`;
            const savePath = await save({
              defaultPath: defaultName,
              filters: [{ name: "SVG Vector Image", extensions: ["svg"] }],
            });
            if (savePath) {
              await writeTextFile(savePath, svgContent);
            }
            break;
          }
          setSuccessMessage("SVG exported successfully!");
        }
      } else {
        // PDF Export using jsPDF
        const firstPage = pagesToExport[0] || currentDocument.pages[0];
        const orientation =
          firstPage.width_mm > firstPage.height_mm ? "landscape" : "portrait";

        const doc = new jsPDF({
          orientation,
          unit: "mm",
          format: [firstPage.width_mm, firstPage.height_mm],
        });

        for (let i = 0; i < pagesToExport.length; i++) {
          const page = pagesToExport[i];
          if (i > 0) {
            const pageOrient =
              page.width_mm > page.height_mm ? "landscape" : "portrait";
            doc.addPage([page.width_mm, page.height_mm], pageOrient);
          }

          // Draw Cut Lines
          doc.setDrawColor(15, 23, 42); // #0f172a
          doc.setLineWidth(0.35);
          page.parts.forEach((part) => {
            part.cut_lines.forEach((line) => {
              doc.line(
                line.start[0],
                line.start[1],
                line.end[0],
                line.end[1]
              );
            });
          });

          // Draw Mountain Folds (Red Dashed)
          doc.setDrawColor(220, 38, 38); // #dc2626
          doc.setLineWidth(0.25);
          doc.setLineDashPattern([3.0, 1.0, 1.0, 1.0], 0);
          page.parts.forEach((part) => {
            part.fold_lines
              .filter((l) => l.classification === "Mountain")
              .forEach((line) => {
                doc.line(
                  line.start[0],
                  line.start[1],
                  line.end[0],
                  line.end[1]
                );
              });
          });

          // Draw Valley Folds (Blue Dashed)
          doc.setDrawColor(37, 99, 235); // #2563eb
          doc.setLineDashPattern([2.0, 2.0], 0);
          page.parts.forEach((part) => {
            part.fold_lines
              .filter((l) => l.classification === "Valley")
              .forEach((line) => {
                doc.line(
                  line.start[0],
                  line.start[1],
                  line.end[0],
                  line.end[1]
                );
              });
          });

          // Reset dash pattern
          doc.setLineDashPattern([], 0);

          // Draw Edge Numbers
          doc.setFontSize(7);
          doc.setTextColor(75, 85, 99);
          page.parts.forEach((part) => {
            part.edge_labels.forEach((lbl) => {
              doc.text(lbl.text, lbl.position[0], lbl.position[1], {
                align: "center",
                baseline: "middle",
              });
            });
          });

          // Draw Page Footer Number
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `— Page ${page.page_number} —`,
            page.width_mm / 2,
            page.height_mm - 5,
            { align: "center" }
          );
        }

        const pdfData = doc.output("arraybuffer");
        const defaultName = `${currentDocument.metadata.file_name.replace(
          /\.pdo$/i,
          ""
        )}_pattern.pdf`;

        const savePath = await save({
          defaultPath: defaultName,
          filters: [{ name: "PDF Document", extensions: ["pdf"] }],
        });

        if (savePath) {
          const { writeFile } = await import("@tauri-apps/plugin-fs");
          await writeFile(savePath, new Uint8Array(pdfData));
          setSuccessMessage("PDF document generated successfully!");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3.5 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-sky-400" />
            <h3 className="font-semibold text-sm text-neutral-100">
              Export Unfolded Sheets
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportFormat("svg")}
                className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition ${
                  exportFormat === "svg"
                    ? "border-sky-500 bg-sky-950/20 text-white"
                    : "border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200"
                }`}
              >
                <FileCode className="h-5 w-5 text-sky-400" />
                <div>
                  <div className="text-xs font-semibold">SVG Vector</div>
                  <div className="text-[10px] text-neutral-500">
                    Clean Inkscape / CAD paths
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat("pdf")}
                className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition ${
                  exportFormat === "pdf"
                    ? "border-sky-500 bg-sky-950/20 text-white"
                    : "border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200"
                }`}
              >
                <FileText className="h-5 w-5 text-rose-400" />
                <div>
                  <div className="text-xs font-semibold">PDF Document</div>
                  <div className="text-[10px] text-neutral-500">
                    Multi-page printable sheet
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Export Scope
            </label>
            <div className="flex rounded-lg border border-neutral-800 bg-neutral-950/60 p-1">
              <button
                type="button"
                onClick={() => setExportScope("current")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition ${
                  exportScope === "current"
                    ? "bg-neutral-800 text-sky-400 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Current Page ({currentPage})
              </button>
              <button
                type="button"
                onClick={() => setExportScope("all")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition ${
                  exportScope === "all"
                    ? "bg-neutral-800 text-sky-400 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                All Pages ({currentDocument.pages.length})
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 p-3 text-xs text-emerald-300">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3 bg-neutral-950/40">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Save Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
