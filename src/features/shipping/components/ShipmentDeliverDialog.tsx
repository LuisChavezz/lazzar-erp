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
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getMexicoTimeHHMM, getMexicoTodayDate } from "@/src/utils/mexicoTime";
import {
  deliverShipmentMutationKey,
  isDeliverDespachoRejection,
  parseDeliverShipmentError,
  useDeliverShipment,
} from "../hooks/useDeliverShipment";
import type { Shipment } from "../interfaces/shipping.interface";
import {
  DeliverShipmentFormSchema,
  SHIPMENT_RECIBIO_MAX,
  buildDeliverShipmentPayload,
  type DeliverShipmentFormField,
  type DeliverShipmentFormValues,
} from "../schemas/shipment-delivery.schema";

type ShipmentToDeliver = Pick<Shipment, "id" | "packing_folio" | "pedido_folio">;

interface ShipmentDeliverFormProps {
  /** El envío tal como estaba al ABRIR el diálogo (`useDialogSession`). */
  shipment: ShipmentToDeliver;
  onDelivered: (shipment: Shipment) => void;
  onClose: () => void;
  /** `404`: el envío ya no existe o salió del alcance del usuario. */
  onNotFound: () => void;
}

/** Valores iniciales: nadie en "Recibió" y el momento actual en México. */
const initialValues = (now: Date = new Date()): DeliverShipmentFormValues => ({
  recibio: "",
  fecha: getMexicoTodayDate(now),
  hora: getMexicoTimeHHMM(now.toISOString()),
});

const ShipmentDeliverForm = ({ shipment, onDelivered, onClose, onNotFound }: ShipmentDeliverFormProps) => {
  const deliver = useDeliverShipment(shipment.id);
  const isPending = deliver.isPending;
  // Doble envío: `isPending` llega un render tarde; `isIdle()` consulta la caché
  // de mutaciones al instante (como `CancelReasonForm`).
  const { isIdle } = useMutationLock(deliverShipmentMutationKey(shipment.id));
  // Fijos desde que se abre: el tope del día no cambia a media captura.
  const [defaults] = useState(initialValues);
  const [message, setMessage] = useState<string | null>(null);
  const { getError, setServerFieldError, setClientFieldError, clearFieldErrors, clearServerErrors } =
    useFormFieldErrors<DeliverShipmentFormField>();

  const form = useForm({
    defaultValues: defaults,
    onSubmit: ({ value }) => {
      if (!isIdle()) return;
      clearServerErrors();
      setMessage(null);

      const parsed = DeliverShipmentFormSchema.safeParse(value);
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          setClientFieldError(issue.path[0] as DeliverShipmentFormField, issue.message);
        });
        return;
      }
      // Sin editar el día ni la hora no viaja `fecha_entrega`: el backend usa la suya.
      const built = buildDeliverShipmentPayload(parsed.data, defaults);
      if ("field" in built) {
        setClientFieldError(built.field, built.message);
        return;
      }

      deliver.mutate(built.payload, {
        onSuccess: (result) => {
          onDelivered(result);
          onClose();
        },
        onError: (error) => {
          // 404: el envío ya no está; el hook lo avisa con un toast y se cierra
          // también el detalle (su copia ya no sirve). `despacho`: ya se entregó
          // o se canceló en otro lado; el hook lo avisa con el mensaje tal cual y
          // relee el listado, así que reintentar no tiene sentido.
          if (isNotFoundError(error)) {
            onClose();
            onNotFound();
            return;
          }
          if (isDeliverDespachoRejection(error)) {
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
  /** `404` al entregar: quien lo monta cierra también el detalle. */
  onNotFound: () => void;
}

/**
 * "Entregar" un envío (`POST /wms/despachos/{id}/entregar/`, nucleo-erp #1361,
 * EC-955): quién recibió (opcional, hasta 150 caracteres) y la fecha y la hora
 * de la entrega, con el momento actual de México ya puesto y sin permitir un
 * día posterior a hoy. Lo ofrece `ShippingDetailDialog` con `C-WMS-ENVIO` en un
 * envío activo sin entrega. Los errores del backend se muestran tal cual: los de
 * campo bajo su input; `400 {"despacho"}` (ya entregado o cancelado) y `404`
 * cierran con un toast; el resto (`403`, red) en el banner. Si el día y la hora
 * no se tocaron, `fecha_entrega` no viaja y el backend usa su propia hora.
 *
 * Mientras el `POST` está en vuelo el diálogo no se cierra, para que el
 * resultado se vea.
 */
export function ShipmentDeliverDialog({
  shipment,
  open,
  onOpenChange,
  onDelivered,
  onNotFound,
}: ShipmentDeliverDialogProps) {
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
        onNotFound={onNotFound}
      />
    </MainDialog>
  );
}
