import { z } from "zod";
import { TIPO_CALENDARIO_VALUES } from "../constants/tipoCalendario";

/**
 * `turno` usa 0 como centinela de "Seleccionar..." y el schema lo rechaza: es
 * un FK OBLIGATORIO, a diferencia de `area` en puestos o `turno` en empleados.
 *
 * `tipo` es opcional, así que la cadena vacía es miembro legítimo del enum.
 */
export const CalendarFormSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  tipo: z.enum(TIPO_CALENDARIO_VALUES),
  turno: z.number().int("El turno es inválido").positive("El turno es requerido"),
});

export type CalendarFormValues = z.infer<typeof CalendarFormSchema>;
