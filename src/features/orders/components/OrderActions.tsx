"use client";

import { OrdenesIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";

export const OrderActions = () => {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center gap-2 min-w-max">
      <Button
        variant="secondary"
        disabled
        leftIcon={<OrdenesIcon className="w-4 h-4 shrink-0" />}
        className="shrink-0 rounded-full"
        title="Actualizar estados"
        aria-label="Actualizar estados de pedidos"
        aria-disabled="true"
      >
        Actualizar estados
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          document.dispatchEvent(new CustomEvent("orders:exportCSV"));
        }}
        leftIcon={<OrdenesIcon className="w-4 h-4 shrink-0" />}
        className="shrink-0 rounded-full"
        title="Exportar a CSV (Excel)"
        aria-label="Exportar pedidos a CSV"
      >
        Exportar CSV
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          document.dispatchEvent(new CustomEvent("orders:exportPDF"));
        }}
        leftIcon={<OrdenesIcon className="w-4 h-4 shrink-0" />}
        className="shrink-0 rounded-full"
        title="Exportar a PDF"
        aria-label="Exportar pedidos a PDF"
      >
        Exportar PDF
      </Button>
      </div>
    </div>
  );
};
