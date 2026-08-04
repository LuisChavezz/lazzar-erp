"use client";

import { useState } from "react";
import Script from "next/script";
import { PrinterIcon } from "@/src/components/Icons";
import { FormSelect } from "@/src/components/FormSelect";
import { InfoField, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  deviceKey,
  deviceLabel,
  DETECTION_TONE,
  detectionMessage,
  type UseBrowserPrintDevicesResult,
} from "../hooks/useBrowserPrintDevices";

const BROWSER_PRINT_SDK_SRC = "/vendor/browser-print/BrowserPrint-3.1.250.min.js";
const BROWSER_PRINT_ZEBRA_SDK_SRC =
  "/vendor/browser-print/BrowserPrint-Zebra-1.1.250.min.js";

interface BrowserPrintPickerProps {
  /** Estado de detección ya instanciado por el consumidor (`useBrowserPrintDevices`),
   *  para que este pueda leer `selectedDevice` y correr el lote de impresión. */
  browserPrint: UseBrowserPrintDevicesResult;
  /** Deshabilita el selector y el reintento mientras hay una impresión en curso. */
  disabled?: boolean;
}

/**
 * Selector de impresora Zebra + estado de detección, reutilizable.
 *
 * Carga los dos scripts del SDK con `next/script` (el de Zebra depende de que el
 * core exista, así que se monta hasta el `onReady` del primero) y usa el hook de
 * detección que le pasa el consumidor —NO instancia su propio mecanismo de
 * detección—. Es la misma detección que el botón de reimpresión del historial;
 * lo que cambia es que aquí quien imprime es el flujo de "Nueva impresión"
 * (lote de N etiquetas), no este componente.
 */
export function BrowserPrintPicker({ browserPrint, disabled = false }: BrowserPrintPickerProps) {
  const { status, devices, selectedKey, selectDevice, selectedDevice, errorDetail, retry } =
    browserPrint;

  // El SDK de Zebra ejecuta `BrowserPrint.Zebra=…()` al cargar, así que exige
  // que el core ya haya definido `window.BrowserPrint`. `next/script` no
  // garantiza orden entre dos scripts `afterInteractive` (se inyectan async),
  // de modo que el de Zebra se monta SOLO tras el `onReady` del core. Mismo
  // gateo que `BrowserPrintSection` en el detalle del historial.
  const [coreLoaded, setCoreLoaded] = useState(false);

  const tone = DETECTION_TONE[status];
  const hasDevices = devices.length > 0;

  return (
    <div>
      <Script
        id="zebra-browser-print-core"
        src={BROWSER_PRINT_SDK_SRC}
        strategy="afterInteractive"
        onReady={() => {
          setCoreLoaded(true);
          browserPrint.handleSdkReady();
        }}
        onError={browserPrint.handleSdkError}
      />
      {coreLoaded && (
        <Script
          id="zebra-browser-print-zebra"
          src={BROWSER_PRINT_ZEBRA_SDK_SRC}
          strategy="afterInteractive"
        />
      )}

      <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <PrinterIcon className="w-5 h-5 text-slate-400 shrink-0 mt-1" aria-hidden="true" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 min-w-0 text-xs">
            <FormSelect
              label="Impresora detectada"
              value={selectedKey ?? ""}
              disabled={!hasDevices || disabled}
              onChange={(event) => selectDevice(event.target.value)}
              options={
                hasDevices
                  ? devices.map((device) => ({
                      value: deviceKey(device),
                      label: deviceLabel(device),
                    }))
                  : [{ value: "", label: detectionMessage(status, 0) }]
              }
            />
            <InfoField label="Conexión">
              {/* El agente no expone un campo de IP: para equipos de red el
                  `uid` ES la IP, y para USB es el identificador del dispositivo. */}
              <span className="font-mono">{textOrDash(selectedDevice?.uid ?? null)}</span>
              {selectedDevice?.connection && (
                <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                  ({selectedDevice.connection})
                </span>
              )}
            </InfoField>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <span className={`inline-flex items-center gap-2 text-xs font-medium ${tone.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} aria-hidden="true" />
            {detectionMessage(status, devices.length)}
          </span>
          {status !== "detectando" && status !== "cargando-sdk" && (
            <button
              type="button"
              onClick={retry}
              disabled={disabled}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reintentar detección
            </button>
          )}
        </div>

        {status === "no-detectado" && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            No se pudo contactar al agente local de Zebra Browser Print en este equipo.
            Verifica que esté instalado y en ejecución.
            {errorDetail && (
              <span className="block mt-1 font-mono text-slate-400 dark:text-slate-500 break-all">
                {errorDetail}
              </span>
            )}
          </p>
        )}

        {status === "sin-impresoras" && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            El agente de Browser Print responde, pero no reporta ninguna impresora.
            Configura una impresora Zebra en Browser Print y vuelve a intentar.
          </p>
        )}
      </div>
    </div>
  );
}
