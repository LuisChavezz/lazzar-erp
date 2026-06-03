/**
 * ReceiptUploadDocument.tsx
 *
 * Step 1 of the goods receipt onboarding flow.
 * Provides a visual-only drag-and-drop area for uploading
 * purchase order PDFs or supplier XMLs.
 *
 * This component is purely presentational — file upload
 * functionality is not yet implemented.
 */

import { FileText, Upload } from "lucide-react";

export function ReceiptUploadDocument() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Drag-and-drop zone */}
      <div
        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-400 dark:border-white/30 bg-white dark:bg-white/5 px-6 py-10 transition-colors"
      >
        {/* Upload icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20">
          <Upload className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>

        {/* Primary text */}
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Importar Orden
          </p>
          <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Arrastre el PDF de la Orden de Compra o XML del proveedor.
          </p>
        </div>

        {/* Visual-only file type indicator */}
        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 px-2 py-0.5">
            <FileText className="h-3 w-3" />
            PDF
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 px-2 py-0.5">
            <FileText className="h-3 w-3" />
            XML
          </span>
        </div>

        {/* Separator */}
        <div className="flex w-full items-center gap-3">
          <div className="flex-1 border-t border-slate-200 dark:border-white/10" />
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">o</span>
          <div className="flex-1 border-t border-slate-200 dark:border-white/10" />
        </div>

        {/* Visual-only file selector button */}
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-5 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 shadow-sm transition-all"
          aria-disabled
        >
          <FileText className="h-4 w-4" />
          Seleccionar Archivo
        </button>

        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          PDF o XML — Máx. 10 MB
        </p>
      </div>
    </div>
  );
}
