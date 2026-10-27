"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { WarningFilledIcon, RejectIcon } from "@/src/components/Icons";
import { formatCurrencyTotalsInline } from "@/src/components/CurrencyTotalsValue";
import { getAccountsReceivableColumns } from "./AccountsReceivableColumns";
import { AccountsReceivableDetailDialog } from "./AccountsReceivableDetailDialog";
import { AccountsReceivableAgingSummary } from "./AccountsReceivableAgingSummary";
import { RegisterPendingInvoiceDialog } from "./RegisterPendingInvoiceDialog";
import { useCuentasPorCobrar } from "../hooks/useCuentasPorCobrar";
import {
  computeAgingBuckets,
  computeCxcKpis,
  mapCuentasToRows,
} from "../utils/accounts-receivable.utils";

// Valores exactos del estatus del backend. El filtro de la tabla es en cliente:
// `DataTable` compara `String(fila.estatus) === value`, así que las opciones
// deben coincidir con los strings reales de la respuesta.
const ESTATUS_FILTER = [
  { value: "Pendiente", label: "Pendiente" },
  { value: "Parcial", label: "Parcial" },
  { value: "Pagada", label: "Pagada" },
  { value: "Cancelada", label: "Cancelada" },
];

/**
 * `today` es el día del backend ("YYYY-MM-DD") que calcula UNA vez
 * `AccountsReceivableView` y comparte con los indicadores y el detalle.
 */
export const AccountsReceivableList = ({ today }: { today: string }) => {
  const { cuentas, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useCuentasPorCobrar();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // Detalle abierto, por id: el diálogo trae su propia cuenta, así que sigue
  // abierto (y se refresca) aunque la fila salga del filtro o de la página.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const columns = getAccountsReceivableColumns({ onViewDetail: setOpenDetailId });

  // Ver el listado exige `R-CONTABILIDAD-CXC` (ver `routePermissions`);
  // registrar una CxC exige además `C-CONTABILIDAD-CXC`. `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-CONTABILIDAD-CXC", session?.user);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla y
  // avisa por toast (ver `useCuentasPorCobrar`). Mismo patrón que
  // `InvoiceList`.
  const showError = isInitialLoadError(isError, hasLoaded);

  const rows = mapCuentasToRows(cuentas, today);
  const kpis = computeCxcKpis(cuentas, today);
  const agingGroups = computeAgingBuckets(cuentas, today);

  const showBanner = !showError && !bannerDismissed && kpis.cuentasVencidas > 0;

  // Registrar una CxC pendiente (`RegisterPendingInvoiceDialog`, un `POST`
  // independiente del `GET` del listado) vive en el toolbar de `DataTable`
  // —misma posición que en el resto de tablas—. `DataTable` se monta SIEMPRE
  // (recibe `isLoading`/`isError` y alterna solo su cuerpo), así que el botón
  // sigue disponible aunque el listado esté cargando o haya fallado.
  const table = (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Buscar folio, cliente o factura..."
      filterConfig={[{ id: "estatus", label: "Estatus", options: ESTATUS_FILTER }]}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay cuentas por cobrar registradas."
      actionButton={canCreate ? <RegisterPendingInvoiceDialog /> : undefined}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las cuentas por cobrar"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando cuentas por cobrar"
    />
  );

  // Un único `return`: la tabla se monta SIEMPRE (su toolbar mantiene
  // "Registrar CxC" disponible y su cuerpo muestra la carga/`ErrorState`).
  // Ante un error de carga inicial (`showError`) se omiten la alerta y la
  // antigüedad —igual que antes—: no hay datos que resumir.
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
                {formatCurrencyTotalsInline(kpis.totalVencido)}
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

      {/* Antigüedad de saldos (oculta ante un error de carga inicial) */}
      {!showError && (
        <AccountsReceivableAgingSummary groups={agingGroups} isLoading={isLoading} />
      )}

      {/* Tabla principal: Cuentas por Cobrar (maneja carga/error en su cuerpo) */}
      {table}

      {/* Montado solo al abrir: el diálogo —y su `useCuentaPorCobrarDetail`— no
          existe hasta entonces, así que la tabla no dispara peticiones de detalle. */}
      {openDetailId !== null && (
        <AccountsReceivableDetailDialog
          cuentaId={openDetailId}
          today={today}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDetailId(null);
          }}
        />
      )}
    </div>
  );
};
