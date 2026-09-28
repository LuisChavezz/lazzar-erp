"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useRejectVacation } from "../hooks/useRejectVacation";
import { VacationRejectSchema } from "../schemas/vacation.schema";
import { formatVacationRange, type VacationRow } from "./VacationColumns";

interface VacationRejectDialogProps {
  vacation: VacationRow;
  onClose: () => void;
}

/**
 * Diálogo de RECHAZO (`POST /hr/vacaciones/{id}/rechazar/`) con motivo
 * obligatorio (D5).
 *
 * Se monta en `VacationList`, NO en la celda: al rechazar, el refetch cambia
 * `estado` y puede sacar la fila de una vista filtrada, y la celda —con su
 * diálogo— se desmontaría a media operación. El padre lo monta con `key` por
 * solicitud, así que el borrador no se arrastra a otra.
 *
 * Mismo esqueleto que `PurchaseOrderCancelDialog`: input controlado +
 * `safeParse` al enviar y guarda síncrona contra el doble envío. Pensado para
 * que `permisos-ausencias`, con el mismo flujo, lo tome como molde.
 */
export function VacationRejectDialog({ vacation, onClose }: VacationRejectDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  // El error de `motivo_rechazo` se pinta bajo el textarea; el resto de
  // errores los notifica el hook con toast.
  const { mutate, isPending } = useRejectVacation({ onReasonError: setMotivoError });

  // `isPending` no basta contra dos clics en el mismo tick: la ref cambia al
  // instante y se libera cuando la mutación termina.
  const submittingRef = useRef(false);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && !isPending) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const parsed = VacationRejectSchema.safeParse({ motivo_rechazo: motivo });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }

    submittingRef.current = true;
    mutate(
      { id: vacation.id, motivo_rechazo: parsed.data.motivo_rechazo },
      {
        onSettled: () => {
          submittingRef.current = false;
        },
        onSuccess: onClose,
        // 400 (ya no está pendiente) o 404 (ya no existe): reintentar no sirve.
        // Se cierra; el toast explica y el refetch muestra su estado real. Red,
        // 5xx o 403 dejan el diálogo abierto con el motivo escrito.
        onError: (error) => {
          const status = error instanceof AxiosError ? error.response?.status : undefined;
          if (status === 400 || status === 404) onClose();
        },
      }
    );
  };

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Rechazar Solicitud de Vacaciones"
      description={`Se rechazará la solicitud de ${vacation.empleado_nombre} (${formatVacationRange(
        vacation
      )}). Una solicitud rechazada ya no puede editarse, aprobarse ni eliminarse.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <FormTextarea
          label="Motivo de rechazo"
          name="motivo_rechazo"
          rows={3}
          placeholder="Explica por qué se rechaza la solicitud"
          value={motivo}
          disabled={isPending}
          error={motivoError ? { message: motivoError } : undefined}
          onChange={(event) => {
            setMotivo(event.target.value);
            if (motivoError) setMotivoError(null);
          }}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Rechazando…"
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            Rechazar solicitud
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
