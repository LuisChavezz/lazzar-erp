"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { MultiSelectPickerDialogContent } from "@/src/components/MultiSelectPickerDialogContent";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useCuentasPorPagar } from "../hooks/useCuentasPorPagar";
import type { CuentaPorPagar } from "../interfaces/cuenta-por-pagar.interface";

interface CxpSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Proveedor del pago. `null` = todavía no se eligió: la consulta de CxP no se
   * dispara y el diálogo no debería abrirse.
   */
  proveedorId: number | null;
  /**
   * Ids de CxP que el pago YA tiene como línea. Se EXCLUYEN de la lista para que
   * no puedan agregarse dos veces (el backend aplicaría dos importes contra el
   * mismo saldo). Se excluyen en vez de mostrarse deshabilitadas porque
   * `SearchableSelectList` pinta cada fila como un `<button>` sin estado
   * deshabilitado, y ensancharlo obligaría a tocar un componente compartido.
   */
  alreadySelectedIds: number[];
  /**
   * CANDADO DE MONEDA (ver `monedaDelPago`): `undefined` mientras el pago no
   * tiene líneas —sin candado, se acepta cualquier divisa—; `string | null` una
   * vez fijado por la primera CxP elegida.
   *
   * `null` es un valor de candado LEGÍTIMO ("solo CxP sin moneda resuelta"), no
   * la ausencia de candado: `moneda_codigo` es nullable, así que confundir ambos
   * casos hacía que una primera CxP sin moneda abriera la lista a cualquier
   * divisa.
   *
   * Cuando hay candado, las CxP de otra moneda se EXCLUYEN de la lista: un pago
   * sale de UNA cuenta bancaria, con una sola moneda, y ni el backend ni esta UI
   * convierten divisas — mezclarlas produciría un `total_pagado` sin significado.
   * Es una regla del frontend; el backend no la impone (por eso el schema la
   * reafirma en su `superRefine`).
   */
  monedaCodigo: string | null | undefined;
  /** Se invoca al confirmar con las CxP elegidas, en el orden de la lista. */
  onConfirm: (cuentas: CuentaPorPagar[]) => void;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto, de
 * modo que `useCuentasPorPagar` corre bajo demanda. Es un componente con nombre
 * propio (no una arrow anónima) justamente para poder llamar el hook aquí y no
 * en `MultiSelectPickerDialogContent`, que es puramente presentacional y no sabe
 * de dónde salen sus `items`. Mismo reparto que `StockMovementPedidoSelectorDialog`.
 */
function CxpSelectorContent({
  proveedorId,
  alreadySelectedIds,
  monedaCodigo,
  onConfirm,
  onCancel,
}: {
  proveedorId: number | null;
  alreadySelectedIds: number[];
  monedaCodigo: string | null | undefined;
  onConfirm: (cuentas: CuentaPorPagar[]) => void;
  onCancel: () => void;
}) {
  const { cuentasPorPagar, isLoading, isError } = useCuentasPorPagar(proveedorId);

  // `undefined` (sin líneas) es lo ÚNICO que desactiva el candado; con `null` se
  // filtra igual que con cualquier código, dejando solo las CxP sin moneda.
  const hayCandado = monedaCodigo !== undefined;

  const disponibles = cuentasPorPagar.filter(
    (cuenta) =>
      !alreadySelectedIds.includes(cuenta.id) &&
      (!hayCandado || cuenta.moneda_codigo === monedaCodigo),
  );

  // Se distingue "no hay nada" de "hay, pero el candado las dejó fuera": si no,
  // un usuario con facturas en USD y el pago fijado en MXN vería un vacío sin
  // explicación.
  const ocultasPorMoneda =
    hayCandado &&
    cuentasPorPagar.some(
      (cuenta) =>
        !alreadySelectedIds.includes(cuenta.id) &&
        cuenta.moneda_codigo !== monedaCodigo,
    );

  return (
    <MultiSelectPickerDialogContent<CuentaPorPagar>
      title="Seleccionar Cuentas por Pagar"
      subtitle={
        !hayCandado
          ? "Elige las facturas del proveedor que este pago va a cubrir"
          : monedaCodigo
            ? `Solo facturas en ${monedaCodigo}: el pago ya quedó fijado a esa moneda`
            : "Solo facturas sin moneda resuelta: el pago ya quedó fijado a esa condición"
      }
      statusColor="emerald"
      items={disponibles}
      isLoading={isLoading}
      isError={isError}
      loadingTitle="Cargando cuentas por pagar"
      loadingMessage="Obteniendo las facturas pendientes del proveedor..."
      errorMessage="Error al cargar las cuentas por pagar."
      searchPlaceholder="Buscar por folio de factura..."
      filterPredicate={(cuenta, term) =>
        (cuenta.factura_proveedor_folio ?? "").toLowerCase().includes(term) ||
        String(cuenta.id).includes(term)
      }
      getKey={(cuenta) => cuenta.id}
      emptyMessage={
        ocultasPorMoneda
          ? `Las cuentas por pagar restantes están en otra moneda. Un pago no puede mezclar divisas: registra un pago aparte para ellas.`
          : alreadySelectedIds.length > 0
            ? "No quedan cuentas por pagar disponibles para este proveedor."
            : "Este proveedor no tiene cuentas por pagar pendientes."
      }
      noResultsMessage="No se encontraron cuentas por pagar"
      countLabel={{ singular: "cuenta seleccionada", plural: "cuentas seleccionadas" }}
      renderContent={(cuenta) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {cuenta.factura_proveedor_folio ?? `CxP #${cuenta.id}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {/* `timeZone: "UTC"`: `fecha_vencimiento` es una fecha-calendario
                  "YYYY-MM-DD"; sin esto un navegador al oeste de Greenwich la
                  pinta un día antes. Convención de finanzas (CxC/CxP/pólizas). */}
              {cuenta.estatus} · Vence{" "}
              {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Saldo</p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {/* El importe se formatea en la moneda de la FACTURA, no en el MXN
                  por defecto: una CxP puede venir en otra divisa. */}
              {formatMoneyValueOrDash(
                cuenta.saldo,
                cuenta.moneda_codigo ? { currency: cuenta.moneda_codigo } : undefined,
              )}
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
 * CxpSelectorDialog
 *
 * Selector MÚLTIPLE de cuentas por pagar, apilado ENCIMA del formulario de pago
 * (que permanece montado detrás para no perder el estado de las demás líneas —
 * mismo patrón que `StockTransferProductSelectorDialog`). Una sola confirmación
 * agrega N líneas de golpe.
 *
 * Es presentacional respecto del formulario: no escribe en él, solo entrega las
 * CxP elegidas —objetos completos, para que el llamador siembre cada línea con
 * el `saldo` que ya viene en el ítem— por `onConfirm`.
 */
export function CxpSelectorDialog({
  open,
  onOpenChange,
  proveedorId,
  alreadySelectedIds,
  monedaCodigo,
  onConfirm,
}: CxpSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="640px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. */}
      {open && (
        <CxpSelectorContent
          proveedorId={proveedorId}
          alreadySelectedIds={alreadySelectedIds}
          monedaCodigo={monedaCodigo}
          onConfirm={(cuentas) => {
            onConfirm(cuentas);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
