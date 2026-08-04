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

interface RfidLabelBarcodeGraphicProps {
  barcodeValue: string | null;
}

/**
 * Código de barras simulado + valor, o el estado vacío cuando no hay valor que
 * codificar. Extraído de `RfidLabelDetailDialog` (donde vivía inline dentro de
 * `RfidLabelPreview`) para reutilizarse tal cual en la vista previa del
 * asistente de "Nueva impresión" (`RfidLabelPrintStep`) — es la misma pieza
 * visual en ambos casos, solo cambia de dónde viene `barcodeValue` (de
 * `etiqueta.etiquetas[0]?.barcode_value` en el historial, de
 * `preview.preview_data.barcode_value` en el asistente).
 */
export function RfidLabelBarcodeGraphic({ barcodeValue }: RfidLabelBarcodeGraphicProps) {
  if (!barcodeValue) {
    return (
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 italic px-1 py-3 text-center rounded-lg border border-slate-100 dark:border-white/10">
        Sin código de barras registrado (impresión sin modo RFID).
      </p>
    );
  }

  return (
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
  );
}
