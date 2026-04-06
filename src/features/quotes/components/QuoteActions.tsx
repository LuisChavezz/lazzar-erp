"use client";

import { OrdenesIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";

export const QuoteActions = () => {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center gap-2 min-w-max">
      <Button
        variant="secondary"
        onClick={() => {
          document.dispatchEvent(new CustomEvent("quotes:exportCSV"));
        }}
        leftIcon={<OrdenesIcon className="w-4 h-4 shrink-0" />}
        className="shrink-0 rounded-full"
        title="Exportar a CSV (Excel)"
        aria-label="Exportar cotizaciones a CSV"
      >
        Exportar CSV
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          document.dispatchEvent(new CustomEvent("quotes:exportPDF"));
        }}
        leftIcon={<OrdenesIcon className="w-4 h-4 shrink-0" />}
        className="shrink-0 rounded-full"
        title="Exportar a PDF"
        aria-label="Exportar cotizaciones a PDF"
      >
        Exportar PDF
      </Button>
      </div>
    </div>
  );
};
