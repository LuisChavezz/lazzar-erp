"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";

/**
 * Toast del aviso de un diálogo de fila que se cerró por un cambio externo
 * (`getStaleRowDialogNotice`). Devuelve el setter: el listado lo llama en el
 * mismo ajuste en RENDER que cierra el diálogo, y el toast sale desde un
 * EFECTO —dispararlo en pleno render actualizaría otro componente (el
 * Toaster)—. El `id` del toast es la `key` del aviso, estable: un doble render
 * no lo duplica. Duración por defecto de `toast.error`, la de los listados de RH.
 */
export function useStaleNoticeToast() {
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);
  return setStaleNotice;
}
