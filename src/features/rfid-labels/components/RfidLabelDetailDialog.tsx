"use client";

import toast from "react-hot-toast";
import { CopyIcon, FileCode2Icon, LabelsIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { RFID_LABEL_STATUS_CONFIG } from "../constants/rfidLabelStatus";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";

/**
 * Anchos de barra deterministas derivados del valor codificado. Es SOLO un
 * adorno: no codifica nada en Code 128 real (eso lo hace el `^BC` del ZPL en
 * la impresora). Se deriva del valor en vez de usar `Math.random` para que el
 * mismo registro dibuje siempre el mismo patrón y no haya desajuste de
 * hidratación.
 */
function barcodeBars(value: string): number[] {
  return Array.from({ length: 46 }, (_, i) => {
    const code = value.charCodeAt(i % value.length) + i * 7;
    return (code % 3) + 1;
  });
}

/** Vista previa de la etiqueta: los datos reales disponibles de ESTE evento de
 *  impresión, maquetados en HTML. `barcodeValue` viene de `etiquetas[0]`, que
 *  puede no existir (impresión registrada con `rfid_mode: false` no genera
 *  renglones en `etiquetas[]`) — ese caso se muestra explícito, sin inventar
 *  un valor de reemplazo. */
const RfidLabelPreview = ({ etiqueta }: { etiqueta: EtiquetaRFID }) => {
  const barcodeValue = etiqueta.etiquetas[0]?.barcode_value ?? null;

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-800/40 px-5 py-4">
      <p className="text-base font-bold leading-tight text-slate-800 dark:text-white truncate">
        {etiqueta.producto_nombre}
      </p>
      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
        SKU: {textOrDash(etiqueta.sku)}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        Variante: <span className="font-medium">{textOrDash(etiqueta.producto_variante_nombre)}</span>
      </p>

      {barcodeValue ? (
        <>
          {/* Código de barras simulado */}
          <div className="mt-4 flex items-end gap-[2px] h-14" aria-hidden="true">
            {barcodeBars(barcodeValue).map((width, index) => (
              <div
                key={index}
                style={{ width: `${width}px` }}
                className="h-full bg-slate-900 dark:bg-slate-100"
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] font-mono tracking-[0.2em] text-slate-600 dark:text-slate-300">
            {barcodeValue}
          </p>
        </>
      ) : (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 italic px-1 py-3 text-center rounded-lg border border-slate-100 dark:border-white/10">
          Sin código de barras registrado (impresión sin modo RFID).
        </p>
      )}

      <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
        COD: {textOrDash(etiqueta.codigo_producto)}
      </p>
    </div>
  );
};

interface RfidLabelDetailDialogProps {
  /** El evento de impresión ya cargado por el listado — sin fetch propio
   *  (listado y detalle comparten `EtiquetaRFIDSerializer` en el backend,
   *  `get_serializer_class` no distingue por `self.action`). Mismo patrón que
   *  `DispatchDetailDialog`. */
  etiqueta: EtiquetaRFID;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de un evento de impresión de etiqueta RFID: resumen + vista previa
 * + ZPL enviado.
 *
 * La sección de impresora/"Imprimir etiqueta" de la maqueta anterior se quitó
 * por completo (no se deja como control inerte): no hay ningún flujo de
 * impresión real detrás todavía, y la convención de este proyecto es no
 * construir UI para algo que el backend no hace (ver, p. ej., los checkboxes
 * de generación de órdenes que Picking nunca llegó a tener en el frontend).
 */
export function RfidLabelDetailDialog({
  etiqueta,
  open,
  onOpenChange,
}: RfidLabelDetailDialogProps) {
  const handleCopyZpl = async () => {
    if (!etiqueta.zpl_enviado) return;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API no disponible");
      }
      await navigator.clipboard.writeText(etiqueta.zpl_enviado);
      toast.success("ZPL copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el ZPL. Selecciónalo y cópialo manualmente.");
    }
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <LabelsIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Impresión RFID
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {etiqueta.folio}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Producto" className="col-span-2">
            {etiqueta.producto_nombre}
          </InfoField>
          <InfoField label="SKU">{textOrDash(etiqueta.sku)}</InfoField>
          <InfoField label="Estatus">
            <StatusBadge status={etiqueta.status} config={RFID_LABEL_STATUS_CONFIG} />
          </InfoField>
          <InfoField label="Variante" className="col-span-2">
            {textOrDash(etiqueta.producto_variante_nombre)}
          </InfoField>
          <InfoField label="Cantidad">{etiqueta.cantidad}</InfoField>
          <InfoField label="Fecha">
            {formatShortDate(etiqueta.created_at)} · {formatShortTime(etiqueta.created_at)}
          </InfoField>
        </div>

        {/* Vista previa */}
        <div>
          <SectionTitle>Vista previa de la etiqueta</SectionTitle>
          <RfidLabelPreview etiqueta={etiqueta} />
        </div>

        {/* ZPL */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <SectionTitle>ZPL generado</SectionTitle>
            {etiqueta.zpl_enviado && (
              <button
                type="button"
                onClick={handleCopyZpl}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
              >
                <CopyIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Copiar
              </button>
            )}
          </div>
          {etiqueta.zpl_enviado ? (
            <pre className="max-h-56 overflow-auto rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              {etiqueta.zpl_enviado}
            </pre>
          ) : (
            <p className="flex items-center gap-1.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 px-3 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
              <FileCode2Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Sin ZPL registrado para esta impresión.
            </p>
          )}
        </div>
      </div>
    </MainDialog>
  );
}
