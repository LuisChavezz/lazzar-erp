"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ExclamationTriangleIcon } from "@/src/components/Icons";
import { getMexicoTodayDate } from "@/src/utils/mexicoTime";
import { moneyToCents } from "@/src/utils/moneyCents";
import type { Payroll } from "../interfaces/payroll.interface";
import { createPayPayrollSchema } from "../schemas/payroll.schema";
import { usePayPayroll } from "../hooks/usePayPayroll";
import { verifyPayrollPendiente } from "../hooks/verifyPayrollPendiente";
import { PAYROLL_KEY_ROOT } from "../hooks/usePayrolls";
import { formatMoneyOrDash, type PayrollRow } from "./PayrollColumns";

/**
 * Por qué una nómina no puede marcarse como pagada, o `null` si puede: sin
 * renglones, o con un neto de cero o negativo, no hay nada que pagar.
 */
export const getPayBlockReason = (payroll: Pick<Payroll, "detalles" | "neto">): string | null => {
  if (payroll.detalles.length === 0) {
    return "La nómina no tiene renglones: agrega al menos una percepción antes de marcarla como pagada.";
  }
  const neto = moneyToCents(payroll.neto);
  if (neto === null || neto <= 0) {
    return `El neto de la nómina es ${formatMoneyOrDash(payroll.neto)}: solo se puede marcar como pagada con un neto mayor a cero.`;
  }
  return null;
};

interface PayPayrollDialogProps {
  payroll: PayrollRow;
  onClose: () => void;
}

/**
 * "Marcar como pagada": `fecha_pago` obligatoria (hoy en México por defecto,
 * nunca posterior) y `PATCH {estado, fecha_pago}` tras la guarda de red.
 *
 * Se monta en `PayrollList`, NO en la celda: al pagar, el refetch cambia
 * `estado` y la celda se desmontaría a media operación. El padre lo monta con
 * `key` por nómina. Mismo esqueleto que `VacationRejectDialog`.
 */
export function PayPayrollDialog({ payroll, onClose }: PayPayrollDialogProps) {
  const queryClient = useQueryClient();
  const [fechaPago, setFechaPago] = useState(() => getMexicoTodayDate());
  const [fechaError, setFechaError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const submittingRef = useRef(false);

  const { mutateAsync, isPending: isPaying } = usePayPayroll({ onFechaPagoError: setFechaError });
  const isBusy = isChecking || isPaying;

  const blockReason = getPayBlockReason(payroll);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && !isBusy) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || blockReason) return;

    // `today` se resuelve AHORA: un diálogo abierto antes de medianoche no
    // debe aceptar el día siguiente ni rechazar el de hoy.
    const parsed = createPayPayrollSchema(getMexicoTodayDate()).safeParse({
      fecha_pago: fechaPago,
    });
    if (!parsed.success) {
      setFechaError(parsed.error.issues[0]?.message ?? "Fecha inválida");
      return;
    }

    submittingRef.current = true;
    setIsChecking(true);
    try {
      const check = await verifyPayrollPendiente(queryClient, payroll.id);
      if (check.status === "stale") {
        onClose();
        return;
      }
      if (check.status === "error") return;

      // La lectura fresca manda: otra persona pudo cambiar los renglones. Si
      // el neto ya no es el que se muestra, NO se paga una cifra que el
      // usuario no vio: se avisa, se refresca la fila y se cierra para que
      // vuelva a abrir el diálogo con el neto vigente.
      const shownNeto = moneyToCents(payroll.neto);
      const freshNeto = moneyToCents(check.payroll.neto);
      if (freshNeto !== shownNeto) {
        toast.error(
          `El neto de la nómina cambió mientras el diálogo estaba abierto (antes ${formatMoneyOrDash(
            payroll.neto
          )}, ahora ${formatMoneyOrDash(
            check.payroll.neto
          )}). No se marcó como pagada: se actualizó el listado; revisa la nómina y vuelve a intentarlo.`,
          { duration: 8000 }
        );
        void queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT });
        onClose();
        return;
      }
      const freshBlock = getPayBlockReason(check.payroll);
      if (freshBlock) {
        toast.error(freshBlock);
        void queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT });
        return;
      }
      setIsChecking(false);

      await mutateAsync({ id: payroll.id, fecha_pago: parsed.data.fecha_pago });
      onClose();
    } catch (error) {
      // El toast lo dio la mutación. 404 (ya no existe): reintentar no sirve.
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      if (status === 404) onClose();
    } finally {
      submittingRef.current = false;
      setIsChecking(false);
    }
  };

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Marcar Nómina como Pagada"
      description={`Nómina de ${payroll.empleado_nombre} (${payroll.periodo_label}), neto ${formatMoneyOrDash(
        payroll.neto
      )}. Una nómina pagada ya no puede editarse ni cancelarse.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1" noValidate>
        {blockReason ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{blockReason}</p>
          </div>
        ) : (
          // Sin `max` nativo a propósito: el navegador bloquearía el envío con
          // su propio globo antes de que se vea el mensaje del esquema (mismo
          // criterio que `IncidentForm`).
          <FormInput
            label="Fecha de pago"
            type="date"
            className="dark:scheme-dark"
            name="fecha_pago"
            value={fechaPago}
            disabled={isBusy}
            error={fechaError ? { message: fechaError } : undefined}
            onChange={(event) => {
              setFechaPago(event.target.value);
              if (fechaError) setFechaError(null);
            }}
          />
        )}
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isBusy} />
          <FormSubmitButton
            isPending={isBusy}
            loadingLabel={isChecking ? "Verificando…" : "Guardando…"}
            disabled={Boolean(blockReason)}
            className="bg-emerald-600! hover:bg-emerald-700! focus:ring-emerald-500!"
          >
            Marcar como pagada
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
