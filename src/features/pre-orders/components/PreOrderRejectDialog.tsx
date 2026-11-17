"use client";

import { useState, type FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";

/** Producción rechaza un resurtido; el motivo es obligatorio y planeación lo ve. */
export function PreOrderRejectDialog({
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
  onSubmit: (motivo: string) => void;
}) {
  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}
      title="Rechazar resurtido"
      description={`Planeación verá el motivo del rechazo de ${folio}.`}
      maxWidth="480px"
      showCloseButton={false}
    >
      {open && <RejectForm isPending={isPending} onCancel={() => onOpenChange(false)} onSubmit={onSubmit} />}
    </MainDialog>
  );
}

function RejectForm({
  isPending,
  onCancel,
  onSubmit,
}: {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (motivo.trim()) onSubmit(motivo.trim());
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormTextarea
        label="Motivo"
        name="motivo"
        rows={3}
        required
        value={motivo}
        disabled={isPending}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        <FormCancelButton label="Volver" onClick={onCancel} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Rechazando…" disabled={!motivo.trim()}>
          Rechazar
        </FormSubmitButton>
      </div>
    </form>
  );
}
