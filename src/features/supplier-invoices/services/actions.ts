import { v1_api } from "@/src/api/v1.api";
import { SLOW_REQUEST_TIMEOUT_MS } from "@/src/constants/httpTimeouts";
import { readBlobErrorBody } from "@/src/utils/readBlobErrorBody";
import type {
  AdjuntarPdfFacturaProveedorResponse,
  AjusteMaquilaPayload,
  CreateFacturaProveedorPayload,
  FacturaProveedor,
  FacturaProveedorQueryParams,
  UpdateFacturaProveedorPayload,
} from "../interfaces/supplier-invoice.interface";

/**
 * Lista facturas de proveedor: `GET /finanzas/facturas-proveedor/`.
 *
 * Los parámetros son opcionales; Axios omite las llaves `undefined`. La
 * respuesta es PESADA (renglones anidados, sin paginación) y el backend ya la
 * acota por empresa: quien llame debe acotarla además en el servidor (por
 * `proveedor` o `recepcion`).
 *
 * Es el fetcher ÚNICO del endpoint: lo usan este módulo y el selector de
 * facturas de `accounts-payable` (`useFacturasProveedor`). Todas las llaves de
 * caché que lo consumen cuelgan de `["facturas-proveedor", params]`.
 */
export const getSupplierInvoices = async (
  params?: FacturaProveedorQueryParams,
): Promise<FacturaProveedor[]> => {
  const { data } = await v1_api.get<FacturaProveedor[]>(
    "/finanzas/facturas-proveedor/",
    { params },
  );
  return data;
};

/**
 * Alta de una factura de proveedor con sus renglones anidados.
 *
 * ATÓMICA (`@transaction.atomic` en `perform_create`): un renglón rechazado
 * —por ejemplo un `oc_detalle` que no es de la OC— significa que NO se creó
 * nada. Con `estatus: "Registrada"` la CxP se genera dentro de esa misma
 * transacción.
 *
 * El error se deja propagar tal cual para que el hook lo normalice con
 * `parseSupplierInvoiceError` (no con `extractErrorMessage`, que no desenvuelve
 * la forma de DRF).
 */
export const createSupplierInvoice = async (
  payload: CreateFacturaProveedorPayload,
): Promise<FacturaProveedor> => {
  const { data } = await v1_api.post<FacturaProveedor>(
    "/finanzas/facturas-proveedor/",
    payload,
  );
  return data;
};

/**
 * Actualización PARCIAL: `PATCH /finanzas/facturas-proveedor/{id}/`.
 *
 * Sin renglones (ver `UpdateFacturaProveedorPayload`). Pasar `estatus` de
 * `Borrador` a `Registrada` genera la CxP (`perform_update`, con bloqueo de fila
 * para que dos registros concurrentes no la generen dos veces). Con una CxP viva,
 * el backend rechaza cambiar total/proveedor/moneda o regresar el estatus.
 */
export const updateSupplierInvoice = async ({
  id,
  payload,
}: {
  id: number;
  payload: UpdateFacturaProveedorPayload;
}): Promise<FacturaProveedor> => {
  const { data } = await v1_api.patch<FacturaProveedor>(
    `/finanzas/facturas-proveedor/${id}/`,
    payload,
  );
  return data;
};

/**
 * Cancela una factura de proveedor con el motivo obligatorio:
 * `POST /finanzas/facturas-proveedor/{id}/cancelar/` (nucleo-erp#1356, EC-950;
 * exige `CANCELAR-FIN-PAGOS`). Su CxP queda `Cancelada` y su póliza con
 * contrapóliza; con pagos aplicados responde `400`. Responde la factura con los
 * datos de la cancelación.
 */
export const cancelSupplierInvoice = async (id: number, motivo: string): Promise<FacturaProveedor> => {
  const { data } = await v1_api.post<FacturaProveedor>(`/finanzas/facturas-proveedor/${id}/cancelar/`, { motivo });
  return data;
};

/**
 * Elimina un BORRADOR: `DELETE /finanzas/facturas-proveedor/{id}/`. Desde
 * nucleo-erp#1356 solo procede en `Borrador`; en otro estatus responde
 * `400 estatus` y hay que cancelarla (`cancelSupplierInvoice`).
 */
export const deleteSupplierInvoice = async (id: number): Promise<void> => {
  await v1_api.delete(`/finanzas/facturas-proveedor/${id}/`);
};

/**
 * Adjunta (o REEMPLAZA: no hay borrado) el PDF del proveedor:
 * `POST /finanzas/facturas-proveedor/{id}/adjuntar-pdf/`, multipart con el único
 * campo `archivo`. Se permite en cualquier estatus, incluida `Cancelada`.
 *
 * `postForm` y no `post`: `v1_api` fija `Content-Type: application/json` por
 * defecto, y con esa cabecera Axios serializa el `FormData` a JSON (el archivo
 * se pierde). `postForm` pone `multipart/form-data` SOLO en esta petición, así
 * que Axios deja pasar el `FormData` intacto; en el navegador el adaptador XHR
 * borra entonces la cabecera (`resolveConfig`) para que la escriba el propio
 * navegador CON el `boundary`. Sigue siendo `v1_api`: viaja con
 * `withCredentials` y pasa por el interceptor de refresco ante un 401.
 *
 * Errores: 400 `{"archivo": "..."}` (falta, no es PDF, supera 10 MB). Ojo: Vercel
 * corta el cuerpo en ~4.5 MB ANTES de Django y sin cabeceras CORS, así que un
 * archivo grande llega aquí como error de red sin `response` — por eso la
 * vista valida el tamaño antes de llamar (`validateSupplierInvoicePdf`).
 * Tope lento (`SLOW_REQUEST_TIMEOUT_MS`): es una subida de archivo.
 */
export const uploadSupplierInvoicePdf = async ({
  id,
  file,
}: {
  id: number;
  file: File;
}): Promise<AdjuntarPdfFacturaProveedorResponse> => {
  const formData = new FormData();
  formData.append("archivo", file);
  const { data } = await v1_api.postForm<AdjuntarPdfFacturaProveedorResponse>(
    `/finanzas/facturas-proveedor/${id}/adjuntar-pdf/`,
    formData,
    { timeout: SLOW_REQUEST_TIMEOUT_MS },
  );
  return data;
};

/**
 * Documento fusionado OC + RC + factura del proveedor (en ese orden; en la de
 * maquila, portada de la SM en lugar de la OC, nucleo-erp #1233):
 * `GET /finanzas/facturas-proveedor/{id}/pdf-fusionado/`, bytes `application/pdf`.
 *
 * Devuelve también el `Content-Disposition`, que el backend expone por CORS
 * (`CORS_EXPOSE_HEADERS`): de ahí sale el nombre del archivo (EC-919).
 *
 * Con `responseType: "blob"` el cuerpo de un ERROR también llega como `Blob`
 * (p. ej. el 400 `{"pdf_adjunto": "..."}` cuando no hay PDF adjunto), así que se
 * decodifica antes de propagarlo para que los parsers de DRF lo lean como JSON.
 * Tope lento (`SLOW_REQUEST_TIMEOUT_MS`): el backend fusiona los PDF al vuelo.
 */
export const getSupplierInvoiceMergedPdf = async (
  id: number,
): Promise<{ blob: Blob; contentDisposition: string | undefined }> => {
  try {
    const response = await v1_api.get<Blob>(
      `/finanzas/facturas-proveedor/${id}/pdf-fusionado/`,
      { responseType: "blob", timeout: SLOW_REQUEST_TIMEOUT_MS },
    );
    const header: unknown = response.headers?.["content-disposition"];
    return { blob: response.data, contentDisposition: typeof header === "string" ? header : undefined };
  } catch (error) {
    throw await readBlobErrorBody(error);
  }
};

/**
 * Ajusta precio, descuento e impuesto de las líneas de una factura de maquila
 * en Borrador para cuadrarla con la factura real del maquilero:
 * `POST /finanzas/facturas-proveedor/{id}/ajustar-maquila/` (nucleo-erp #1242).
 * No agrega ni quita líneas; el backend recalcula subtotal, total y el
 * encabezado y responde la factura completa (forma de lectura). Exige
 * `E-FIN-FACTURAS`; 400 si no es de maquila (`salida_maquila`), si no está en
 * Borrador (`estatus`) o si una línea no es de la factura (`lineas`).
 */
export const ajustarFacturaMaquila = async ({
  id,
  payload,
}: {
  id: number;
  payload: AjusteMaquilaPayload;
}): Promise<FacturaProveedor> => {
  const { data } = await v1_api.post<FacturaProveedor>(
    `/finanzas/facturas-proveedor/${id}/ajustar-maquila/`,
    payload,
  );
  return data;
};

/**
 * Detalle de una factura de proveedor (`GET /finanzas/facturas-proveedor/{id}/`),
 * con sus renglones y el producto de cada uno (EC-904). Lo usa el PDF
 * (EC-859) para leerla FRESCA; el diálogo de detalle sigue con la fila del
 * listado. Otra empresa responde 404.
 */
export const getSupplierInvoice = async (id: number): Promise<FacturaProveedor> => {
  const { data } = await v1_api.get<FacturaProveedor>(`/finanzas/facturas-proveedor/${id}/`);
  return data;
};
