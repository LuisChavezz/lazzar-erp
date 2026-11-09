"use client";

import { useState, type FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useMaquileros } from "@/src/features/suppliers/hooks/useMaquileros";
import type { CrearOpBody } from "../interfaces/pre-order.interface";

/** 1 = Alta, 2 = Media, 3 = Baja (mismo mapeo que el asistente de OP). */
const PRIORIDAD_OPTIONS = [
  { value: 1, label: "Alta" },
  { value: 2, label: "Media" },
  { value: 3, label: "Baja" },
] as const;

/**
 * "Crear OP" desde una pre-orden lista: los SKU y cantidades ya vienen de la
 * pre-orden, así que solo se piden prioridad y centro de confección.
 */
export function PreOrderCreateOpDialog({
  open,
  onOpenChange,
  folio,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folio: string;
  isPending: boolean;
  onSubmit: (body: CrearOpBody) => void;
}) {
  const [prioridad, setPrioridad] = useState(2);
  const [centro, setCentro] = useState("");
  const { maquileros, isLoading } = useMaquileros();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      prioridad,
      ...(centro ? { centro_confeccion: Number(centro) } : {}),
    });
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}
      title="Crear orden de producción"
      description={`Se crea con las prendas y cantidades de la pre-orden del pedido ${folio}.`}
      maxWidth="480px"
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label="Prioridad"
          name="prioridad"
          value={prioridad}
          disabled={isPending}
          onChange={(event) => setPrioridad(Number(event.target.value))}
        >
          {PRIORIDAD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Centro de confección (opcional)"
          name="centro_confeccion"
          value={centro}
          disabled={isPending || isLoading}
          onChange={(event) => setCentro(event.target.value)}
        >
          <option value="">Interno / sin asignar</option>
          {maquileros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </FormSelect>
        <div className="flex justify-end gap-3 pt-2">
          <FormCancelButton label="Cancelar" onClick={() => onOpenChange(false)} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Creando…">
            Crear OP
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
