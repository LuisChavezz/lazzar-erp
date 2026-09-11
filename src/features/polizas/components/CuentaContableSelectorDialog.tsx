"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import type { CuentaContable } from "../interfaces/catalogos.interface";

interface CuentaContableSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Catálogo ya cargado por el formulario (una sola fuente, sin doble fetch). */
  cuentas: CuentaContable[];
  /** Id elegido en el movimiento que abrió el selector (`0` = ninguno). */
  selectedId: number;
  /** Se invoca al confirmar con el id elegido; el formulario lo escribe en la línea. */
  onSelect: (id: number) => void;
}

/**
 * CuentaContableSelectorDialog
 *
 * Selector de la cuenta contable de UN movimiento de la póliza, APILADO encima
 * del formulario (que permanece montado detrás para no perder el estado de los
 * demás renglones). Mismo patrón que `StockTransferProductSelectorDialog`: es
 * reutilizado por CADA movimiento — el formulario recuerda qué índice lo abrió y
 * escribe la selección en ese renglón concreto al confirmar.
 *
 * ─── POR QUÉ UN DIÁLOGO Y NO UN `FormSelect` ─────────────────────────────────
 *
 * El catálogo contable es el único grande de esta pantalla: un plan de cuentas
 * tiene fácilmente cientos de entradas y se busca por CÓDIGO tanto como por
 * nombre. Es el mismo criterio que separa, en el traspaso de existencias, los
 * productos/variantes (diálogo buscable) de los almacenes y ubicaciones
 * (`FormSelect` nativo). Los centros de costo de esta póliza se quedan en
 * `FormSelect` por el mismo motivo, del otro lado.
 *
 * `cuentas` llega YA FILTRADO a `acepta_movimientos=true` y `activo=true` desde
 * `useCuentasContables` (filtro de servidor): una cuenta de agrupación no puede
 * recibir un asiento, y el backend no lo impide por su cuenta.
 */
export function CuentaContableSelectorDialog({
  open,
  onOpenChange,
  cuentas,
  selectedId,
  onSelect,
}: CuentaContableSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="560px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. Sin hook de
          datos propio: el catálogo ya viene cargado por el formulario. */}
      {open && (
        <SingleSelectPickerDialogContent<CuentaContable>
          title="Seleccionar Cuenta Contable"
          subtitle="Solo cuentas activas que aceptan movimientos: las de agrupación no reciben asientos"
          statusColor="indigo"
          items={cuentas}
          searchPlaceholder="Buscar por código o nombre de cuenta..."
          filterPredicate={(cuenta, term) =>
            `${cuenta.codigo} ${cuenta.nombre} ${cuenta.tipo}`
              .toLowerCase()
              .includes(term)
          }
          getKey={(cuenta) => cuenta.id}
          selectedKey={selectedId > 0 ? selectedId : null}
          emptyMessage="No hay cuentas contables que acepten movimientos."
          noResultsMessage="No se encontraron cuentas"
          renderContent={(cuenta) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {cuenta.codigo}
                  </span>
                  <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                  {cuenta.nombre}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {/* `tipo` es la naturaleza contable real del modelo
                      (Activo/Pasivo/Capital/Ingreso/Gasto/Costo). NO existe un
                      campo `naturaleza` deudora/acreedora ni un `saldo`: los
                      inventa la maqueta faker de `features/accounting`. */}
                  {cuenta.tipo} · Nivel {cuenta.nivel}
                </p>
              </div>
            </div>
          )}
          onConfirm={(cuenta) => {
            onSelect(cuenta.id);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
