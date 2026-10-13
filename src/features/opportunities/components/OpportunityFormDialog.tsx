"use client";

import { useState, type ReactNode } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import type { Opportunity } from "../interfaces/opportunity.interface";
import OpportunityForm from "./OpportunityForm";

interface OpportunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = alta; una oportunidad = edición. Se lee AL ABRIR (ver abajo). */
  opportunityToEdit: Opportunity | null;
  /** Botón que abre el diálogo (el "+ Nueva" del listado). */
  trigger?: ReactNode;
}

/**
 * Diálogo de alta/edición de oportunidad, el mismo en el listado y en el
 * detalle.
 *
 * Cada APERTURA abre una sesión nueva:
 * - monta un formulario NUEVO (`key`): no depende de que el diálogo anterior
 *   haya terminado de desmontarse (su animación de salida), así que "Nueva"
 *   nunca hereda lo capturado en la apertura previa;
 * - guarda una COPIA del registro tal como estaba al abrir. El formulario
 *   calcula contra ella qué campos cambiaron, así que no debe moverse si el
 *   registro se relee a media edición (el detalle) o si su fila sale de la
 *   página (el listado, que solo tiene una página en memoria).
 */
export function OpportunityFormDialog({
  open,
  onOpenChange,
  opportunityToEdit,
  trigger,
}: OpportunityFormDialogProps) {
  const [session, setSession] = useState({ id: 0, record: opportunityToEdit });
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((current) => ({ id: current.id + 1, record: opportunityToEdit }));
  }

  const isEditing = session.record !== null;

  return (
    <MainDialog
      title={
        <DialogHeader
          title={isEditing ? "Editar Oportunidad" : "Nueva Oportunidad"}
          subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="1000px"
      trigger={trigger}
    >
      <OpportunityForm
        key={session.id}
        onSuccess={() => onOpenChange(false)}
        opportunityToEdit={session.record}
      />
    </MainDialog>
  );
}
