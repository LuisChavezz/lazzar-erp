import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { createResurtido } from "../services/actions";
import type { CreateResurtidoBody } from "../interfaces/pre-order.interface";

/**
 * Alta de una pre-orden de resurtido. POST no idempotente: la `mutationKey`
 * fija es el candado contra el doble envío. Los `avisos` (p. ej. ya hay un
 * resurtido abierto del mismo producto y sucursal) no bloquean: se muestran.
 */
export const useCreateResurtido = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["pre-order-crear-resurtido"],
    mutationFn: (body: CreateResurtidoBody) => createResurtido(body),
    onSuccess: (res) => {
      toast.success("Pre-orden generada. Producción ya la puede revisar.");
      res.avisos?.forEach((aviso) => toast(aviso, { icon: "⚠️", duration: 6000 }));
      return queryClient.invalidateQueries({ queryKey: ["pre-orders"] });
    },
    onError: (error) =>
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "No se pudo generar la pre-orden."),
      ),
  });
};
