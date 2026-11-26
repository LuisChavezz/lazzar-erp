"use client";

import { useState, type FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useIsMutating } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormErrorBanner } from "@/src/components/FormErrorBanner";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { openPicker } from "@/src/features/attendance/utils/dateInputs";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getMexicoTimeHHMM, getMexicoTodayDate } from "@/src/utils/mexicoTime";
import {
  deliverShipmentMutationKey,
  parseDeliverShipmentError,
  useDeliverShipment,
} from "../hooks/useDeliverShipment";
import type { DeliverShipmentPayload, Shipment } from "../interfaces/shipping.interface";
import {
  DeliverShipmentFormSchema,
  SHIPMENT_RECIBIO_MAX,
  toFechaEntrega,
  type DeliverShipmentFormField,
  type DeliverShipmentFormValues,
} from "../schemas/shipment-delivery.schema";

type ShipmentToDeliver = Pick<Shipment, "id" | "packing_folio" | "pedido_folio">;

interface ShipmentDeliverFormProps {
  /** El envío tal como estaba al ABRIR el diálogo (`useDialogSession`). */
  shipment: ShipmentToDeliver;
  onDelivered: (shipment: Shipment) => void;
  onClose: () => void;
}

/** Valores iniciales: nadie en "Recibió" y el momento actual en México. */
const initialValues = (now: Date = new Date()): DeliverShipmentFormValues => ({
  recibio: "",
  fecha: getMexicoTodayDate(now),
  hora: getMexicoTimeHHMM(now.toISOString()),
});

const ShipmentDeliverForm = ({ shipment, onDelivered, onClose }: ShipmentDeliverFormProps) => {
  const deliver = useDeliverShipment(shipment.id);
  const isPending = deliver.isPending;
  // Fijos desde que se abre: el tope del día no cambia a media captura.
  const [defaults] = useState(initialValues);
  const [message, setMessage] = useState<string | null>(null);
  const { getError, setServerFieldError, setClientFieldError, clearFieldErrors, clearServerErrors } =
    useFormFieldErrors<DeliverShipmentFormField>();

  const form = useForm({
    defaultValues: defaults,
    onSubmit: ({ value }) => {
      if (isPending) return;
      clearServerErrors();
      setMessage(null);

      const parsed = DeliverShipmentFormSchema.safeParse(value);
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          setClientFieldError(issue.path[0] as DeliverShipmentFormField, issue.message);
        });
        return;
      }
      const fechaEntrega = toFechaEntrega(parsed.data.fecha, parsed.data.hora);
      if ("field" in fechaEntrega) {
        setClientFieldError(fechaEntrega.field, fechaEntrega.message);
        return;
      }

      const payload: DeliverShipmentPayload = { fecha_entrega: fechaEntrega.iso };
      // Vacío = no se manda: el backend lo guarda como "".
      if (parsed.data.recibio.length > 0) payload.recibio = parsed.data.recibio;

      deliver.mutate(payload, {
        onSuccess: (result) => {
          onDelivered(result);
          onClose();
        },
        onError: (error) => {
          // 404: el envío ya no está; el hook lo avisa con un toast.
          if (isNotFoundError(error)) {
            onClose();
            return;
          }
          setMessage(parseDeliverShipmentError(error, setServerFieldError));
        },
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <div
        role="note"
        className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300"
      >
        La entrega <span className="font-semibold">es definitiva</span>: después no se puede corregir la
        fecha ni quién recibió, y el envío ya no se podrá cancelar (una mercancía entregada se regresa con
        una devolución).
      </div>

      <FormErrorBanner message={message} />

      <fieldset disabled={isPending} className="space-y-4">
        <form.Field name="recibio">
          {(field) => (
            <FormInput
              label="Recibió (opcional)"
              name={field.name}
              placeholder="Nombre de quien recibió la mercancía"
              maxLength={SHIPMENT_RECIBIO_MAX}
              autoComplete="off"
              value={field.state.value}
              error={getError("recibio")}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("recibio");
              }}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form.Field name="fecha">
            {(field) => (
              <FormInput
                label="Fecha de entrega"
                type="date"
                name={field.name}
                max={defaults.fecha}
                className="dark:scheme-dark cursor-pointer"
                onClick={openPicker}
                value={field.state.value}
                error={getError("fecha")}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldErrors("fecha");
                  // La hora futura depende del día elegido.
                  clearFieldErrors("hora");
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
          <form.Field name="hora">
            {(field) => (
              <FormInput
                label="Hora de entrega"
                type="time"
                name={field.name}
                className="dark:scheme-dark cursor-pointer"
                onClick={openPicker}
                value={field.state.value}
                error={getError("hora")}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldErrors("hora");
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
        </div>
        <p className="-mt-2 ml-1 text-[11px] text-slate-400">Hora de México. No puede ser posterior a este momento.</p>
      </fieldset>

      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Registrando…">
          Registrar entrega
        </FormSubmitButton>
      </div>
    </form>
  );
};

interface ShipmentDeliverDialogProps {
  shipment: ShipmentToDeliver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Con la respuesta del backend: el detalle la muestra sin esperar al listado. */
  onDelivered: (shipment: Shipment) => void;
}

/**
 * "Entregar" un envío (`POST /wms/despachos/{id}/entregar/`, nucleo-erp #1361,
 * EC-955): quién recibió (opcional, hasta 150 caracteres) y la fecha y la hora
 * de la entrega, con el momento actual de México ya puesto y sin permitir un
 * día posterior a hoy. Lo ofrece `ShippingDetailDialog` con `C-WMS-ENVIO` en un
 * envío activo sin entrega. Los errores del backend se muestran tal cual: los de
 * campo bajo su input y el resto (`despacho`, `403`) en el banner.
 *
 * Mientras el `POST` está en vuelo el diálogo no se cierra, para que el
 * resultado se vea.
 */
export function ShipmentDeliverDialog({ shipment, open, onOpenChange, onDelivered }: ShipmentDeliverDialogProps) {
  const session = useDialogSession(open, shipment);
  const delivering = useIsMutating({ mutationKey: deliverShipmentMutationKey(session.snapshot.id) }) > 0;
  const folio = session.snapshot.packing_folio || `#${session.snapshot.id}`;

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && delivering) return;
        onOpenChange(next);
      }}
      maxWidth="520px"
      showCloseButton={false}
      title="Registrar entrega"
      description={
        session.snapshot.pedido_folio
          ? `Envío del embarque ${folio} · pedido ${session.snapshot.pedido_folio}`
          : `Envío del embarque ${folio}`
      }
    >
      <ShipmentDeliverForm
        key={session.id}
        shipment={session.snapshot}
        onDelivered={onDelivered}
        onClose={() => onOpenChange(false)}
      />
    </MainDialog>
  );
}
