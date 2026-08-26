"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import toast from "react-hot-toast";
import {
  LabelsIcon,
  LoadingSpinnerIcon,
  PrinterIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { Button } from "@/src/components/Button";
import { FormSelect } from "@/src/components/FormSelect";
import { InfoField, SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { RFID_LABEL_STATUS_CONFIG } from "../constants/rfidLabelStatus";
import {
  deviceKey,
  deviceLabel,
  DETECTION_TONE,
  detectionMessage,
  errorToText as errorDetailToText,
  useBrowserPrintDevices,
} from "../hooks/useBrowserPrintDevices";
import { RfidLabelBarcodeGraphic } from "./RfidLabelBarcodeGraphic";
import { RfidLabelZplBlock } from "./RfidLabelZplBlock";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";

/** Única redacción para "este registro no trae ZPL": la comparten el estado
 *  vacío de la sección de ZPL y el motivo por el que se bloquea la impresión.
 *  Es la misma condición, no debe decirse de dos maneras. */
const SIN_ZPL_MESSAGE = "Sin ZPL registrado para esta impresión.";

const BROWSER_PRINT_SDK_SRC = "/vendor/browser-print/BrowserPrint-3.1.250.min.js";
const BROWSER_PRINT_ZEBRA_SDK_SRC =
  "/vendor/browser-print/BrowserPrint-Zebra-1.1.250.min.js";

/**
 * Sección de impresión Zebra: detección REAL de impresoras contra el agente
 * local de Browser Print (`127.0.0.1`), sin backend de por medio.
 *
 * "Imprimir etiqueta" REENVÍA el ZPL ya almacenado de ESTE evento histórico
 * (`zpl_enviado`) a la impresora seleccionada. No es una impresión nueva: no
 * se registra nada en el backend, no se generan EPCs y no se llama a
 * `POST /registrar-impresion/` —los EPCs de `etiquetas[]` ya se usaron una vez
 * y volver a registrarlos chocaría con el rechazo de EPC duplicado—. El caso
 * de uso es "la etiqueta física se dañó, sácala otra vez".
 *
 * El ZPL de la sección de arriba con su botón de copiar sigue siendo la
 * salida manual cuando no hay agente —el mismo patrón de degradación que usa
 * el workspace de QA en `nucleo-erp`.
 */
function BrowserPrintSection({ zpl }: { zpl: string | null }) {
  // El SDK de Zebra depende de que `BrowserPrint` ya exista (usa
  // `BrowserPrint.Device`), y `next/script` no garantiza orden entre dos
  // scripts: el segundo se monta hasta que el primero terminó de cargar.
  const [coreLoaded, setCoreLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // El diálogo se desmonta al cerrarse (`RfidLabelColumns` lo monta de forma
  // condicional) y los callbacks del SDK no se pueden cancelar. Sin esto, un
  // envío en vuelo mostraría su toast cuando el usuario ya cerró el diálogo o
  // está viendo otra etiqueta. Mismo patrón que el `aliveRef` de
  // `useBrowserPrintDevices`, que existe por esta misma razón.
  const aliveRef = useRef(true);
  // Token del envío en vuelo (`null` = ninguno). Hace dos trabajos:
  //   1. Guarda contra doble clic — `disabled` solo surte efecto tras el
  //      re-render, así que dos clics en el mismo tick pasarían los dos.
  //   2. Token de resolución — el watchdog y los callbacks reales del SDK
  //      compiten por el mismo token y solo el primero en llegar resuelve. Sin
  //      esto, un callback tardío del SDK contradice al toast del watchdog
  //      ("no se confirmó" seguido de "enviada").
  const pendingSendRef = useRef<object | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const {
    status,
    devices,
    selectedKey,
    selectDevice,
    selectedDevice,
    errorDetail,
    retry,
    handleSdkReady,
    handleSdkError,
  } = useBrowserPrintDevices();

  const tone = DETECTION_TONE[status];
  const hasDevices = devices.length > 0;

  const printerReady = status === "detectado" && selectedDevice !== null;
  // Motivo por el que NO se puede imprimir, o `null` si sí se puede. Se usa
  // tanto para deshabilitar como para explicarlo en el `title`.
  const printBlockedReason = !zpl
    ? SIN_ZPL_MESSAGE
    : !printerReady
      ? "Necesitas una impresora detectada por Browser Print."
      : null;

  /**
   * Cierra el envío identificado por `token`, si sigue siendo el que está en
   * vuelo y el diálogo sigue montado. Devuelve `false` cuando otro camino ya
   * lo resolvió (watchdog vs. callback real) o cuando el diálogo se cerró: en
   * ambos casos quien llama NO debe mostrar feedback, porque sería un toast
   * contradictorio o huérfano.
   */
  const resolveSend = (token: object) => {
    if (!aliveRef.current || pendingSendRef.current !== token) return false;
    pendingSendRef.current = null;
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    setIsSending(false);
    return true;
  };

  const handlePrint = () => {
    if (pendingSendRef.current || !zpl || !selectedDevice) return;
    if (typeof selectedDevice.send !== "function") {
      toast.error("La impresora detectada no expone el método de envío del SDK.");
      return;
    }

    const token = {};
    pendingSendRef.current = token;
    setIsSending(true);

    // El SDK no pone timeout ni garantiza que alguno de los dos callbacks se
    // invoque (si el agente acepta la conexión y nunca responde, o si ni
    // siquiera pudo crear el XHR, no llega nada). Sin esto el botón se
    // quedaría en "Enviando..." hasta cerrar el diálogo. NO se afirma que
    // haya fallado: el XHR ya salió y no se puede cancelar, así que la
    // etiqueta pudo imprimirse igual — el mensaje lo dice explícitamente para
    // que el usuario revise antes de reintentar y no saque dos etiquetas.
    watchdogRef.current = setTimeout(() => {
      if (!resolveSend(token)) return;
      toast.error(
        "Browser Print no confirmó el envío. La etiqueta pudo imprimirse de todos modos: revisa la impresora antes de reintentar."
      );
    }, 15000);

    // El ZPL va tal cual: el SDK lo serializa por dentro (ver
    // `browser-print.d.ts`). Mismo uso que el workspace de QA en `nucleo-erp`.
    selectedDevice.send(
      zpl,
      () => {
        if (!resolveSend(token)) return;
        toast.success(`Etiqueta enviada a ${deviceLabel(selectedDevice)}`);
      },
      (detail) => {
        // El log sí es incondicional: es diagnóstico, no feedback al usuario,
        // y un fallo tardío o post-cierre sigue siendo información útil.
        console.error("[BrowserPrint] envío fallido", detail);
        if (!resolveSend(token)) return;
        const extra = errorDetailToText(detail);
        toast.error(
          extra
            ? `No se pudo imprimir la etiqueta: ${extra}`
            : "No se pudo imprimir la etiqueta. Revisa Browser Print y la impresora."
        );
      }
    );
  };

  return (
    <div>
      {/* `afterInteractive` y montados aquí dentro: el diálogo solo existe
          cuando el usuario lo abre, así que el SDK no se descarga en cada
          página de la app. `next/script` cachea la carga, de modo que reabrir
          el diálogo reutiliza el script ya cargado y vuelve a disparar
          `onReady`. */}
      <Script
        id="zebra-browser-print-core"
        src={BROWSER_PRINT_SDK_SRC}
        strategy="afterInteractive"
        onReady={() => {
          setCoreLoaded(true);
          handleSdkReady();
        }}
        onError={handleSdkError}
      />
      {coreLoaded && (
        <Script
          id="zebra-browser-print-zebra"
          src={BROWSER_PRINT_ZEBRA_SDK_SRC}
          strategy="afterInteractive"
        />
      )}

      <SectionTitle>Impresión Zebra</SectionTitle>
      <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <PrinterIcon className="w-5 h-5 text-slate-400 shrink-0 mt-1" aria-hidden="true" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 min-w-0 text-xs">
            <FormSelect
              label="Impresora detectada"
              value={selectedKey ?? ""}
              disabled={!hasDevices}
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
                  `uid` ES la IP ("192.168.1.154"), y para USB es el identifi-
                  cador del dispositivo. Se muestra tal cual, con el tipo de
                  conexión al lado. */}
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
          <div className="flex items-center gap-3">
            {status !== "detectando" && status !== "cargando-sdk" && (
              <button
                type="button"
                onClick={retry}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
              >
                Reintentar detección
              </button>
            )}
            <Button
              variant="primary"
              onClick={handlePrint}
              disabled={printBlockedReason !== null || isSending}
              title={printBlockedReason ?? undefined}
              leftIcon={
                isSending ? (
                  <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PrinterIcon className="w-4 h-4" aria-hidden="true" />
                )
              }
            >
              {isSending ? "Enviando..." : "Imprimir etiqueta"}
            </Button>
          </div>
        </div>

        {/* Motivo del bloqueo cuando es por el ZPL: el de "no hay impresora"
            ya lo explican los mensajes de estado de abajo, no se repite. */}
        {!zpl && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {SIN_ZPL_MESSAGE} No hay nada que reenviar a la impresora.
          </p>
        )}

        {status === "no-detectado" && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            No se pudo contactar al agente local de Zebra Browser Print en este equipo.
            Verifica que esté instalado y en ejecución. Mientras tanto puedes copiar el
            ZPL de arriba y enviarlo a la impresora por otro medio.
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

/** Vista previa de la etiqueta: los datos reales disponibles de ESTE evento de
 *  impresión, maquetados en HTML. `barcodeValue` viene de `etiquetas[0]`, que
 *  puede no existir (impresión registrada con `rfid_mode: false` no genera
 *  renglones en `etiquetas[]`) — ese caso lo muestra explícito
 *  `RfidLabelBarcodeGraphic`, sin inventar un valor de reemplazo. */
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

      <RfidLabelBarcodeGraphic barcodeValue={barcodeValue} />

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
   *  `ShippingDetailDialog`. */
  etiqueta: EtiquetaRFID;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de un evento de impresión de etiqueta RFID: resumen + vista previa
 * + ZPL enviado + detección de impresoras Zebra.
 *
 * La sección "Impresión Zebra" ya no es la maqueta con impresoras inventadas
 * que tenía el mock: consulta de verdad al agente local de Browser Print
 * (`BrowserPrintSection`). Sigue SIN botón de imprimir — enviar el ZPL a la
 * impresora es una tarea aparte.
 */
export function RfidLabelDetailDialog({
  etiqueta,
  open,
  onOpenChange,
}: RfidLabelDetailDialogProps) {
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
        <RfidLabelZplBlock zpl={etiqueta.zpl_enviado} emptyMessage={SIN_ZPL_MESSAGE} />

        {/* Impresión Zebra. El ZPL viene del registro ya cargado por el
            listado — sin fetch adicional, misma convención que el resto del
            diálogo. */}
        <BrowserPrintSection zpl={etiqueta.zpl_enviado} />
      </div>
    </MainDialog>
  );
}
