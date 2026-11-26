"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSecondaryButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ClipboardListIcon } from "@/src/components/Icons";
import { ReceiptOrderSelectorView } from "@/src/features/receipts/components/ReceiptOrderSelector";
import { candidateKey } from "@/src/features/receipts/utils/receiptCandidates";
import type {
  ReceiptOnboardingData,
  ReceiptOrderCandidate,
  ReceiptOrderType,
} from "@/src/features/receipts/interfaces/receipt-onboarding.interface";
import { useRfidReconciliationOnboarding } from "../hooks/useRfidReconciliationOnboarding";
import {
  useRfidReconciliationForm,
  type RfidReconciliationCandidate,
} from "../hooks/useRfidReconciliationForm";
import type { RfidReconciliation } from "../interfaces/rfid-reconciliation.interface";
import { RFID_RECONCILIATION_REFERENCE_MAX } from "../schemas/rfidReconciliation.schema";

const STEPS = ["select-order", "details"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABELS: Record<Step, string> = {
  "select-order": "Seleccionar orden",
  details: "Datos del encuadre",
};

interface RfidReconciliationCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Con el encuadre recién creado (PENDIENTE): la lista abre su detalle para leer etiquetas. */
  onCreated: (created: RfidReconciliation) => void;
}

const isReconciliationCandidate = (
  candidate: ReceiptOrderCandidate | null,
): candidate is RfidReconciliationCandidate =>
  candidate !== null && (candidate.type === "compra" || candidate.type === "produccion");

const subtitleOf = (candidate: RfidReconciliationCandidate | null) => {
  if (!candidate) return "Elige la orden que vas a contar";
  return candidate.type === "compra"
    ? `Orden de compra ${candidate.order.folio ?? `#${candidate.order.id}`}`
    : `Orden de producción ${candidate.order.folio}`;
};

/**
 * "Nuevo encuadre" (EC-961) en dos pasos, como Nueva Recepción:
 * 1. La OC u OP, con la misma lista que la recepción (`ReceiptOrderSelectorView`)
 *    alimentada por `recepcion-rfid-encuadres/onboarding/`, sin salidas a
 *    maquila: el encuadre solo se levanta sobre una OC u OP.
 * 2. Almacén, serie y referencias. La lectura con la antena se hace ya en el detalle.
 *
 * El contenido se monta solo con el diálogo abierto: cada apertura empieza
 * sin selección y el onboarding se pide solo entonces.
 */
export function RfidReconciliationCreateDialog({ open, onClose, onCreated }: RfidReconciliationCreateDialogProps) {
  const [candidate, setCandidate] = useState<RfidReconciliationCandidate | null>(null);
  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          setCandidate(null);
        }
      }}
      maxWidth="640px"
      showCloseButton={true}
      title={
        <DialogHeader
          title="Nuevo encuadre RFID"
          subtitle={subtitleOf(candidate)}
          statusColor="sky"
          icon={ClipboardListIcon}
        />
      }
    >
      {open && (
        <CreateSteps
          candidate={candidate}
          onCandidateChange={setCandidate}
          onCreated={(created) => {
            onClose();
            setCandidate(null);
            onCreated(created);
          }}
        />
      )}
    </MainDialog>
  );
}

function CreateSteps({
  candidate,
  onCandidateChange,
  onCreated,
}: {
  candidate: RfidReconciliationCandidate | null;
  onCandidateChange: (candidate: RfidReconciliationCandidate | null) => void;
  onCreated: (created: RfidReconciliation) => void;
}) {
  const source = useRfidReconciliationOnboarding(true);
  const [step, setStep] = useState<Step>("select-order");
  const [orderType, setOrderType] = useState<ReceiptOrderType>("compra");

  return (
    <div className="w-full space-y-6">
      <StepProgressBar steps={STEPS} currentStep={step} labels={STEP_LABELS} />

      {step === "select-order" && (
        <>
          <ReceiptOrderSelectorView
            source={source}
            includeSalidasMaquila={false}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            selectedKey={candidate ? candidateKey(candidate) : null}
            onSelect={(next) => onCandidateChange(isReconciliationCandidate(next) ? next : null)}
          />
          <div className="flex items-center justify-end border-t border-slate-200 dark:border-white/10 pt-4">
            <button
              type="button"
              disabled={!candidate}
              aria-disabled={!candidate}
              onClick={() => setStep("details")}
              className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all ${
                candidate ? "cursor-pointer hover:bg-sky-700 active:scale-[0.97]" : "cursor-not-allowed opacity-60"
              }`}
            >
              Siguiente: {STEP_LABELS.details}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {step === "details" && candidate && (
        <DetailsForm
          key={candidateKey(candidate)}
          candidate={candidate}
          onboardingData={source.onboardingData}
          onBack={() => setStep("select-order")}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function DetailsForm({
  candidate,
  onboardingData,
  onBack,
  onCreated,
}: {
  candidate: RfidReconciliationCandidate;
  onboardingData: ReceiptOnboardingData | undefined;
  onBack: () => void;
  onCreated: (created: RfidReconciliation) => void;
}) {
  const { form, warehouses, series, getError, clearFieldErrors, isPending } = useRfidReconciliationForm({
    candidate,
    onboardingData,
    onCreated,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <form.Field name="almacen">
          {(field) => (
            <FormSelect
              label="Almacén"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                const next = Number(event.target.value);
                field.handleChange(Number.isNaN(next) ? 0 : next);
                clearFieldErrors("almacen");
              }}
              onBlur={field.handleBlur}
              error={getError("almacen")}
            >
              <option value="0" disabled>
                {warehouses.length === 0 ? "No hay almacenes activos en la sucursal de la orden" : "Seleccionar..."}
              </option>
              {warehouses.map((w) => (
                <option key={w.id_almacen} value={w.id_almacen} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {w.nombre}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>

        <form.Field name="serie_codigo">
          {(field) => (
            <FormSelect
              label="Serie de la recepción"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("serie_codigo");
              }}
              onBlur={field.handleBlur}
              error={getError("serie_codigo")}
            >
              <option value="" disabled>
                {series.length === 0 ? "La sucursal no tiene series de recepción" : "Seleccionar..."}
              </option>
              {series.map((serie) => (
                <option key={serie} value={serie} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {serie}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>

        <form.Field name="remision">
          {(field) => (
            <FormInput
              label="Remisión"
              placeholder="Número de remisión (opcional)"
              forceUppercase
              maxLength={RFID_RECONCILIATION_REFERENCE_MAX}
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("remision");
              }}
              onBlur={field.handleBlur}
              error={getError("remision")}
            />
          )}
        </form.Field>

        <form.Field name="factura_referencia">
          {(field) => (
            <FormInput
              label="Factura de referencia"
              placeholder="Folio de la factura (opcional)"
              forceUppercase
              maxLength={RFID_RECONCILIATION_REFERENCE_MAX}
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("factura_referencia");
              }}
              onBlur={field.handleBlur}
              error={getError("factura_referencia")}
            />
          )}
        </form.Field>
      </div>

      <form.Field name="observaciones">
        {(field) => (
          <FormTextarea
            label="Observaciones"
            placeholder="Notas del conteo (opcional)"
            rows={3}
            name={field.name}
            value={field.state.value}
            onChange={(event) => {
              field.handleChange(event.target.value);
              clearFieldErrors("observaciones");
            }}
            onBlur={field.handleBlur}
            error={getError("observaciones")}
          />
        )}
      </form.Field>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        El encuadre no mueve inventario: al crearlo podrás leer las etiquetas con la antena RFID y comparar lo leído contra lo
        que falta recibir de la orden.
      </p>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Creando…">
          Crear encuadre
        </FormSubmitButton>
      </div>
    </form>
  );
}
