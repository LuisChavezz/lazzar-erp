import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateSupplierInvoice } from "../services/actions";
import { toastIdBloqueoRegistro } from "../schemas/supplier-invoice.schema";
import {
  parseSupplierInvoiceError,
  supplierInvoiceErrorToastMessage,
  type ParsedSupplierInvoiceError,
} from "../utils/parseSupplierInvoiceError";
import { invalidateSupplierInvoiceQueries } from "./invalidateSupplierInvoiceQueries";

const FALLBACK = "Error al actualizar la factura de proveedor";

/**
 * Mutación de actualización PARCIAL (`PATCH`) de una factura de proveedor.
 *
 * Genérica a propósito: recibe `{ id, payload }` con cualquier
 * `UpdateFacturaProveedorPayload`, así que sirve igual a la edición de cabecera
 * de un borrador que a una futura acción de fila "Registrar"
 * (`{ estatus: "Registrada" }`) sin cambiar el hook. `onServerError` es opcional
 * por lo mismo: una acción de fila no tiene formulario donde repartir el error y
 * se queda con el toast.
 *
 * No es optimista: registrar genera una CxP y el backend puede rechazarlo por
 * reglas de negocio reales; pintar la factura como registrada antes de saberlo
 * afirmaría un documento contable que no existe.
 */
export const useUpdateSupplierInvoice = (
  onServerError?: (parsed: ParsedSupplierInvoiceError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSupplierInvoice,
    // Devuelve la promesa del refetch: `mutateAsync` no resuelve hasta que el
    // listado ya muestra el estatus nuevo, así que el diálogo de confirmación de
    // una acción de fila se cierra sobre datos frescos.
    onSuccess: (factura, variables) => {
      const refetch = invalidateSupplierInvoiceQueries(queryClient, factura);
      const etiqueta = factura.folio || `#${factura.id}`;
      const pedido = variables.payload.estatus;
      // Cualquier escritura exitosa de esta factura —también "Guardar cambios" de
      // un borrador— deja viejo el aviso de "no se puede registrar" de un intento
      // anterior (p. ej. se capturó la fecha que faltaba). Se retira AQUÍ, junto
      // al toast de éxito, y no al terminar `mutateAsync`: eso espera el refetch
      // y los dos avisos contradictorios convivirían mientras tanto. Solo ese id;
      // el de éxito tiene el suyo.
      toast.dismiss(toastIdBloqueoRegistro(factura.id));
      toast.success(
        pedido === "Registrada" && factura.estatus === "Registrada"
          ? `Factura ${etiqueta} registrada: se generó su cuenta por pagar`
          : pedido === "Cancelada" && factura.estatus === "Cancelada"
            ? `Factura ${etiqueta} cancelada`
            : `Factura ${etiqueta} actualizada`,
      );
      return refetch;
    },
    // Un rechazo casi siempre significa que la fila del listado estaba VIEJA (p. ej.
    // otra persona canceló la factura y el backend responde 400 porque la
    // cancelación es definitiva). El toast da el motivo del backend y el refetch
    // pinta el estatus real, para que la acción no se quede ofrecida sobre un dato
    // falso. Se devuelve la promesa, igual que en el éxito: el diálogo de la acción
    // de fila se cierra sobre datos frescos.
    onError: (error) => {
      const parsed = parseSupplierInvoiceError(error, `${FALLBACK}.`);
      onServerError?.(parsed);
      toast.error(supplierInvoiceErrorToastMessage(parsed, FALLBACK));
      return queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
    },
  });
};
