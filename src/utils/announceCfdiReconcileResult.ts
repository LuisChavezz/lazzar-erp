import toast from "react-hot-toast";
import { toastWarning } from "./toastWarning";

/**
 * Aviso al usuario tras `conciliar-cfdi/` (EC-709), común a facturas y notas de
 * crédito; solo cambia el sustantivo del documento.
 *
 * Con `aviso` (EC-761) el CFDI quedó vigente ante el SAT aunque el documento
 * esté cancelado o eliminado: se muestra ESE texto del backend tal cual, como
 * advertencia, y nunca el éxito. No se distinguen casos por su texto. Sin
 * `aviso`: `timbrado` (el CFDI existía; con su UUID si ya lo trae) o `liberado`
 * (no existía y se liberó la reserva).
 */
export const announceCfdiReconcileResult = ({
  resultado,
  aviso,
  noun,
  label,
  cfdiUuid,
}: {
  resultado: "timbrado" | "liberado";
  aviso: string | null;
  noun: "factura" | "nota";
  /** Folio del documento, o `#id` sin folio. */
  label: string;
  cfdiUuid: string | null | undefined;
}) => {
  if (aviso) {
    toastWarning(aviso);
    return;
  }
  if (resultado === "timbrado") {
    toast.success(
      cfdiUuid
        ? `El CFDI de la ${noun} ${label} sí existía en Facturama: la ${noun} ya está timbrada. UUID ${cfdiUuid}`
        : `El CFDI de la ${noun} ${label} sí existía en Facturama: la ${noun} ya está timbrada.`,
    );
    return;
  }
  toast.success(
    `Facturama no tenía ningún CFDI de la ${noun} ${label}: se liberó el timbrado pendiente.`,
  );
};
