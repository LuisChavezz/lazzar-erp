"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { WarningFilledIcon, RejectIcon } from "@/src/components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { accountsPayableColumns } from "./AccountsPayableColumns";
import { pagosColumns } from "./PagosColumns";
import { AccountsPayableAgingSummary } from "./AccountsPayableAgingSummary";
import { MOCK_CXP, MOCK_PAGOS, CXP_KPIS } from "../mocks/accounts-payable.mock";

const ESTATUS_FILTER = [
  { value: "vigente", label: "Vigente" },
  { value: "vencida", label: "Vencida" },
  { value: "parcial", label: "Parcial" },
  { value: "pagada", label: "Pagada" },
];

export const AccountsPayableList = () => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const showBanner = !bannerDismissed && CXP_KPIS.cuentasVencidas > 0;

  return (
    <div className="space-y-6">
      {/* Alerta de cuentas vencidas con proveedores (tono naranja para
          distinguir visualmente este módulo del de Cuentas por Cobrar). */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/20 px-4 py-3">
          <WarningFilledIcon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-orange-800 dark:text-orange-300">
              Cuentas vencidas con proveedores
            </p>
            <p className="text-orange-700 dark:text-orange-400">
              Tienes {CXP_KPIS.cuentasVencidas}{" "}
              {CXP_KPIS.cuentasVencidas === 1 ? "cuenta vencida" : "cuentas vencidas"} con
              proveedores por un total de{" "}
              <span className="font-semibold tabular-nums">
                {formatCurrency(CXP_KPIS.totalVencido)}
              </span>
              .
            </p>
            <p className="text-orange-600/80 dark:text-orange-400/80 mt-0.5 text-xs">
              El pago oportuno mantiene tu crédito con proveedores.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Descartar alerta"
            className="p-1 rounded-lg text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
          >
            <RejectIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Antigüedad de saldos */}
      <AccountsPayableAgingSummary />

      {/* Tabla principal: Cuentas por Pagar */}
      <DataTable
        columns={accountsPayableColumns}
        data={MOCK_CXP}
        title="Cuentas por Pagar"
        searchPlaceholder="Buscar folio, proveedor, factura u OC..."
        filterConfig={[{ id: "estatus", label: "Estatus", options: ESTATUS_FILTER }]}
        onRefetch={() => {}}
        actionButton={
          <MainDialog
            title="Registrar Cuenta por Pagar"
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            maxWidth="480px"
            trigger={
              <Button variant="primary" rounded="full" onClick={() => setIsCreateOpen(true)}>
                + Registrar CxP
              </Button>
            }
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Formulario de registro en construcción. Esta vista es una maqueta con datos de
              ejemplo generados localmente.
            </p>
          </MainDialog>
        }
      />

      {/* Tabla secundaria: Pagos recientes */}
      <DataTable
        columns={pagosColumns}
        data={MOCK_PAGOS}
        title="Pagos Recientes"
        searchPlaceholder="Buscar pago o proveedor..."
      />
    </div>
  );
};
