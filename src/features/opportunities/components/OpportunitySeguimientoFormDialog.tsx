"use client";

import { useState } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { MainDialog } from "@/src/components/MainDialog";
import { isOportunidadCerrada } from "../constants/opportunityChoices";
import { TIPO_SEGUIMIENTO_OPTIONS, type TipoSeguimiento } from "../constants/seguimientoChoices";
import { useSeguimientoForm } from "../hooks/useSeguimientoForm";
import type { Opportunity } from "../interfaces/opportunity.interface";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";

const HINT_CLS = "mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400";

interface SeguimientoFormProps {
  opportunity: Opportunity;
  seguimientoToEdit: OpportunitySeguimiento | null;
  onSuccess: () => void;
}

/** Alta y edición de un seguimiento (mismo formulario). El autor no se captura. */
function SeguimientoForm({ opportunity, seguimientoToEdit, onSuccess }: SeguimientoFormProps) {
  const isOpportunityClosed = isOportunidadCerrada(opportunity.estado);
  const {
    form,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useSeguimientoForm({
    opportunityId: opportunity.id,
    isOpportunityClosed,
    seguimientoToEdit,
    onSuccess,
  });

  return (
    <form onSubmit={handleFormSubmit} className="w-full" noValidate>
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
          <div className="group/field">
            <form.Field name="tipo">
              {(field) => (
                <FormSelect
                  label="Tipo"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value as TipoSeguimiento);
                    clearFieldErrors("tipo");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("tipo")}
                >
                  {TIPO_SEGUIMIENTO_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
          </div>

          {/* Con la oportunidad cerrada no se captura: en una edición se ve la
              fecha guardada, que el backend conserva (el campo no se envía). */}
          <div className="group/field">
            <form.Field name="fecha_recordatorio">
              {(field) => (
                <FormInput
                  label="Recordatorio (opcional)"
                  type="date"
                  className="dark:scheme-dark"
                  name={field.name}
                  value={field.state.value}
                  disabled={isOpportunityClosed}
                  aria-describedby="seguimiento-recordatorio-hint"
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_recordatorio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_recordatorio", field.state.value);
                  }}
                  error={getError("fecha_recordatorio")}
                />
              )}
            </form.Field>
            <p id="seguimiento-recordatorio-hint" className={HINT_CLS}>
              {isOpportunityClosed
                ? `La oportunidad está ${opportunity.estado.toLowerCase()}: sus seguimientos ya no generan recordatorios.`
                : "Fecha en que hay que atenderlo. Puede ser una fecha pasada."}
            </p>
          </div>

          {/* Texto libre: se guarda como se escribe, sin pasar a mayúsculas. */}
          <div className="group/field md:col-span-2">
            <form.Field name="detalle">
              {(field) => (
                <FormTextarea
                  label="Detalle"
                  rows={4}
                  placeholder="Qué pasó o qué hay que hacer"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("detalle");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("detalle", field.state.value);
                  }}
                  error={getError("detalle")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-4 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Seguimiento" : "Registrar Seguimiento"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}

interface OpportunitySeguimientoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Oportunidad del seguimiento; `null` mientras el detalle no ha cargado. Se lee AL ABRIR. */
  opportunity: Opportunity | null;
  /** `null` = alta; un seguimiento = edición. Se lee AL ABRIR. */
  seguimientoToEdit: OpportunitySeguimiento | null;
}

/**
 * Diálogo de alta/edición de un seguimiento. Mismo criterio que
 * `OpportunityFormDialog`: cada APERTURA monta un formulario nuevo (`key`) con
 * una COPIA de la oportunidad y del seguimiento tal como estaban al abrir, para
 * que una relectura del detalle a media captura no le cambie la base con la que
 * calcula qué campos cambiaron.
 */
export function OpportunitySeguimientoFormDialog({
  open,
  onOpenChange,
  opportunity,
  seguimientoToEdit,
}: OpportunitySeguimientoFormDialogProps) {
  const [session, setSession] = useState({ id: 0, opportunity, record: seguimientoToEdit });
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSession((current) => ({ id: current.id + 1, opportunity, record: seguimientoToEdit }));
    }
  }

  const isEditing = session.record !== null;

  return (
    <MainDialog
      title={
        <DialogHeader
          title={isEditing ? "Editar Seguimiento" : "Nuevo Seguimiento"}
          subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
    >
      {session.opportunity && (
        <SeguimientoForm
          key={session.id}
          opportunity={session.opportunity}
          seguimientoToEdit={session.record}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
