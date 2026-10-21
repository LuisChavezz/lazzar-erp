"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";
import { formatShortDate } from "@/src/utils/formatDate";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { formatCobroAmount } from "../utils/collection.utils";

/**
 * Estatus que admiten un cobro. `saldo_pendiente=true` también devuelve las
 * `Cancelada` (cancelar la factura no pone su saldo en 0), así que se filtran
 * aquí; el filtro de servidor admite un solo estatus por llamada.
 */
const ESTATUS_COBRABLES = new Set<string>(["Pendiente", "Parcial"]);

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
 * Contenido del selector, montado solo con el diálogo abierto (la consulta corre
 * bajo demanda y la selección arranca vacía en cada apertura).
 *
 * No usa `MultiSelectPickerDialogContent` porque guarda la selección tentativa
 * dentro y no deja fijarla: con una búsqueda que la excluya, "Confirmar
 * selección" aplicaría CxC que el usuario ya no ve (issue #262). Aquí la
 * selección vive en este componente y se fija arriba de la lista, visible
 * aunque la búsqueda no la incluya; el resto es el mismo armado compartido.
 */
function CxcSelectorContent({
  clienteId,
  moneda,
  alreadySelectedIds,
  onConfirm,
  onCancel,
}: Omit<CxcSelectorDialogProps, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const { cuentas, isLoading, isError, hasLoaded } = useCuentasPorCobrar({
    cliente: clienteId,
    saldo_pendiente: true,
    moneda: moneda.id,
  });
  const [tentativeIds, setTentativeIds] = useState<Set<number>>(() => new Set());

  const disponibles = cuentas.filter(
    (cuenta) =>
      ESTATUS_COBRABLES.has(cuenta.estatus) &&
      cuenta.moneda_codigo === moneda.codigo &&
      !alreadySelectedIds.includes(cuenta.id),
  );
  // Las elegidas primero: siempre a la vista.
  const items = [
    ...disponibles.filter((cuenta) => tentativeIds.has(cuenta.id)),
    ...disponibles.filter((cuenta) => !tentativeIds.has(cuenta.id)),
  ];

  // Un refetch fallido con datos cargados no tira la lista (el hook avisa por toast).
  const showError = isError && !hasLoaded;
  const selectedCount = tentativeIds.size;

  const toggle = (cuenta: CuentaPorCobrar) => {
    setTentativeIds((prev) => {
      const next = new Set(prev);
      if (next.has(cuenta.id)) next.delete(cuenta.id);
      else next.add(cuenta.id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = disponibles.filter((cuenta) => tentativeIds.has(cuenta.id));
    if (selected.length > 0) onConfirm(selected);
  };

  return (
    <>
      <DialogHeader
        title="Seleccionar Cuentas por Cobrar"
        subtitle={`Facturas pendientes del cliente en ${moneda.codigo}, la moneda de la cuenta bancaria`}
        statusColor="emerald"
      />

      {isLoading ? (
        <Loader title="Cargando cuentas por cobrar" message="Obteniendo las facturas pendientes del cliente..." />
      ) : showError ? (
        <p className="text-sm text-red-500 p-4">Error al cargar las cuentas por cobrar.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedCount === 0
              ? "Ninguna seleccionada"
              : `${selectedCount} ${selectedCount === 1 ? "cuenta seleccionada" : "cuentas seleccionadas"}`}
          </p>
          <SearchableSelectList<CuentaPorCobrar>
            items={items}
            searchPlaceholder="Buscar por folio de factura..."
            filterPredicate={(cuenta, term) =>
              tentativeIds.has(cuenta.id) ||
              (cuenta.factura_folio ?? "").toLowerCase().includes(term) ||
              String(cuenta.id).includes(term)
            }
            getKey={(cuenta) => cuenta.id}
            isSelected={(cuenta) => tentativeIds.has(cuenta.id)}
            onSelect={toggle}
            emptyMessage={
              alreadySelectedIds.length > 0
                ? `No quedan cuentas por cobrar en ${moneda.codigo} para este cliente.`
                : `Este cliente no tiene cuentas por cobrar pendientes en ${moneda.codigo}.`
            }
            noResultsMessage="No se encontraron cuentas por cobrar"
            renderIndicator={renderCheckboxIndicator}
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
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={selectedCount === 0 || isLoading || showError}
        >
          Confirmar selección
        </Button>
      </div>
    </>
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
