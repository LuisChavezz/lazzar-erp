"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { MultiSelectPickerDialogContent } from "@/src/components/MultiSelectPickerDialogContent";
import { formatShortDate } from "@/src/utils/formatDate";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { useCobrableCxcs } from "../hooks/useCobrableCxcs";
import { formatCobroAmount } from "../utils/collection.utils";

interface CxcSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cliente del cobro: solo sus CxC. */
  clienteId: number;
  /** Moneda de la cuenta bancaria: id para el filtro de servidor, código para el de cliente. */
  moneda: { id: number; codigo: string };
  /** CxC que el cobro YA tiene como línea: se excluyen para no aplicarlas dos veces. */
  alreadySelectedIds: number[];
  /** CxC elegidas, en el orden de la lista. */
  onConfirm: (cuentas: CuentaPorCobrar[]) => void;
}

/**
 * Contenido del selector, montado solo con el diálogo abierto: la consulta corre
 * bajo demanda (y con saldo fresco, ver `useCobrableCxcs`) y la selección
 * arranca vacía en cada apertura. `pinSelected` deja lo marcado fijo arriba
 * aunque la búsqueda lo excluya (issue #262).
 */
function CxcSelectorContent({
  clienteId,
  moneda,
  alreadySelectedIds,
  onConfirm,
  onCancel,
}: Omit<CxcSelectorDialogProps, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const { cobrables, isLoading, isInitialError } = useCobrableCxcs({ clienteId, moneda });
  const disponibles = cobrables.filter((cuenta) => !alreadySelectedIds.includes(cuenta.id));

  return (
    <MultiSelectPickerDialogContent<CuentaPorCobrar>
      title="Seleccionar Cuentas por Cobrar"
      subtitle={`Facturas pendientes del cliente en ${moneda.codigo}, la moneda de la cuenta bancaria`}
      statusColor="emerald"
      items={disponibles}
      isLoading={isLoading}
      isError={isInitialError}
      loadingTitle="Cargando cuentas por cobrar"
      loadingMessage="Obteniendo las facturas pendientes del cliente..."
      errorMessage="Error al cargar las cuentas por cobrar."
      searchPlaceholder="Buscar por folio de factura..."
      filterPredicate={(cuenta, term) =>
        (cuenta.factura_folio ?? "").toLowerCase().includes(term) || String(cuenta.id).includes(term)
      }
      getKey={(cuenta) => cuenta.id}
      emptyMessage={
        alreadySelectedIds.length > 0
          ? `No quedan cuentas por cobrar en ${moneda.codigo} para este cliente.`
          : `Este cliente no tiene cuentas por cobrar pendientes en ${moneda.codigo}.`
      }
      noResultsMessage="No se encontraron cuentas por cobrar"
      countLabel={{ singular: "cuenta seleccionada", plural: "cuentas seleccionadas" }}
      pinSelected
      renderContent={(cuenta) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {cuenta.factura_folio || `CxC #${cuenta.id}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". */}
              {cuenta.estatus} · Vence {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Saldo</p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {formatCobroAmount(cuenta.saldo, cuenta.moneda_codigo || null)}
            </p>
          </div>
        </div>
      )}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/**
 * Selector MÚLTIPLE de cuentas por cobrar, apilado encima del formulario de
 * cobro (que sigue montado detrás). Solo ofrece las CxC del cliente, en la
 * moneda de la cuenta bancaria y con estatus Pendiente o Parcial; entrega los
 * objetos completos para sembrar cada línea con su saldo.
 */
export function CxcSelectorDialog({ open, onOpenChange, ...props }: CxcSelectorDialogProps) {
  return (
    <MainDialog open={open} onOpenChange={onOpenChange} title="" maxWidth="640px" showCloseButton={false}>
      {open && (
        <CxcSelectorContent
          {...props}
          onConfirm={(cuentas) => {
            props.onConfirm(cuentas);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
