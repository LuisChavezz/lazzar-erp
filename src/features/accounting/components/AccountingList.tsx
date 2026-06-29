"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import {
  ContabilidadIcon,
  ListIcon,
  ReportesIcon,
  ClipboardListIcon,
  RejectIcon,
} from "@/src/components/Icons";
import { polizasColumns } from "./PolizasColumns";
import { cuentasContablesColumns } from "./CuentasContablesColumns";
import { centrosCostoColumns } from "./CentrosCostoColumns";
import { AccountingBalanceSummary } from "./AccountingBalanceSummary";
import {
  MOCK_POLIZAS,
  MOCK_CUENTAS_CONTABLES,
  MOCK_CENTROS_COSTO,
  ACCOUNTING_KPIS,
} from "../mocks/accounting.mock";

type AccountingTab = "polizas" | "cuentas" | "centros";

const TABS: { value: AccountingTab; label: string; Icon: typeof ListIcon }[] = [
  { value: "polizas", label: "Pólizas", Icon: ContabilidadIcon },
  { value: "cuentas", label: "Plan de Cuentas", Icon: ListIcon },
  { value: "centros", label: "Centros de Costo", Icon: ReportesIcon },
];

const CREATE_LABEL: Record<AccountingTab, { button: string; dialog: string }> = {
  polizas: { button: "+ Nueva Póliza", dialog: "Nueva Póliza" },
  cuentas: { button: "+ Nueva Cuenta", dialog: "Nueva Cuenta Contable" },
  centros: { button: "+ Nuevo Centro", dialog: "Nuevo Centro de Costo" },
};

const POLIZAS_FILTERS = [
  {
    id: "tipo",
    label: "Tipo",
    options: [
      { value: "ingreso", label: "Ingreso" },
      { value: "egreso", label: "Egreso" },
      { value: "diario", label: "Diario" },
      { value: "cierre", label: "Cierre" },
    ],
  },
  {
    id: "estatus",
    label: "Estatus",
    options: [
      { value: "contabilizada", label: "Contabilizada" },
      { value: "borrador", label: "Borrador" },
      { value: "cancelada", label: "Cancelada" },
    ],
  },
];

const CUENTAS_FILTERS = [
  {
    id: "tipo",
    label: "Tipo",
    options: [
      { value: "activo", label: "Activo" },
      { value: "pasivo", label: "Pasivo" },
      { value: "capital", label: "Capital" },
      { value: "ingreso", label: "Ingreso" },
      { value: "egreso", label: "Egreso" },
      { value: "costo", label: "Costo" },
    ],
  },
];

export const AccountingList = () => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountingTab>("polizas");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const showBanner = !bannerDismissed && ACCOUNTING_KPIS.polizasBorrador > 0;
  const borradores = ACCOUNTING_KPIS.polizasBorrador;

  const createButton = (
    <Button variant="primary" rounded="full" onClick={() => setIsCreateOpen(true)}>
      {CREATE_LABEL[activeTab].button}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Aviso de pólizas en borrador */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <ClipboardListIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Pólizas en borrador</p>
            <p className="text-amber-700 dark:text-amber-400">
              Tienes <span className="font-semibold tabular-nums">{borradores}</span>{" "}
              {borradores === 1 ? "póliza en borrador pendiente" : "pólizas en borrador pendientes"} de
              contabilizar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Descartar aviso"
            className="p-1 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            <RejectIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Resumen de balance y centros de costo */}
      <AccountingBalanceSummary />

      {/* Pestañas */}
      <div
        role="tablist"
        aria-label="Vistas de contabilidad"
        className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
      >
        {TABS.map(({ value, label, Icon }) => {
          const isActive = activeTab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(value)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg",
                "transition-all duration-200 focus:outline-none focus-visible:ring-2 cursor-pointer focus-visible:ring-sky-500",
                isActive
                  ? "bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tabla activa */}
      {activeTab === "polizas" && (
        <DataTable
          columns={polizasColumns}
          data={MOCK_POLIZAS}
          title="Pólizas"
          searchPlaceholder="Buscar folio, concepto o usuario..."
          filterConfig={POLIZAS_FILTERS}
          onRefetch={() => {}}
          actionButton={createButton}
        />
      )}

      {activeTab === "cuentas" && (
        <DataTable
          columns={cuentasContablesColumns}
          data={MOCK_CUENTAS_CONTABLES}
          title="Plan de Cuentas"
          searchPlaceholder="Buscar código o nombre de cuenta..."
          filterConfig={CUENTAS_FILTERS}
          onRefetch={() => {}}
          actionButton={createButton}
        />
      )}

      {activeTab === "centros" && (
        <DataTable
          columns={centrosCostoColumns}
          data={MOCK_CENTROS_COSTO}
          title="Centros de Costo"
          searchPlaceholder="Buscar centro o área..."
          onRefetch={() => {}}
          actionButton={createButton}
        />
      )}

      {/* Diálogo de alta (maqueta) compartido por las tres pestañas */}
      <MainDialog
        title={CREATE_LABEL[activeTab].dialog}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        maxWidth="480px"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Formulario de registro en construcción. Esta vista es una maqueta con datos de ejemplo
          generados localmente.
        </p>
      </MainDialog>
    </div>
  );
};
