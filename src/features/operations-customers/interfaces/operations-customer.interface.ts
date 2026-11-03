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
   * Fecha del último pedido del cliente (ISO). Opcional: pedida al backend;
   * mientras no llegue, la columna muestra "—".
   */
  fecha_ultima_compra?: string | null;
}
