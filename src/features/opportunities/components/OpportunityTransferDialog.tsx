"use client";

import { AxiosError } from "axios";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { DialogHeader } from "@/src/components/DialogHeader";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { MainDialog } from "@/src/components/MainDialog";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import {
  OPPORTUNITY_GONE_MESSAGE,
  opportunityActionErrorMessage,
} from "../hooks/opportunityErrorMessages";
import {
  useTransferOpportunity,
  type TransferOpportunityVariables,
} from "../hooks/useTransferOpportunity";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { getOpportunityName } from "../utils/describeOpportunity";

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

interface TransferOption {
  id: number;
  label: string;
  email: string;
}

/** Error de `transferir` que pertenece al selector (`{"vendedor": …}`), o `undefined`. */
const vendedorRejection = (error: unknown): string | undefined =>
  error instanceof AxiosError && error.response?.status === 400
    ? firstRejectionMessage(error.response.data, ["vendedor"])
    : undefined;

interface TransferFormProps {
  opportunity: Opportunity;
  cotizacionesCount?: number;
  goneMessage: string;
  isPending: boolean;
  onTransfer: (
    variables: TransferOpportunityVariables,
    callbacks: { onSuccess: () => void; onError: (error: unknown) => void }
  ) => void;
  onClose: () => void;
}

/**
 * Selector del nuevo vendedor, aviso de efectos y confirmación. Se monta de
 * nuevo en cada apertura (`key`), así que la selección y el error empiezan
 * vacíos.
 */
function TransferForm({
  opportunity,
  cotizacionesCount,
  goneMessage,
  isPending,
  onTransfer,
  onClose,
}: TransferFormProps) {
  // Mismo catálogo que el filtro de vendedor del listado; su carga y su error
  // se resuelven aquí dentro (sin migrar `useUsers`, ver #239).
  const { data: users, isLoading, isError, isFetching, refetch } = useUsers();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Solo usuarios ACTIVOS (el backend rechaza uno inactivo) y sin el dueño
  // actual, que no tiene a quién transferirse.
  const options: TransferOption[] = (users ?? [])
    .filter((user) => user.is_active && user.id !== opportunity.vendedor)
    .map((user) => ({
      id: user.id,
      label: user.nombre_completo?.trim() || user.email || user.username,
      email: user.email,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  // Sin vendedor (registros de otros flujos) nadie deja de verla ni hay un
  // "vendedor anterior": el aviso solo dice quién pasa a tenerla.
  const hasOwner = opportunity.vendedor !== null;
  const previousOwner = opportunity.vendedor_nombre?.trim() || "El vendedor actual";
  const ownerText = hasOwner
    ? `${previousOwner} dejará de verla y de ver sus seguimientos, salvo que sea administrador.`
    : "No tiene vendedor asignado: quien elijas pasará a ser su vendedor.";
  const cotizacionesSuffix = hasOwner
    ? "seguirán a nombre del vendedor anterior."
    : "no cambian de dueño.";
  const cotizacionesText =
    cotizacionesCount === undefined
      ? `Sus cotizaciones, si las tiene, ${cotizacionesSuffix}`
      : cotizacionesCount === 0
        ? "No tiene cotizaciones."
        : cotizacionesCount === 1
          ? `Su cotización ${hasOwner ? "seguirá a nombre del vendedor anterior." : "no cambia de dueño."}`
          : `Sus ${cotizacionesCount} cotizaciones ${cotizacionesSuffix}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedId === null || isPending) return;
    setFieldError(null);
    onTransfer(
      { id: opportunity.id, vendedor: selectedId },
      {
        onSuccess: onClose,
        onError: (error) => {
          // El destinatario no vale (inactivo, de otra empresa): se dice bajo
          // el selector y el diálogo sigue abierto para elegir otro.
          const rejection = vendedorRejection(error);
          if (rejection) {
            setFieldError(rejection);
            return;
          }
          // Ya no existe (o dejó de ser visible): no hay nada que reintentar;
          // la relectura deja el detalle en "no disponible" o saca la fila.
          if (isNotFoundError(error)) {
            toast.error(goneMessage);
            onClose();
            return;
          }
          toast.error(
            opportunityActionErrorMessage(
              error,
              "No se pudo transferir la oportunidad. Intenta de nuevo."
            )
          );
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      <p className={`text-sm ${MUTED_CLS}`}>
        Vendedor actual:{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {opportunity.vendedor_nombre?.trim() || "Sin asignar"}
        </span>
      </p>

      {/* Enter en el buscador NO envía el formulario: se escribe ahí para
          filtrar, y enviar ejecutaría la transferencia sin confirmarla. */}
      <fieldset
        disabled={isPending}
        className="space-y-2"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
          }
        }}
      >
        <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Nuevo vendedor
        </legend>
        {isError && !users ? (
          <SectionErrorNotice
            variant="inline"
            message="No se pudieron cargar los usuarios."
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : isLoading ? (
          <p role="status" className={`py-6 text-center text-sm ${MUTED_CLS}`}>
            Cargando usuarios...
          </p>
        ) : (
          <SearchableSelectList
            items={options}
            searchPlaceholder="Buscar usuario…"
            filterPredicate={(option, term) =>
              option.label.toLowerCase().includes(term) || option.email.toLowerCase().includes(term)
            }
            getKey={(option) => option.id}
            isSelected={(option) => option.id === selectedId}
            onSelect={(option) => {
              setSelectedId(option.id);
              setFieldError(null);
            }}
            renderIndicator={renderRadioIndicator}
            renderContent={(option) => (
              <>
                <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                  {option.label}
                </span>
                {option.email && option.email !== option.label && (
                  <span className={`block truncate text-xs ${MUTED_CLS}`}>{option.email}</span>
                )}
              </>
            )}
            emptyMessage="No hay otros usuarios activos a quien transferirla."
            noResultsMessage="Ningún usuario coincide con la búsqueda."
          />
        )}
        {fieldError && (
          <p role="alert" className="ml-1 text-xs text-red-600 dark:text-red-400">
            {fieldError}
          </p>
        )}
      </fieldset>

      <div
        role="note"
        className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
      >
        <p>
          {/* Un administrador de empresa las sigue viendo todas: solo deja de
              verla quien no lo es. */}
          {ownerText} {cotizacionesText}
        </p>
      </div>

      <div className="flex justify-end gap-3 pb-2">
        <FormCancelButton label="Cancelar" onClick={onClose} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Transfiriendo..."
          disabled={selectedId === null}
        >
          Transferir
        </FormSubmitButton>
      </div>
    </form>
  );
}

interface OpportunityTransferDialogProps {
  /** Oportunidad por transferir; `null` = cerrado. Se lee AL ABRIR. */
  opportunity: Opportunity | null;
  /**
   * Cuántas cotizaciones tiene, si se sabe (el detalle la trae; el listado
   * no): el aviso dice el número. Sin ella el aviso es genérico.
   */
  cotizacionesCount?: number;
  /**
   * Aviso de un 404 (la oportunidad ya no existe). Por defecto, el del
   * listado; el detalle pasa el suyo (`OPPORTUNITY_GONE_DETAIL_MESSAGE`).
   */
  goneMessage?: string;
  /** Cierra el diálogo (quien lo monta pone `opportunity` en `null`). */
  onClose: () => void;
}

/**
 * "Transferir": pasa la oportunidad a otro vendedor. El mismo diálogo en el
 * listado y en el detalle; solo se ofrece a un administrador de empresa.
 *
 * - Avisa de los efectos: quien la tenía deja de verla junto con sus
 *   seguimientos (salvo que sea administrador de empresa), y sus cotizaciones
 *   siguen a nombre del vendedor anterior.
 * - Queda abierto y bloqueado mientras la transferencia y la relectura están
 *   en curso (`useTransferOpportunity`); con éxito se cierra.
 * - Errores: un rechazo del destinatario (400 en `vendedor`) va bajo el
 *   selector; el resto, en un toast. Si la oportunidad ya no existe (404), se
 *   cierra.
 *
 * Copia del registro al abrir (`useDialogSession`): una relectura a media
 * elección no le cambia el dueño actual ni la lista de destinatarios.
 */
export function OpportunityTransferDialog({
  opportunity,
  cotizacionesCount,
  goneMessage = OPPORTUNITY_GONE_MESSAGE,
  onClose,
}: OpportunityTransferDialogProps) {
  const { mutate: transfer, isPending } = useTransferOpportunity();
  const session = useDialogSession(opportunity !== null, { opportunity, cotizacionesCount });
  const opened = session.snapshot;

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Transferir Oportunidad"
          subtitle={opened.opportunity ? getOpportunityName(opened.opportunity) : ""}
          statusColor="sky"
        />
      }
      open={opportunity !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
      maxWidth="560px"
      showCloseButton={false}
    >
      {opened.opportunity && (
        <TransferForm
          key={session.id}
          opportunity={opened.opportunity}
          cotizacionesCount={opened.cotizacionesCount}
          goneMessage={goneMessage}
          isPending={isPending}
          onTransfer={transfer}
          onClose={onClose}
        />
      )}
    </MainDialog>
  );
}
