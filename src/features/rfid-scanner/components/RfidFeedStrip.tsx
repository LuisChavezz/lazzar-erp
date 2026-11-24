"use client";

import { useState } from "react";
import type { ScanResult } from "@/src/components/ScanCapture";
import { useRfidEpcFeed } from "@/src/features/rfid-scanner/hooks/useRfidEpcFeed";
import { useIsSuperuser } from "@/src/features/users/hooks/useIsSuperuser";
import { useSessionCompany } from "@/src/features/workspace/hooks/useSessionCompany";
import type { RfidScan } from "@/src/features/rfid-scanner/interfaces/rfid-scanner.interface";

interface RfidFeedStripProps {
  /** Procesa un código leído igual que el lector de mano (SKU o código). */
  onCode: (code: string) => ScanResult;
}

interface Detectada {
  epc: string;
  producto: string;
  codigo: string;
  talla: string | null;
  result: ScanResult;
}

const TONE: Record<ScanResult["tone"], { dot: string; text: string }> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  warn: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  error: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

/**
 * Etiquetas RFID que ve la antena, en vivo, dentro de la captura. Cada
 * etiqueta del ERP entra por el mismo camino que una lectura con pistola
 * (`onCode`), una sola vez, y queda en la lista con su resultado: sumó,
 * ya estaba completo, o no es de esta orden.
 *
 * Las lecturas se acotan a la empresa activa (EC-884): sin empresa no se
 * sondea y la tira explica por qué en vez de quedarse esperando (#506).
 */
export function RfidFeedStrip({ onCode }: RfidFeedStripProps) {
  const [detectadas, setDetectadas] = useState<Detectada[]>([]);

  const handleEpc = (scan: RfidScan) => {
    const codigo = scan.barcode_value || scan.sku || "";
    const result: ScanResult = codigo
      ? onCode(codigo)
      : { tone: "error", title: "Etiqueta sin código", detail: scan.epc };
    setDetectadas((prev) => [
      {
        epc: scan.epc,
        producto: scan.producto_nombre || "Sin nombre",
        codigo,
        talla: scan.talla ?? null,
        result,
      },
      ...prev,
    ]);
  };
  const hasNoCompany = useSessionCompany().status === "none";
  const isSuperuser = useIsSuperuser();
  const { isError } = useRfidEpcFeed(!hasNoCompany, handleEpc);

  const sumadas = detectadas.filter((d) => d.result.tone === "ok").length;

  return (
    <div className="border-b border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-2 px-4 pt-2 pb-1.5 text-[11.5px]">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">Antena RFID</span>
        {hasNoCompany ? (
          <span className="text-slate-500 dark:text-slate-400">
            {isSuperuser
              ? "· sin empresa activa: elígela desde “Sin empresa activa”, en el encabezado"
              : "· tu usuario no tiene una empresa asignada"}
          </span>
        ) : isError ? (
          <span className="text-rose-600 dark:text-rose-400">· sin respuesta del lector</span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            · <strong className="tabular-nums text-slate-800 dark:text-slate-100">{detectadas.length}</strong>{" "}
            detectadas
            {detectadas.length > 0 && (
              <>
                {" "}· <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">{sumadas}</strong>{" "}
                sumadas
              </>
            )}
          </span>
        )}
      </div>

      {hasNoCompany ? null : detectadas.length === 0 ? (
        <p className="px-4 pb-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
          Esperando etiquetas frente a la antena…
        </p>
      ) : (
        <ul className="max-h-40 overflow-y-auto px-2 pb-2">
          {detectadas.map((d) => {
            const tone = TONE[d.result.tone];
            return (
              <li
                key={d.epc}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-[11.5px] hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                title={`EPC ${d.epc}${d.result.detail ? ` · ${d.result.detail}` : ""}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                  {d.producto}
                </span>
                <span className="shrink-0 font-mono text-slate-500 dark:text-slate-400">
                  {d.codigo || "—"}
                  {d.talla ? ` · ${d.talla}` : ""}
                </span>
                <span className={`w-36 shrink-0 truncate text-right font-medium ${tone.text}`}>
                  {d.result.tone === "ok" ? "Sumada" : d.result.title}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
