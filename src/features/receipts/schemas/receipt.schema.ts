import { z } from "zod";
import { tieneCantidadRecibida } from "../utils/receiptQuantities";

export const CANTIDADES_REQUIRED_MESSAGE =
  "Captura al menos una cantidad recibida mayor a 0";

const cantidadesSchema = z.record(z.string(), z.string());

export const SERIES_SUCURSAL_EMPTY_MESSAGE =
  "La sucursal de la orden no tiene series de recepción (RC, RT o RZ) activas.";

/**
 * Esquema del alta de recepción. `conRenglones` dice si el flujo captura
 * renglones: con ellos se exige al menos una cantidad; sin ellos (SM de OB/OR,
 * que va con `detalle: []`, EC-912) no hay cantidades que pedir.
 *
 * `seriesDisponibles`, si se da, son las series de la sucursal de la orden
 * (`receiptSeriesDeSucursal`, EC-922): la serie elegida tiene que ser una de
 * ellas, y sin ninguna no se puede guardar.
 */
export const buildReceiptFormSchema = ({
  conRenglones,
  seriesDisponibles,
}: {
  conRenglones: boolean;
  seriesDisponibles?: readonly string[];
}) =>
  z.object({
    almacen: z.coerce.number().min(1, "El almacén es requerido"),
    serie_codigo: z
      .string()
      .refine(() => seriesDisponibles?.length !== 0, SERIES_SUCURSAL_EMPTY_MESSAGE)
      .refine((value) => value.length > 0, "La serie de recepción es requerida")
      .refine(
        (value) => !seriesDisponibles || value === "" || seriesDisponibles.includes(value),
        "La serie no está configurada en la sucursal de la orden",
      ),
    remision: z.string().optional().default(""),
    factura_referencia: z.string().optional().default(""),
    observaciones: z.string().optional().default(""),
    /** Cerrar la SM aunque regresen menos piezas de las enviadas (#1269). */
    cerrar_salida_maquila: z.boolean().optional(),
    // El submit solo envía los renglones con cantidad > 0 (`reduceDetalle`): sin
    // ninguno el POST saldría con `detalle: []`, que el backend rechaza (EC-894).
    // También cubre una orden sin renglones, cuyo registro queda vacío (EC-893).
    cantidades: conRenglones
      ? cantidadesSchema.superRefine((cantidades, ctx) => {
          if (!Object.values(cantidades).some(tieneCantidadRecibida)) {
            ctx.addIssue({ code: "custom", message: CANTIDADES_REQUIRED_MESSAGE });
          }
        })
      : cantidadesSchema,
  });

/** Flujo con renglones (OC, OP y SM de OP). */
export const ReceiptFormSchema = buildReceiptFormSchema({ conRenglones: true });

export type ReceiptFormValues = z.infer<typeof ReceiptFormSchema>;
