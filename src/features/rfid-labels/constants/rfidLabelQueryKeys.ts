/**
 * Prefijo de las consultas del historial (listado y detalle). El registro de
 * una impresión (`useRegisterRfidLabel`, `RfidLabelPrintStep`) invalida este
 * prefijo, así que refresca las dos sin conocer sus llaves. El preview del
 * onboarding vive en `["etiquetas-rfid-onboarding"]`, que NO cuelga de aquí.
 */
export const RFID_LABELS_KEY = ["etiquetas-rfid"] as const;

export const rfidLabelDetailQueryKey = (id: number) => [...RFID_LABELS_KEY, "detail", id] as const;
