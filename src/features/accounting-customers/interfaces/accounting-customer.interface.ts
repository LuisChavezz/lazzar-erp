import { Customer } from "@/src/features/customers/interfaces/customer.interface";

/**
 * Campos compartidos con Customer (/terceros/clientes/) vía Pick, porque
 * /finanzas/clientes-contabilidad/ devuelve el mismo tipo para esos campos.
 * `id` y `celular` son propios de este recurso: aquí `id` es numérico (a
 * diferencia del id string de Customer) y `celular` no existe en Customer.
 */
export interface AccountingCustomer
  extends Pick<
    Customer,
    | "nombre"
    | "razon_social"
    | "rfc"
    | "correo"
    | "telefono"
    | "ciudad"
    | "estado"
    | "activo"
  > {
  id: number;
  celular: string | null;
}
