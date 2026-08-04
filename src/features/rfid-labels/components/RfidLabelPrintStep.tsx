"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDebounce } from "@/src/hooks/useDebounce";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { FormToggle } from "@/src/components/FormToggle";
import {
  ArrowLeftIcon,
  LoadingSpinnerIcon,
  PrinterIcon,
} from "@/src/components/Icons";
import { SectionTitle, InfoField, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useBrowserPrintDevices, deviceLabel } from "../hooks/useBrowserPrintDevices";
import { useRfidLabelOnboarding } from "../hooks/useRfidLabelOnboarding";
import { useRegisterRfidLabel, parseRfidRegisterError } from "../hooks/useRegisterRfidLabel";
import { sendZplToDevice, type SendZplResult } from "../utils/sendZplToDevice";
import { BrowserPrintPicker } from "./BrowserPrintPicker";
import { RfidLabelBarcodeGraphic } from "./RfidLabelBarcodeGraphic";
import { RfidLabelZplBlock } from "./RfidLabelZplBlock";
import type {
  RfidOnboardingResult,
  RfidOnboardingPreview,
  RfidRegisterPayload,
} from "../interfaces/rfid-onboarding.interface";

/** Tope PRÁCTICO en la UI. El backend admite hasta 10000, pero un lote RFID real
 *  es de pocas decenas; capar aquí evita que un typo lance cientos de etiquetas
 *  físicas. No es un límite del backend. */
const MAX_CANTIDAD_UI = 100;

type FlowPhase = "idle" | "printing" | "registering";

interface RfidLabelPrintStepProps {
  selected: RfidOnboardingResult;
  onBack: () => void;
  onSuccess: () => void;
}

/**
 * Paso 2 — Configurar, imprimir y registrar.
 *
 * Reúne cantidad + modo RFID, pide el preview real (`zpl_individual[]`), detecta
 * la impresora (reutilizando `useBrowserPrintDevices` + `BrowserPrintPicker`) e
 * imprime el LOTE completo etiqueta por etiqueta, deteniéndose ante el primer
 * fallo. Al terminar registra UNA vez con el resultado real.
 *
 * Estrategia de fallo parcial: se DETIENE en la primera etiqueta que falla (no
 * tiene sentido seguir enviando a una impresora atascada). El registro se hace
 * igual, una sola vez: `status=EXITO` solo si TODAS se enviaron, `FALLIDO` en
 * cualquier otro caso, con el conteo real en `observaciones`. El `cantidad` y el
 * `etiquetas[]` que se registran son los del preview COMPLETO (N), porque el
 * backend exige `len(etiquetas) == cantidad`; los EPCs de las que sí salieron
 * quedan así en el registro, y como el backend marca todos los tags de un
 * evento no-EXITO en `PENDIENTE`, un fallo parcial deja el lote sin confirmar
 * para reconciliación humana.
 */
export function RfidLabelPrintStep({ selected, onBack, onSuccess }: RfidLabelPrintStepProps) {
  const [cantidad, setCantidad] = useState(1);
  const [rfidMode, setRfidMode] = useState(true);
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [banner, setBanner] = useState<string | null>(null);

  const browserPrint = useBrowserPrintDevices();
  const register = useRegisterRfidLabel();

  // Guardas de carrera (mismo patrón que el botón de reimpresión del historial):
  //  - `aliveRef`: no tocar estado ni registrar si el diálogo se desmontó a
  //    media impresión (los callbacks del SDK no se pueden cancelar).
  //  - `runningRef`: token síncrono contra doble clic — `disabled` solo surte
  //    efecto tras el re-render, así que dos clics en el mismo tick pasarían.
  const aliveRef = useRef(true);
  const runningRef = useRef(false);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // La cantidad va debounced al preview: sin esto cada pulsación regeneraría el
  // preview (y sus EPCs). Se acota a [1, MAX] antes de pedir el preview.
  const debouncedCantidad = useDebounce(cantidad, 400);
  const cantidadForQuery = Math.min(Math.max(debouncedCantidad || 1, 1), MAX_CANTIDAD_UI);

  const variante = selected.tipo === "variante" ? selected.producto_variante_id : null;
  const producto = selected.tipo === "producto" ? selected.producto_id : null;

  const {
    data: onboarding,
    isFetching: previewFetching,
    isError: previewIsError,
    error: previewError,
    refetch: refetchPreview,
  } = useRfidLabelOnboarding({
    variante,
    producto,
    cantidad: cantidadForQuery,
    rfid_mode: rfidMode,
  });

  const preview = onboarding?.preview ?? null;
  // El GET del onboarding responde 400 con `{ error }` ante una selección
  // inválida; se muestra igual que cualquier error de carga.
  const previewErrorMessage = previewIsError
    ? extractErrorMessage(previewError, "No se pudo generar la vista previa.")
    : (onboarding?.error && typeof onboarding.error === "string" ? onboarding.error : null);

  const printerReady =
    browserPrint.status === "detectado" && browserPrint.selectedDevice !== null;
  const isBusy = phase !== "idle";
  // La vista previa está lista para imprimir cuando existe, tiene ZPLs, no está
  // recargando y —clave— refleja la cantidad ACTUAL. Sin `preview.cantidad ===
  // cantidad`, durante los 400ms de debounce el preview sigue siendo el de la
  // cantidad anterior mientras el input ya muestra la nueva, y un clic imprimiría
  // la cantidad vieja.
  const previewReady =
    preview !== null &&
    preview.zpl_individual.length > 0 &&
    preview.cantidad === cantidad &&
    !previewFetching;
  const canPrint = !isBusy && printerReady && previewReady;

  const blockedReason = isBusy
    ? undefined
    : !printerReady
      ? "Necesitas una impresora detectada por Browser Print."
      : preview === null || preview.zpl_individual.length === 0
        ? "Genera primero una vista previa válida."
        : !previewReady
          ? "Espera a que la vista previa refleje la cantidad."
          : undefined;

  const buildPayload = (
    snapshot: RfidOnboardingPreview,
    status: "EXITO" | "FALLIDO",
    observaciones: string | null,
  ): RfidRegisterPayload => {
    const target =
      snapshot.producto_variante !== null
        ? { producto_variante: snapshot.producto_variante.id }
        : { producto: snapshot.producto!.id };

    return {
      ...target,
      cantidad: snapshot.cantidad,
      rfid_mode: snapshot.rfid_mode,
      printer_name: browserPrint.selectedDevice?.name ?? null,
      printer_address: browserPrint.selectedDevice?.uid ?? null,
      status,
      // Representativo: el ZPL de la primera etiqueta. Con `rfid_mode` apagado
      // todas son iguales; con él encendido cada una lleva su EPC, y la primera
      // es lo que la reimpresión del historial puede reenviar.
      zpl_enviado: snapshot.zpl_individual[0] ?? null,
      observaciones,
      // Solo con RFID: los EPCs son los mismos que van codificados en el ZPL
      // que se envió a los tags. Sin RFID no hay EPC que persistir y el backend
      // ignora el arreglo de todos modos.
      etiquetas: snapshot.rfid_mode
        ? snapshot.etiquetas.map((e) => ({
            epc: e.epc,
            barcode_value: e.barcode_value,
            serial: e.serial,
          }))
        : undefined,
    };
  };

  const handlePrintAndRegister = async () => {
    if (runningRef.current) return;
    const snapshot = preview;
    const device = browserPrint.selectedDevice;
    if (!snapshot || !device || snapshot.zpl_individual.length === 0) return;

    runningRef.current = true;
    setBanner(null);
    setPhase("printing");

    const total = snapshot.zpl_individual.length;
    setProgress({ current: 0, total });

    // ── Impresión del lote: se DETIENE en el primer fallo ──────────────────
    let sent = 0;
    let printError: SendZplResult | null = null;
    for (let i = 0; i < total; i++) {
      setProgress({ current: i + 1, total });
      const result = await sendZplToDevice(device, snapshot.zpl_individual[i]);
      if (!aliveRef.current) {
        runningRef.current = false;
        return; // diálogo cerrado a media impresión: no registrar
      }
      if (result.ok) {
        sent += 1;
      } else {
        printError = result;
        break;
      }
    }

    const allOk = sent === total;
    const status: "EXITO" | "FALLIDO" = allOk ? "EXITO" : "FALLIDO";
    const observaciones = allOk
      ? null
      : `Impresión detenida: ${sent} de ${total} etiqueta(s) enviada(s).` +
        (printError?.timedOut
          ? " La impresora no confirmó la última etiqueta."
          : printError?.detail
            ? ` Error: ${printError.detail}`
            : printError
              ? " Error al enviar a la impresora."
              : "");

    // ── Registro (una sola vez, con el resultado real) ─────────────────────
    setPhase("registering");
    try {
      await register.mutateAsync(buildPayload(snapshot, status, observaciones));
    } catch (err) {
      if (!aliveRef.current) {
        runningRef.current = false;
        return;
      }
      const parsed = parseRfidRegisterError(err);
      setBanner(
        `Se enviaron ${sent} de ${total} etiqueta(s) a la impresora, pero no se pudo registrar la impresión: ${parsed.message}`,
      );
      toast.error(parsed.message);
      // Los EPCs del preview quedaron potencialmente quemados (una carrera pudo
      // ganarlos); regenerar antes de permitir otro intento.
      refetchPreview();
      setPhase("idle");
      runningRef.current = false;
      return;
    }

    if (!aliveRef.current) {
      runningRef.current = false;
      return;
    }
    runningRef.current = false;

    if (allOk) {
      toast.success(`Impresión registrada: ${total} etiqueta(s).`);
      onSuccess();
      return;
    }

    // Fallo parcial: registrado como FALLIDO y visible en el historial. Se deja
    // el diálogo abierto para corregir (atasco, etc.) y reintentar; el preview
    // ya se regeneró con EPCs frescos vía la invalidación del registro.
    setBanner(observaciones);
    toast(`Registrada con fallo: ${sent} de ${total} impresas.`, { icon: "⚠️" });
    setPhase("idle");
  };

  const printButtonLabel =
    phase === "printing"
      ? `Imprimiendo ${progress.current} de ${progress.total}...`
      : phase === "registering"
        ? "Registrando..."
        : "Imprimir y registrar";

  return (
    <div className="space-y-5">
      {/* Producto seleccionado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {selected.nombre}
          </p>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            {selected.tipo === "variante"
              ? textOrDash(selected.sku)
              : textOrDash(selected.codigo ?? selected.cod_proscai)}
            {(selected.color_nombre || selected.talla_nombre) && (
              <span className="ml-2 font-sans text-slate-400">
                {[selected.color_nombre, selected.talla_nombre].filter(Boolean).join(" · ")}
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} disabled={isBusy}>
          <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
          Cambiar
        </Button>
      </div>

      {/* Parámetros */}
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Cantidad de etiquetas"
          type="number"
          min={1}
          max={MAX_CANTIDAD_UI}
          value={cantidad}
          disabled={isBusy}
          onChange={(event) => {
            const parsed = parseInt(event.target.value, 10);
            setCantidad(Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), MAX_CANTIDAD_UI));
          }}
        />
        <FormToggle
          label="Modo RFID"
          description={rfidMode ? "Con EPC (RFID)" : "Solo visual (sin EPC)"}
          checked={rfidMode}
          disabled={isBusy}
          onChange={(event) => setRfidMode(event.target.checked)}
        />
      </div>

      {/* Vista previa de la etiqueta: UNA sola sección con el encabezado
          (title/primary/secondary), el código de barras simulado (mismo
          componente que el detalle del historial), el meta y, al pie, las
          métricas del lote (cuántas etiquetas y en qué modo). El valor del
          código ya lo muestra el gráfico, así que no se repite como campo.
          Cubre también los estados de carga/error del preview. */}
      <div>
        <SectionTitle>Vista previa de la etiqueta</SectionTitle>
        {previewErrorMessage ? (
          <p className="rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {previewErrorMessage}
          </p>
        ) : preview === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
            Generando vista previa...
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-800/40 px-5 py-4">
            <p className="text-base font-bold leading-tight text-slate-800 dark:text-white truncate">
              {preview.preview_data.title}
            </p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              {preview.preview_data.primary_line}
            </p>
            {preview.preview_data.secondary_line && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {preview.preview_data.secondary_line}
              </p>
            )}

            <RfidLabelBarcodeGraphic barcodeValue={preview.preview_data.barcode_value} />

            {preview.preview_data.meta_line && (
              <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
                {preview.preview_data.meta_line}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-slate-100 dark:border-white/10 pt-3">
              <InfoField label="A imprimir">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {preview.zpl_individual.length} etiqueta
                  {preview.zpl_individual.length === 1 ? "" : "s"}
                </span>
              </InfoField>
              <InfoField label="Modo">{preview.rfid_mode ? "RFID (EPC)" : "Visual"}</InfoField>
            </div>

            {previewFetching && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <LoadingSpinnerIcon className="w-3 h-3 animate-spin" aria-hidden="true" />
                Actualizando...
              </p>
            )}
          </div>
        )}
      </div>

      {/* ZPL generado: muestra `zpl_individual[0]`. Con RFID activo y más de una
          etiqueta, el resto lleva EPCs distintos —cada una es un ZPL completo,
          no un fragmento—, así que se aclara que esto es solo una muestra en
          vez de construir un selector para ver las N (fuera de alcance). Sin
          RFID el backend repite el MISMO `zpl_normal` en las N posiciones
          (`[zpl_normal] * cantidad`), así que aquí no hay nada que aclarar: lo
          que se ve es, literalmente, lo que imprime cada etiqueta. */}
      {preview && (
        <RfidLabelZplBlock
          zpl={preview.zpl_individual[0] ?? null}
          note={
            preview.rfid_mode && preview.zpl_individual.length > 1 ? (
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic">
                Muestra de la etiqueta 1 de {preview.zpl_individual.length}: cada una se
                imprime con su propio EPC único, distinto al de aquí arriba.
              </p>
            ) : null
          }
        />
      )}

      {/* Impresora */}
      <div>
        <SectionTitle>Impresión Zebra</SectionTitle>
        <BrowserPrintPicker browserPrint={browserPrint} disabled={isBusy} />
      </div>

      {banner && (
        <p className="rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          {banner}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
        <Button
          variant="primary"
          onClick={handlePrintAndRegister}
          disabled={!canPrint}
          title={blockedReason}
          leftIcon={
            isBusy ? (
              <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <PrinterIcon className="w-4 h-4" aria-hidden="true" />
            )
          }
        >
          {printButtonLabel}
        </Button>
      </div>

      {printerReady && !isBusy && browserPrint.selectedDevice && (
        <p className="text-[11px] text-right text-slate-400 dark:text-slate-500 -mt-3">
          Se enviará a {deviceLabel(browserPrint.selectedDevice)}
        </p>
      )}
    </div>
  );
}
