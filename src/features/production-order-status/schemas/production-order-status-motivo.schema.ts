import { z } from "zod";

/**
 * Motivo para Detener o Cancelar una OP. Misma regla que el backend:
 * obligatorio y no solo espacios. Sin mayúsculas forzadas ni longitud máxima,
 * igual que los rechazos de cotización y de ausencias (el backend lo guarda en
 * la auditoría tal cual).
 */
export const productionOrderStatusMotivoSchema = z.object({
  motivo: z.string().trim().min(1, "Indica el motivo"),
});
