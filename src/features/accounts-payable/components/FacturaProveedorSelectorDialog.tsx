"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useFacturasProveedor } from "../hooks/useFacturasProveedor";
import { useCuentasPorPagar } from "../hooks/useCuentasPorPagar";
import { moneyFormatFor } from "../utils/accounts-payable.utils";
import type { FacturaProveedor } from "../interfaces/factura-proveedor.interface";

interface FacturaProveedorSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Proveedor elegido en el formulario. Sin proveedor (`<= 0`) no se consulta. */
  proveedorId: number;
  /** Factura ya elegida (`0` = ninguna), para resaltarla al abrir. */
  selectedFacturaId: number;
  /** Se invoca al confirmar con la factura elegida (objeto completo). */
  onConfirm: (factura: FacturaProveedor) => void;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto, de
 * modo que las consultas corren bajo demanda. Mismo reparto que
 * `InvoiceSelectorDialog` y `CxpSelectorDialog`.
 */
function FacturaProveedorSelectorContent({
  proveedorId,
  selectedFacturaId,
  onConfirm,
  onCancel,
}: {
  proveedorId: number;
  selectedFacturaId: number;
  onConfirm: (factura: FacturaProveedor) => void;
  onCancel: () => void;
}) {
  // Proveedor y estatus se filtran EN EL SERVIDOR: la respuesta trae los
  // renglones anidados de cada factura y no está paginada, así que se pide solo
  // lo que puede elegirse.
  const {
    facturasProveedor,
    isLoading: isLoadingFacturas,
    isError,
  } = useFacturasProveedor({ proveedor: proveedorId, estatus: "Registrada" });

  // El listado de CxP comparte llave con la tabla de la pantalla, así que casi
  // siempre ya está en caché y no cuesta una petición más.
  const { cuentasPorPagar, isLoading: isLoadingCuentas } = useCuentasPorPagar();

  // Una factura origina UNA sola CxP: las que ya tienen cuenta se excluyen aquí.
  // Es una comodidad, no la garantía — si el listado de CxP no cargó o está
  // rancio, el 400 de duplicado del backend (en `factura_proveedor`) sigue
  // siendo la red de seguridad.
  const facturasConCuenta = new Set(
    cuentasPorPagar.map((cuenta) => cuenta.factura_proveedor),
  );
  // `estatus` se reafirma en cliente: el filtro del servidor ya lo aplica, pero la
  // regla "solo Registrada" no debe depender de que el parámetro se respete.
  const registradas = facturasProveedor.filter(
    (factura) => factura.estatus === "Registrada",
  );
  const disponibles = registradas.filter(
    (factura) => !facturasConCuenta.has(factura.id),
  );
  const todasConCuenta = registradas.length > 0 && disponibles.length === 0;

  return (
    <SingleSelectPickerDialogContent<FacturaProveedor>
      title="Seleccionar Factura de Proveedor"
      subtitle="Solo facturas registradas que todavía no tienen cuenta por pagar"
      statusColor="rose"
      items={disponibles}
      isLoading={isLoadingFacturas || isLoadingCuentas}
      isError={isError}
      loadingTitle="Cargando facturas"
      loadingMessage="Obteniendo las facturas registradas del proveedor..."
      errorMessage="Error al cargar las facturas del proveedor."
      searchPlaceholder="Buscar por folio de factura..."
      filterPredicate={(factura, term) =>
        (factura.folio ?? "").toLowerCase().includes(term) ||
        String(factura.id).includes(term)
      }
      getKey={(factura) => factura.id}
      selectedKey={selectedFacturaId > 0 ? selectedFacturaId : null}
      emptyMessage={
        todasConCuenta
          ? "Todas las facturas registradas de este proveedor ya tienen cuenta por pagar."
          : "Este proveedor no tiene facturas registradas."
      }
      noResultsMessage="No se encontraron facturas"
      renderContent={(factura) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {factura.folio || `Factura #${factura.id}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {/* `timeZone: "UTC"`: fechas-calendario "YYYY-MM-DD". */}
              Emitida {formatShortDate(factura.fecha_emision, { timeZone: "UTC" })} ·
              Vence {formatShortDate(factura.fecha_vencimiento, { timeZone: "UTC" })}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Total</p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {formatMoneyValueOrDash(factura.total, moneyFormatFor(factura.moneda_codigo))}
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
 * FacturaProveedorSelectorDialog
 *
 * Selector ÚNICO de la factura de proveedor que origina la cuenta por pagar,
 * apilado ENCIMA del formulario (que permanece montado detrás para no perder lo
 * capturado).
 *
 * Es presentacional respecto del formulario: no escribe en él, solo entrega la
 * factura elegida —objeto completo— por `onConfirm`, y el formulario deriva de
 * ella `proveedor`, `total` y el vencimiento (`valuesFromFacturaProveedor`).
 */
export function FacturaProveedorSelectorDialog({
  open,
  onOpenChange,
  proveedorId,
  selectedFacturaId,
  onConfirm,
}: FacturaProveedorSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="640px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. */}
      {open && proveedorId > 0 && (
        <FacturaProveedorSelectorContent
          proveedorId={proveedorId}
          selectedFacturaId={selectedFacturaId}
          onConfirm={(factura) => {
            onConfirm(factura);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
