"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { WarningFilledIcon, RejectIcon } from "@/src/components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { accountsReceivableColumns } from "./AccountsReceivableColumns";
import { cobrosColumns } from "./CobrosColumns";
import { AccountsReceivableAgingSummary } from "./AccountsReceivableAgingSummary";
import { MOCK_CXC, MOCK_COBROS, CXC_KPIS } from "../mocks/accounts-receivable.mock";

const ESTATUS_FILTER = [
  { value: "vigente", label: "Vigente" },
  { value: "vencida", label: "Vencida" },
  { value: "parcial", label: "Parcial" },
  { value: "pagada", label: "Pagada" },
];

export const AccountsReceivableList = () => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const showBanner = !bannerDismissed && CXC_KPIS.cuentasVencidas > 0;

  return (
    <div className="space-y-6">
      {/* Alerta de cuentas vencidas */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <WarningFilledIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Cuentas vencidas</p>
            <p className="text-amber-700 dark:text-amber-400">
              Tienes {CXC_KPIS.cuentasVencidas}{" "}
              {CXC_KPIS.cuentasVencidas === 1 ? "cuenta vencida" : "cuentas vencidas"} por un total
              de{" "}
              <span className="font-semibold tabular-nums">
                {formatCurrency(CXC_KPIS.totalVencido)}
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
      <AccountsReceivableAgingSummary />

      {/* Tabla principal: Cuentas por Cobrar */}
      <DataTable
        columns={accountsReceivableColumns}
        data={MOCK_CXC}
        title="Cuentas por Cobrar"
        searchPlaceholder="Buscar folio, cliente o factura..."
        filterConfig={[{ id: "estatus", label: "Estatus", options: ESTATUS_FILTER }]}
        onRefetch={() => {}}
        actionButton={
          <MainDialog
            title="Registrar Cuenta por Cobrar"
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            maxWidth="480px"
            trigger={
              <Button variant="primary" rounded="full" onClick={() => setIsCreateOpen(true)}>
                + Registrar CxC
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

      {/* Tabla secundaria: Cobros recientes */}
      <DataTable
        columns={cobrosColumns}
        data={MOCK_COBROS}
        title="Cobros Recientes"
        searchPlaceholder="Buscar cobro o cliente..."
      />
    </div>
  );
};
