import { z } from "zod";
import { countCodePoints } from "@/src/features/orders/schemas/pedido-programacion.schema";
import { isCalendarDateKey, isHHMM, toMexicoIsoDateTime } from "@/src/utils/mexicoTime";
import { HORA_INEXISTENTE_MESSAGE } from "@/src/utils/timeInput";
import type { DeliverShipmentPayload } from "../interfaces/shipping.interface";

/**
 * Tope de `recibio` en el backend (`CharField(max_length=150)`). El backend
 * recorta lo que sobre SIN avisar, así que el input lo limita antes.
 */
export const SHIPMENT_RECIBIO_MAX = 150;

export const FECHA_ENTREGA_FUTURA_MESSAGE = "La fecha de entrega no puede ser futura.";

/**
 * "Entregar" (nucleo-erp #1361): quién recibió (opcional) y el día y la hora de
 * la entrega en México, en dos inputs. `recibio` se recorta como el backend
 * (`str(recibio).strip()`); su tope se mide en code points, lo que cuenta
 * `len()` en Python.
 */
export const DeliverShipmentFormSchema = z.object({
  recibio: z
    .string()
    .trim()
    .refine(
      (value) => countCodePoints(value) <= SHIPMENT_RECIBIO_MAX,
      `Quién recibió admite a lo más ${SHIPMENT_RECIBIO_MAX} caracteres.`,
    ),
  fecha: z.string().refine(isCalendarDateKey, "Captura la fecha de entrega."),
  hora: z.string().refine(isHHMM, "Captura la hora de entrega (HH:MM)."),
});

export type DeliverShipmentFormValues = z.input<typeof DeliverShipmentFormSchema>;
export type DeliverShipmentFormField = keyof DeliverShipmentFormValues;

/**
 * `fecha_entrega` a enviar (datetime ISO con el offset de México), o el error
 * del campo: la hora no existe ese día (salto de horario de verano anterior a
 * 2022) o el momento es posterior a `now`, que el backend rechaza.
 */
export const toFechaEntrega = (
  fecha: string,
  hora: string,
  now: Date = new Date(),
): { iso: string } | { field: DeliverShipmentFormField; message: string } => {
  const iso = toMexicoIsoDateTime(fecha, hora);
  if (iso === null) return { field: "hora", message: HORA_INEXISTENTE_MESSAGE };
  if (Date.parse(iso) > now.getTime()) return { field: "hora", message: FECHA_ENTREGA_FUTURA_MESSAGE };
  return { iso };
};

/**
 * Cuerpo de `entregar/` con lo ya validado, o el error de un campo. Si el día y
 * la hora siguen como se pusieron al abrir (`defaults`), NO se manda
 * `fecha_entrega`: el backend usa su propia hora, así que un reloj del equipo
 * adelantado no puede hacer "futura" la entrega. Solo una fecha u hora editada
 * viaja, y esa sí se valida aquí contra el momento actual.
 */
export const buildDeliverShipmentPayload = (
  values: { recibio: string; fecha: string; hora: string },
  defaults: Pick<DeliverShipmentFormValues, "fecha" | "hora">,
  now: Date = new Date(),
): { payload: DeliverShipmentPayload } | { field: DeliverShipmentFormField; message: string } => {
  const payload: DeliverShipmentPayload = {};
  // Vacío = no se manda: el backend lo guarda como "".
  if (values.recibio.length > 0) payload.recibio = values.recibio;
  if (values.fecha === defaults.fecha && values.hora === defaults.hora) return { payload };
  const fechaEntrega = toFechaEntrega(values.fecha, values.hora, now);
  if ("field" in fechaEntrega) return fechaEntrega;
  payload.fecha_entrega = fechaEntrega.iso;
  return { payload };
};
