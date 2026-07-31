"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CopyIcon, FileCode2Icon, LabelsIcon, PrinterIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { Button } from "@/src/components/Button";
import { FormSelect } from "@/src/components/FormSelect";
import { InfoField, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { RFID_LABEL_ESTADO_CONFIG } from "../constants/rfidLabelStatus";
import { MOCK_RFID_LABEL_PRINTERS } from "../constants/rfidLabelPrinters";
import type { RfidLabel } from "../interfaces/rfid-label.interface";

/**
 * Anchos de barra deterministas derivados del SKU. Es SOLO un adorno: no
 * codifica nada en Code 128 ni en ningún simbolismo real (el código de barras
 * de verdad lo produce el `^BC` del ZPL en la impresora). Se deriva del SKU en
 * vez de usar `Math.random` para que el mismo registro dibuje siempre el mismo
 * patrón y no haya desajuste de hidratación.
 */
function barcodeBars(sku: string): number[] {
  return Array.from({ length: 46 }, (_, i) => {
    const code = sku.charCodeAt(i % sku.length) + i * 7;
    return (code % 3) + 1;
  });
}

/** Vista previa de la etiqueta impresa: la misma información que el ZPL de
 *  abajo pone en el papel, maquetada en HTML. */
const RfidLabelPreview = ({ rfidLabel }: { rfidLabel: RfidLabel }) => (
  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-800/40 px-5 py-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-base font-bold leading-tight text-slate-800 dark:text-white truncate">
          {rfidLabel.producto_nombre}
        </p>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
          SKU: {rfidLabel.sku}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Color: <span className="font-medium">{rfidLabel.color_nombre}</span>
          <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
          Talla: <span className="font-medium">{rfidLabel.talla_nombre}</span>
        </p>
      </div>
      {/* Recuadro de talla, equivalente al `^GB`/`^FO600,26` del ZPL. */}
      <div className="shrink-0 w-16 h-16 rounded-lg border-2 border-slate-800 dark:border-slate-200 flex items-center justify-center">
        <span className="text-2xl font-black text-slate-800 dark:text-white">
          {rfidLabel.talla_nombre}
        </span>
      </div>
    </div>

    {/* Código de barras simulado */}
    <div className="mt-4 flex items-end gap-[2px] h-14" aria-hidden="true">
      {barcodeBars(rfidLabel.sku).map((width, index) => (
        <div
          key={index}
          style={{ width: `${width}px` }}
          className="h-full bg-slate-900 dark:bg-slate-100"
        />
      ))}
    </div>
    <p className="mt-1.5 text-[11px] font-mono tracking-[0.2em] text-slate-600 dark:text-slate-300">
      {rfidLabel.sku}
    </p>

    <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
      COD: {rfidLabel.codigo}
    </p>
  </div>
);

interface RfidLabelDetailDialogProps {
  /** La etiqueta ya cargada por el listado — sin fetch propio (el fixture de
   *  `useRfidLabels` ya trae el registro completo, ZPL incluido). */
  rfidLabel: RfidLabel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de una etiqueta: vista previa + ZPL + estado de la impresora.
 *
 * A diferencia del resto de diálogos de detalle del proyecto, aquí NO hay
 * tabla de líneas, así que de `DetailDialogPrimitives` solo se reutiliza el
 * chrome que sí aplica —`SectionTitle` para separar las secciones e
 * `InfoField` para la rejilla de resumen y la IP de la impresora—; la vista
 * previa de la etiqueta y el bloque de ZPL son marcado propio, porque su forma
 * (papel simulado, `<pre>` monoespaciado con scroll) no existe en las
 * primitivas ni tendría sentido generalizarla a un solo consumidor.
 *
 * La impresora es un `<select>` local sobre la lista fija y compartida de
 * `constants/rfidLabelPrinters.ts` (no una detección real ni un dato por
 * registro) — cambiar la selección solo actualiza la IP mostrada al lado.
 * El botón "Copiar" del ZPL sí usa `navigator.clipboard` de verdad (acción de
 * navegador inocua, no hace falta simularla); el resto —impresora "detectada"
 * y botón de imprimir— sigue inerte a propósito, no hay nada detrás de este
 * módulo.
 */
export function RfidLabelDetailDialog({
  rfidLabel,
  open,
  onOpenChange,
}: RfidLabelDetailDialogProps) {
  // Selección local de impresora — no es un dato de `rfidLabel` (ver
  // `constants/rfidLabelPrinters.ts`), así que vive como estado propio del
  // diálogo y se reinicia a la primera opción cada vez que se abre (el
  // diálogo se desmonta al cerrarse, ver `RfidLabelColumns.tsx`).
  const [selectedPrinterId, setSelectedPrinterId] = useState(MOCK_RFID_LABEL_PRINTERS[0].id);
  const selectedPrinter =
    MOCK_RFID_LABEL_PRINTERS.find((printer) => printer.id === selectedPrinterId) ??
    MOCK_RFID_LABEL_PRINTERS[0];

  const handleCopyZpl = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API no disponible");
      }
      await navigator.clipboard.writeText(rfidLabel.zpl);
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
              Detalle de Etiqueta
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {rfidLabel.sku}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Producto" className="col-span-2">
            {rfidLabel.producto_nombre}
          </InfoField>
          <InfoField label="Variante">
            {rfidLabel.color_nombre} / {rfidLabel.talla_nombre}
          </InfoField>
          <InfoField label="Última impresión">
            <StatusBadge status={rfidLabel.estado} config={RFID_LABEL_ESTADO_CONFIG} />
          </InfoField>
        </div>

        {/* Vista previa */}
        <div>
          <SectionTitle>Vista previa de la etiqueta</SectionTitle>
          <RfidLabelPreview rfidLabel={rfidLabel} />
        </div>

        {/* ZPL */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <SectionTitle>ZPL generado</SectionTitle>
            <button
              type="button"
              onClick={handleCopyZpl}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
            >
              <CopyIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Copiar
            </button>
          </div>
          <pre className="max-h-56 overflow-auto rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            {rfidLabel.zpl}
          </pre>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <FileCode2Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Contenido de ejemplo. Esta vista no genera ni envía ZPL a ninguna impresora.
          </p>
        </div>

        {/* Impresión Zebra */}
        <div>
          <SectionTitle>Impresión Zebra</SectionTitle>
          <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <PrinterIcon className="w-5 h-5 text-slate-400 shrink-0 mt-1" aria-hidden="true" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 min-w-0 text-xs">
                <FormSelect
                  label="Impresora detectada"
                  value={selectedPrinterId}
                  onChange={(event) => setSelectedPrinterId(event.target.value)}
                  options={MOCK_RFID_LABEL_PRINTERS.map((printer) => ({
                    value: printer.id,
                    label: printer.nombre,
                  }))}
                />
                <InfoField label="Dirección IP">
                  <span className="font-mono">{selectedPrinter.ip}</span>
                </InfoField>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                  aria-hidden="true"
                />
                Browser Print listo para imprimir
              </span>
              {/* Inerte a propósito: no hay acción de impresión detrás. */}
              <Button
                variant="primary"
                disabled
                leftIcon={<PrinterIcon className="w-4 h-4" aria-hidden="true" />}
                title="Impresión no disponible en esta maqueta"
              >
                Imprimir etiqueta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainDialog>
  );
}
