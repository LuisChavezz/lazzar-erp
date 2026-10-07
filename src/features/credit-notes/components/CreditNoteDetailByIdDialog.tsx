"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useNotaCreditoDetail } from "../hooks/useNotaCreditoDetail";
import { CreditNoteDetailBody, CreditNoteDialogTitle } from "./CreditNoteDetailDialog";

interface CreditNoteDetailByIdDialogProps {
  /** Id de la nota. `null` mantiene la consulta apagada. */
  notaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de nota de crédito por id, para quien solo tiene el id (la página de
 * detalle de factura). UN solo `MainDialog` para carga, error y contenido: el
 * cuerpo es el mismo `CreditNoteDetailBody` del diálogo del listado, así que al
 * terminar de cargar solo cambia el contenido, sin desmontar el diálogo (no se
 * repite la animación de entrada ni parpadea el overlay).
 */
export function CreditNoteDetailByIdDialog({
  notaId,
  open,
  onOpenChange,
}: CreditNoteDetailByIdDialogProps) {
  const { data: nota, isLoading, isError, error } = useNotaCreditoDetail(notaId);
  const notFoundMessage = "No existe, no tienes acceso a ella o falló la conexión.";

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <CreditNoteDialogTitle
          label={nota ? nota.folio || `#${nota.id}` : notaId !== null ? `#${notaId}` : ""}
        />
      }
    >
      {nota ? (
        <CreditNoteDetailBody nota={nota} />
      ) : isLoading ? (
        <Loader title="Cargando la nota de crédito..." className="py-16" />
      ) : (
        <ErrorState
          title="No se pudo cargar la nota de crédito"
          message={isError ? extractErrorMessage(error, notFoundMessage) : notFoundMessage}
        />
      )}
    </MainDialog>
  );
}
