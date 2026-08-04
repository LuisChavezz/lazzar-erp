"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detección de impresoras Zebra vía Browser Print.
 *
 * Browser Print es un agente LOCAL instalado en cada PC del almacén que
 * escucha en `127.0.0.1`; el SDK le habla por XHR desde el navegador y el
 * agente habla con la impresora por red. NO hay backend de por medio: ni
 * Next.js ni Django participan en la detección (ni en la impresión). Por eso
 * esto vive como estado local del diálogo y no en TanStack Query — no es
 * estado de servidor, es una capacidad del equipo del usuario, y cambia al
 * ritmo de "¿está corriendo el agente ahora mismo?".
 *
 * Implementación calcada del flujo ya probado contra hardware real en
 * `nucleo-erp`: `templates/QA/rfid/imprimir_etiqueta_workspace.html`
 * (`getDefaultDevice` → `getLocalDevices`).
 */

/** Estados de la detección. `sin-impresoras` y `no-detectado` se distinguen a
 *  propósito: operativamente no son lo mismo (agente vivo pero sin equipos
 *  configurados vs. agente ausente/apagado) y se resuelven distinto. */
export type BrowserPrintStatus =
  | "cargando-sdk"
  | "detectando"
  | "detectado"
  | "sin-impresoras"
  | "no-detectado";

/** Presentación de cada estado de la detección (punto de color + tono de
 *  texto). Los cuatro desenlaces se muestran distintos a propósito:
 *  "sin-impresoras" y "no-detectado" se resuelven de forma diferente
 *  (configurar un equipo vs. instalar/arrancar el agente). Vive aquí, junto al
 *  tipo, para que TODOS los consumidores (el botón de reimpresión del historial
 *  y el selector de "Nueva impresión") lo compartan y no diverja. */
export const DETECTION_TONE: Record<BrowserPrintStatus, { dot: string; text: string }> = {
  "cargando-sdk": { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" },
  detectando: { dot: "bg-sky-500 animate-pulse", text: "text-sky-700 dark:text-sky-400" },
  detectado: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  "sin-impresoras": { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  "no-detectado": { dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
};

/** Texto del estado de detección. `count` solo se usa en `detectado`. */
export function detectionMessage(status: BrowserPrintStatus, count: number): string {
  switch (status) {
    case "cargando-sdk":
      return "Cargando Browser Print...";
    case "detectando":
      return "Detectando impresoras...";
    case "detectado":
      return `${count} impresora${count === 1 ? "" : "s"} detectada${count === 1 ? "" : "s"}`;
    case "sin-impresoras":
      return "Browser Print detectado, sin impresoras disponibles";
    case "no-detectado":
      return "Browser Print no detectado";
  }
}

export interface UseBrowserPrintDevicesResult {
  status: BrowserPrintStatus;
  devices: BrowserPrintDevice[];
  /** `uid` (o nombre, de fallback) de la impresora elegida. */
  selectedKey: string | null;
  selectDevice: (key: string) => void;
  selectedDevice: BrowserPrintDevice | null;
  /** Detalle crudo del error del SDK, cuando lo hubo. Se muestra como texto
   *  secundario: casi siempre viene vacío (ver `browser-print.d.ts`). */
  errorDetail: string | null;
  /** Vuelve a intentar la detección — el caso típico es "arranqué el agente
   *  después de abrir el diálogo". */
  retry: () => void;
  /** A conectar con `onReady` / `onError` de los `<Script>` del SDK. */
  handleSdkReady: () => void;
  handleSdkError: () => void;
}

/** Clave estable de un equipo: el `uid` cuando existe, el nombre si no. */
function deviceKey(device: BrowserPrintDevice): string {
  return device.uid ?? device.name ?? "";
}

export function deviceLabel(device: BrowserPrintDevice): string {
  return device.name ?? device.uid ?? "Impresora Zebra";
}

/** Normaliza el "detalle" que entregan los callbacks de error del SDK (que es
 *  `xhr.response`, casi siempre `""`) a algo mostrable, o `null` si no aporta
 *  nada. Compartido por la detección y por el envío. */
export function errorToText(detail: unknown): string | null {
  if (typeof detail === "string") return detail.trim() || null;
  if (detail == null) return null;
  try {
    const text = JSON.stringify(detail);
    return text && text !== "{}" ? text : null;
  } catch {
    return String(detail);
  }
}

export function useBrowserPrintDevices(): UseBrowserPrintDevicesResult {
  const [status, setStatus] = useState<BrowserPrintStatus>("cargando-sdk");
  const [devices, setDevices] = useState<BrowserPrintDevice[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // El SDK responde por callbacks sin cancelación posible; este flag evita
  // escribir estado si el diálogo ya se cerró (se desmonta al cerrarse).
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const detect = () => {
    const sdk = typeof window === "undefined" ? undefined : window.BrowserPrint;
    if (!sdk) {
      setStatus("no-detectado");
      setErrorDetail("El SDK de Browser Print no está disponible en la página.");
      return;
    }

    setStatus("detectando");
    setErrorDetail(null);

    // Acumulador local: los dos callbacks del SDK se encadenan y necesitan ver
    // la lista combinada antes de que React haya re-renderizado.
    const found: BrowserPrintDevice[] = [];
    const addDevice = (device: BrowserPrintDevice | null | undefined) => {
      if (!device) return;
      if (!found.some((item) => deviceKey(item) === deviceKey(device))) {
        found.push(device);
      }
    };

    const fail = (detail: unknown) => {
      if (!aliveRef.current) return;
      console.error("[BrowserPrint] detección fallida", detail);
      // Si `getDefaultDevice` sí respondió y el que falló fue
      // `getLocalDevices`, el agente está vivo: se conserva lo detectado en
      // vez de degradar a "no detectado", que diría algo falso.
      if (found.length > 0) {
        setDevices([...found]);
        setSelectedKey(deviceKey(found[0]));
        setStatus("detectado");
      } else {
        setDevices([]);
        setSelectedKey(null);
        setStatus("no-detectado");
      }
      setErrorDetail(errorToText(detail));
    };

    sdk.getDefaultDevice(
      "printer",
      (defaultDevice) => {
        if (!aliveRef.current) return;
        addDevice(defaultDevice);

        sdk.getLocalDevices(
          (deviceList) => {
            if (!aliveRef.current) return;
            (deviceList ?? []).forEach(addDevice);
            setDevices([...found]);
            // La predeterminada del sistema queda preseleccionada por venir
            // primera en `found`; si no había, se toma la primera local.
            setSelectedKey(found.length > 0 ? deviceKey(found[0]) : null);
            setStatus(found.length > 0 ? "detectado" : "sin-impresoras");
          },
          fail,
          "printer"
        );
      },
      fail
    );
  };

  // La detección arranca cuando el SDK avisa que cargó (`onReady` del
  // `<Script>`), no en un efecto de montaje: antes de eso `window.BrowserPrint`
  // no existe.
  const sdkReadyRef = useRef(false);

  const handleSdkReady = () => {
    if (sdkReadyRef.current) return;
    sdkReadyRef.current = true;
    detect();
  };

  const handleSdkError = () => {
    if (!aliveRef.current) return;
    setStatus("no-detectado");
    setErrorDetail("No se pudo cargar el SDK de Browser Print.");
  };

  // `detect()` ya cubre el caso "el SDK no cargó" con su propio mensaje, así
  // que reintentar es simplemente volver a detectar.
  const retry = () => detect();

  const selectedDevice =
    devices.find((device) => deviceKey(device) === selectedKey) ?? devices[0] ?? null;

  return {
    status,
    devices,
    selectedKey,
    selectDevice: setSelectedKey,
    selectedDevice,
    errorDetail,
    retry,
    handleSdkReady,
    handleSdkError,
  };
}

export { deviceKey };
