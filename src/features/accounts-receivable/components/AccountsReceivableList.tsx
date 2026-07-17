"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { WarningFilledIcon, RejectIcon } from "@/src/components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { accountsReceivableColumns } from "./AccountsReceivableColumns";
import { AccountsReceivableAgingSummary } from "./AccountsReceivableAgingSummary";
import { RegisterPendingInvoiceDialog } from "./RegisterPendingInvoiceDialog";
import { useCuentasPorCobrar } from "../hooks/useCuentasPorCobrar";
import {
  computeAgingBuckets,
  computeCxcKpis,
  mapCuentasToRows,
  startOfTodayUTC,
} from "../utils/accounts-receivable.utils";

// Valores exactos del estatus del backend. El filtro de la tabla es en cliente:
// `DataTable` compara `String(fila.estatus) === value`, así que las opciones
// deben coincidir con los strings reales de la respuesta.
const ESTATUS_FILTER = [
  { value: "Pendiente", label: "Pendiente" },
  { value: "Parcial", label: "Parcial" },
  { value: "Pagada", label: "Pagada" },
  { value: "Cancelada", label: "Cancelada" },
  { value: "Vencida", label: "Vencida" },
];

export const AccountsReceivableList = () => {
  const { cuentas, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useCuentasPorCobrar();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla y
  // avisa por toast (ver `useCuentasPorCobrar`). Mismo patrón que
  // `InvoiceList`/`StockList`.
  const showError = isError && !hasLoaded;

  // "Hoy" se calcula UNA sola vez y se comparte entre filas, KPIs y antigüedad.
  const today = startOfTodayUTC();
  const rows = mapCuentasToRows(cuentas, today);
  const kpis = computeCxcKpis(cuentas, today);
  const agingBuckets = computeAgingBuckets(cuentas, today);

  const showBanner = !showError && !bannerDismissed && kpis.cuentasVencidas > 0;

  // Registrar una CxC pendiente (`RegisterPendingInvoiceDialog`, un `POST`
  // independiente del `GET` del listado) vive en el toolbar de `DataTable`
  // —misma posición que en el resto de tablas—. `DataTable` se monta SIEMPRE
  // (recibe `isLoading`/`isError` y alterna solo su cuerpo), así que el botón
  // sigue disponible aunque el listado esté cargando o haya fallado.
  const table = (
    <DataTable
      columns={accountsReceivableColumns}
      data={rows}
      title="Cuentas por Cobrar"
      searchPlaceholder="Buscar folio, cliente o factura..."
      filterConfig={[{ id: "estatus", label: "Estatus", options: ESTATUS_FILTER }]}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay cuentas por cobrar registradas."
      actionButton={<RegisterPendingInvoiceDialog />}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las cuentas por cobrar"
      errorMessage={error?.message}
      loadingAriaLabel="Cargando cuentas por cobrar"
    />
  );

  // Ante un error de carga inicial se muestra SOLO la tabla: su toolbar mantiene
  // "Registrar CxC" disponible y su cuerpo muestra el `ErrorState`; se omiten la
  // antigüedad y la alerta, igual que antes (no hay datos que resumir).
  if (showError) {
    return <div className="space-y-6">{table}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alerta de cuentas vencidas */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <WarningFilledIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Cuentas vencidas</p>
            <p className="text-amber-700 dark:text-amber-400">
              Tienes {kpis.cuentasVencidas}{" "}
              {kpis.cuentasVencidas === 1 ? "cuenta vencida" : "cuentas vencidas"} por un total
              de{" "}
              <span className="font-semibold tabular-nums">
                {formatCurrency(kpis.totalVencido)}
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Descartar alerta"
            className="p-1 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            <RejectIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Antigüedad de saldos */}
      <AccountsReceivableAgingSummary buckets={agingBuckets} isLoading={isLoading} />

      {/* Tabla principal: Cuentas por Cobrar (maneja carga/error en su cuerpo) */}
      {table}
    </div>
  );
};
