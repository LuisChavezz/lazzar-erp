import { v1_api } from "@/src/api/v1.api";
import { readBlobErrorBody } from "@/src/utils/readBlobErrorBody";
import type {
  AdjuntarPdfFacturaProveedorResponse,
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
  );
  return data;
};

/**
 * Documento fusionado OC + RC + factura del proveedor (en ese orden):
 * `GET /finanzas/facturas-proveedor/{id}/pdf-fusionado/`, bytes `application/pdf`.
 *
 * Con `responseType: "blob"` el cuerpo de un ERROR también llega como `Blob`
 * (p. ej. el 400 `{"pdf_adjunto": "..."}` cuando no hay PDF adjunto), así que se
 * decodifica antes de propagarlo para que los parsers de DRF lo lean como JSON.
 */
export const getSupplierInvoiceMergedPdf = async (id: number): Promise<Blob> => {
  try {
    const { data } = await v1_api.get<Blob>(
      `/finanzas/facturas-proveedor/${id}/pdf-fusionado/`,
      { responseType: "blob" },
    );
    return data;
  } catch (error) {
    throw await readBlobErrorBody(error);
  }
};
