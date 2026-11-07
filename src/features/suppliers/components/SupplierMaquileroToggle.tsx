"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FormToggle } from "@/src/components/FormToggle";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { setSupplierMaquilero } from "../services/actions";

/**
 * Marca o desmarca al proveedor como maquilero (centro de confección). Solo
 * los maquileros salen en "Centro de confección" al crear una orden de
 * producción. PATCH directo: no pasa por el formulario completo del proveedor.
 */
export function SupplierMaquileroToggle({
  supplierId,
  value,
  canEdit,
}: {
  supplierId: number;
  value: boolean;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (next: boolean) => setSupplierMaquilero(supplierId, next),
    onSuccess: (_data, next) => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      void queryClient.invalidateQueries({ queryKey: ["maquileros"] });
      toast.success(next ? "Proveedor marcado como maquilero" : "Proveedor ya no es maquilero");
    },
    onError: (error) =>
      toast.error(extractErrorMessage(error, "No se pudo actualizar el proveedor")),
  });

  return (
    <FormToggle
      name="es_maquilero"
      label="Maquilero (centro de confección)"
      description="Puede recibir órdenes de producción para confeccionar fuera de la empresa."
      checked={mutation.isPending ? Boolean(mutation.variables) : value}
      disabled={!canEdit || mutation.isPending}
      onChange={(event) => mutation.mutate(event.target.checked)}
    />
  );
}
