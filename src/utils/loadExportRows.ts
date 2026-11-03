import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

/**
 * Filas de una exportación que se piden al backend (una tabla en modo
 * servidor: `useServerTable().fetchAllRows`), con un toast de progreso
 * mientras llegan. Devuelve `null` si fallaron —el toast pasa a error con el
 * mensaje del backend— para que el llamador no genere un archivo vacío.
 *
 * `toastId` es único por exportación: un segundo clic reutiliza el mismo toast
 * en vez de apilar otro.
 */
export const loadExportRows = async <T>(
  getRows: () => Promise<T[]>,
  toastId: string,
): Promise<T[] | null> => {
  toast.loading("Preparando la exportación…", { id: toastId });
  try {
    const rows = await getRows();
    toast.dismiss(toastId);
    return rows;
  } catch (error) {
    toast.error(extractErrorMessage(error, "No se pudo exportar. Intenta de nuevo."), {
      id: toastId,
    });
    return null;
  }
};
