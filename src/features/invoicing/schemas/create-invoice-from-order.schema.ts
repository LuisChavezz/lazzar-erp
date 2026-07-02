import { z } from "zod";

/**
 * Esquema de creación de factura desde un pedido
 * (`POST /finanzas/facturas/desde-pedido/`).
 *
 * El contrato del endpoint recibe **únicamente** `{ pedido: number }`: no existe
 * selección de partidas ni facturación parcial — el servidor resuelve todo el
 * `factura_detalles` a partir del pedido. En el formulario `pedido` parte de `0`
 * (sin selección), por lo que `.positive()` funciona como el guard de "elige un
 * pedido".
 *
 * Nota: se usa la sintaxis de Zod v4 (mensaje posicional en `.positive()`), la
 * misma convención que el resto de esquemas del proyecto
 * (ver `create-production-order.schema.ts`).
 */
export const CreateInvoiceFromOrderSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
});

export type CreateInvoiceFromOrderValues = z.infer<
  typeof CreateInvoiceFromOrderSchema
>;
