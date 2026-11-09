import { Customer } from "@/src/features/customers/interfaces/customer.interface";

/**
 * Campos compartidos con Customer (/terceros/clientes/) vía Pick, porque
 * /terceros/clientes-mesa-control/ devuelve el mismo tipo para esos campos.
 * A diferencia de Customer, este endpoint incluye clientes inactivos (sin
 * filtro `activo=True`). `id` es numérico aquí (a diferencia del id string
 * de Customer, igual que en AccountingCustomer); `celular` y `contacto` son
 * propios de este recurso.
 */
export interface OperationsCustomer
  extends Pick<
    Customer,
    "nombre" | "razon_social" | "rfc" | "telefono" | "correo" | "ciudad" | "estado" | "activo"
  > {
  id: number;
  celular: string | null;
  contacto: string | null;
  /**
   * Fecha de la última compra real del cliente (`"YYYY-MM-DD"`). El backend
   * siempre la envía; `null` = el cliente no tiene compras y la columna
   * muestra «Sin compras».
   */
  fecha_ultima_compra: string | null;
}
