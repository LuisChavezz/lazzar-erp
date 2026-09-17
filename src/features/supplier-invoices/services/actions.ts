import { v1_api } from "@/src/api/v1.api";
import type {
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
