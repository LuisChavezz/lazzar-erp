import { z } from "zod";
import type { FacturaProveedor } from "../interfaces/factura-proveedor.interface";

/**
 * Esquema del formulario de alta manual de una cuenta por pagar.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: además de lo que viaja al
 * API, arrastra datos de la factura elegida que solo se pintan
 * (`factura_proveedor_folio`, `proveedor_nombre`, `moneda_codigo`). El mapeo al
 * cuerpo del API vive en `utils/buildCuentaPorPagarPayload.ts`.
 *
 * El formulario lo gobierna el selector de factura de proveedor: al elegirla se
 * siembran `proveedor`, `total` y el vencimiento precargado con
 * `valuesFromFacturaProveedor`, la definición única de esa derivación.
 *
 * ─── LO QUE ESTE ESQUEMA **NO** VALIDA, A PROPÓSITO ────────────────────────
 *
 * 1. **Que `proveedor` y `total` coincidan con la factura.** El backend los
 *    cruza (400 en `proveedor`/`total`), pero aquí se DERIVAN de la factura
 *    elegida: coinciden por construcción y un refine sería tautológico. Por lo
 *    mismo no se reutilizan `MONEY_REGEX`/`toCents`: `total` no se captura, se
 *    copia tal cual del decimal que devolvió el API.
 * 2. **Que `total` sea mayor a 0.** El backend no lo exige: solo lo compara
 *    contra el `total` de la factura, sea cual sea.
 * 3. **Que la factura no tenga ya una CxP.** Es regla del backend (400 en
 *    `factura_proveedor`), pero depende de datos del servidor que el esquema no
 *    tiene; el 400 sigue siendo la autoridad.
 * 4. **Relación entre `fecha_vencimiento` y la emisión.** El backend no tiene
 *    ninguna.
 */
export const CuentaPorPagarFormSchema = z.object({
  /** FK a la factura de proveedor. `0` = ninguna elegida. */
  factura_proveedor: z
    .number()
    .int()
    .positive("Selecciona la factura del proveedor"),
  /**
   * FK al proveedor. `0` = ninguno. Nunca discrepa de la factura: el selector
   * solo ofrece facturas de este proveedor y, al elegir una, se re-siembra
   * desde ella.
   */
  proveedor: z.number().int().positive("Selecciona el proveedor"),
  /** Total de la factura, copiado tal cual (decimal en string). */
  total: z.string().min(1, "Selecciona la factura del proveedor"),
  /** Folio de la factura, solo para mostrar. Nullable como en el API. */
  factura_proveedor_folio: z.string().nullable(),
  /** Nombre del proveedor, solo para mostrar. Nullable como en el API. */
  proveedor_nombre: z.string().nullable(),
  /** Código ISO de la moneda de la factura, para formatear `total`. */
  moneda_codigo: z.string().nullable(),
  /**
   * `<input type="date">` entrega "" o "YYYY-MM-DD". Se precarga con el de la
   * factura y es editable. Vacío es válido: la llave se OMITE y el backend copia
   * el vencimiento de la factura (ver `buildCuentaPorPagarPayload`).
   */
  fecha_vencimiento: z.string(),
  observaciones: z.string(),
});

export type CuentaPorPagarFormValues = z.infer<typeof CuentaPorPagarFormSchema>;

/** Valores iniciales del formulario — sin factura: la siembra el selector. */
export const createEmptyCuentaPorPagarForm = (): CuentaPorPagarFormValues => ({
  factura_proveedor: 0,
  proveedor: 0,
  total: "",
  factura_proveedor_folio: null,
  proveedor_nombre: null,
  moneda_codigo: null,
  fecha_vencimiento: "",
  observaciones: "",
});

/**
 * Campos que siembra la factura elegida. Definición ÚNICA de la derivación
 * factura → CxP: `proveedor` y `total` salen de aquí y de ningún otro lado, de
 * modo que lo que viaja al API no pueda discrepar del cruce que hace el backend.
 *
 * `fecha_vencimiento` se PRECARGA con la de la factura (`null` → "") y queda
 * editable. `observaciones` no se toca: las de la factura son de la factura, no
 * de la cuenta.
 */
export const valuesFromFacturaProveedor = (
  factura: FacturaProveedor,
): Omit<CuentaPorPagarFormValues, "observaciones"> => ({
  factura_proveedor: factura.id,
  proveedor: factura.proveedor,
  total: factura.total,
  factura_proveedor_folio: factura.folio,
  proveedor_nombre: factura.proveedor_nombre,
  moneda_codigo: factura.moneda_codigo,
  fecha_vencimiento: factura.fecha_vencimiento ?? "",
});
