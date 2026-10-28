"use client";

import { useId, useState, type FormEvent } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { MainDialog } from "@/src/components/MainDialog";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import {
  OPPORTUNITY_GONE_MESSAGE,
  transferVendedorRejection,
} from "../hooks/opportunityErrorMessages";
import {
  useTransferOpportunity,
  type TransferOpportunityVariables,
} from "../hooks/useTransferOpportunity";
import { useTransferCandidates } from "../hooks/useTransferCandidates";
import type { Opportunity } from "../interfaces/opportunity.interface";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";
import { isCotizacionAutorizada } from "../utils/cotizacionEstatus";
import { getOpportunityName } from "../utils/describeOpportunity";

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

interface TransferOption {
  id: number;
  label: string;
  email: string;
}

interface TransferFormProps {
  opportunity: Opportunity;
  cotizaciones?: readonly OpportunityCotizacion[];
  goneMessage: string;
  isPending: boolean;
  onTransfer: (
    variables: TransferOpportunityVariables,
    callbacks: { onSuccess: () => void; onError: (error: unknown) => void }
  ) => void;
  onClose: () => void;
}

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/**
 * Qué pasa con las cotizaciones al transferir. El backend pasa TODAS las de la
 * oportunidad al nuevo dueño, sin mirar su estatus, y el vendedor de un pedido
 * es el de su cotización: los pedidos que salieron de ellas también cambian de
 * vendedor. `emphasis` resalta las autorizadas y los pedidos.
 *
 * Solo se cuentan COTIZACIONES. Los pedidos se mencionan sin número: el
 * onboarding da solo el último pedido de cada cotización (puede tener más) y
 * no descarta los dados de baja. Un pedido se detecta por `pedido_id`, no por
 * estatus: no se supone que solo una autorizada lo tenga.
 */
const describeCotizacionesMove = (
  cotizaciones: readonly OpportunityCotizacion[] | undefined,
  /** Nombre del elegido; sin elegir aún, "el nuevo vendedor". */
  destino: string | undefined
): { text: string; emphasis: string | null } => {
  const aDestino = destino ? `a ${destino}` : "al nuevo vendedor";
  const aNombreDe = destino ? `a nombre de ${destino}` : "a nombre del nuevo vendedor";
  const pedidosText = (deQuien: string) =>
    `los pedidos que se generaron ${deQuien} también quedarán ${aNombreDe}.`;
  if (cotizaciones === undefined) {
    return {
      text: `Todas sus cotizaciones, si las tiene, pasarán ${aDestino}, sin importar su estatus.`,
      emphasis: `Si ya tiene pedidos, ${pedidosText("de sus cotizaciones")}`,
    };
  }
  const total = cotizaciones.length;
  if (total === 0) return { text: "No tiene cotizaciones.", emphasis: null };

  const text =
    total === 1
      ? `Su cotización pasará ${aDestino}.`
      : `Sus ${total} cotizaciones pasarán ${aDestino}, sin importar su estatus.`;
  const autorizadas = cotizaciones.filter(isCotizacionAutorizada).length;
  const hasPedidos = cotizaciones.some((cotizacion) => cotizacion.pedido_id !== null);
  if (autorizadas === 0 && !hasPedidos) return { text, emphasis: null };

  const autorizadasText =
    autorizadas === 0
      ? null
      : total === 1
        ? "Está autorizada"
        : `Incluye ${plural(autorizadas, "cotización autorizada", "cotizaciones autorizadas")}`;
  if (!hasPedidos) return { text, emphasis: `${autorizadasText}.` };
  const pedidos = pedidosText(total === 1 ? "de ella" : "de sus cotizaciones");
  return {
    text,
    emphasis: autorizadasText
      ? `${autorizadasText}; ${pedidos}`
      : `${pedidos.charAt(0).toUpperCase()}${pedidos.slice(1)}`,
  };
};

/**
 * Selector del nuevo vendedor, aviso de efectos y confirmación. Se monta de
 * nuevo en cada apertura (`key`), así que la selección y el error empiezan
 * vacíos.
 */
function TransferForm({
  opportunity,
  cotizaciones,
  goneMessage,
  isPending,
  onTransfer,
  onClose,
}: TransferFormProps) {
  // Usuarios activos de Ventas; su carga y su error se resuelven aquí dentro.
  const { candidates, isLoading, isInitialError, isFetching, refetch } = useTransferCandidates();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const fieldErrorId = useId();

  // Sin el dueño actual, que no tiene a quién transferirse.
  const options: TransferOption[] = candidates
    .filter((user) => user.id !== opportunity.vendedor)
    .map((user) => ({
      id: user.id,
      label: user.nombre_completo?.trim() || user.email || user.username,
      email: user.email,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  // El elegido va FIJO arriba y no lo oculta la búsqueda: "Transferir" nunca
  // actúa sobre alguien que no se ve.
  const selectedOption = options.find((option) => option.id === selectedId);
  const listedOptions = selectedOption
    ? [selectedOption, ...options.filter((option) => option !== selectedOption)]
    : options;

  // Sin vendedor (registros de otros flujos) nadie deja de verla ni hay un
  // "vendedor anterior": el aviso solo dice quién pasa a tenerla.
  const hasOwner = opportunity.vendedor !== null;
  const previousOwner = opportunity.vendedor_nombre?.trim() || "El vendedor actual";
  const ownerText = hasOwner
    ? `${previousOwner} dejará de verla y de ver sus seguimientos, salvo que sea administrador.`
    : "No tiene vendedor asignado: quien elijas pasará a ser su vendedor.";
  const { text: cotizacionesText, emphasis: cotizacionesEmphasis } = describeCotizacionesMove(
    cotizaciones,
    selectedOption?.label
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedId === null || isPending) return;
    setFieldError(null);
    onTransfer(
      {
        id: opportunity.id,
        vendedor: selectedId,
        goneMessage,
        cotizacionIds: cotizaciones?.map((cotizacion) => cotizacion.id),
      },
      {
        onSuccess: onClose,
        // Los toasts los da el hook; aquí solo lo que depende del diálogo.
        onError: (error) => {
          // El destinatario no vale (no encontrado en la empresa de la
          // oportunidad, inactivo o sin departamento de Ventas): se dice bajo
          // el selector y el diálogo sigue abierto para elegir otro.
          const rejection = transferVendedorRejection(error);
          if (rejection) {
            setFieldError(rejection);
            return;
          }
          // Ya no existe (o dejó de ser visible): no hay nada que reintentar;
          // la relectura deja el detalle en "no disponible" o saca la fila.
          if (isNotFoundError(error)) onClose();
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
        // El rechazo del destinatario queda ligado al grupo del selector.
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? fieldErrorId : undefined}
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
        {isInitialError ? (
          <SectionErrorNotice
            variant="inline"
            message="No se pudieron cargar los usuarios y roles para elegir al nuevo vendedor."
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : isLoading ? (
          <p role="status" className={`py-6 text-center text-sm ${MUTED_CLS}`}>
            Cargando usuarios...
          </p>
        ) : (
          <SearchableSelectList
            items={listedOptions}
            searchPlaceholder="Buscar usuario…"
            filterPredicate={(option, term) =>
              option.id === selectedId ||
              option.label.toLowerCase().includes(term) ||
              option.email.toLowerCase().includes(term)
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
            emptyMessage="No hay otros usuarios activos de Ventas a quien transferirla."
            noResultsMessage="Ningún usuario coincide con la búsqueda."
          />
        )}
        {fieldError && (
          <p id={fieldErrorId} role="alert" className="ml-1 text-xs text-red-600 dark:text-red-400">
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
        {cotizacionesEmphasis && <p className="mt-2 font-semibold">{cotizacionesEmphasis}</p>}
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
   * Sus cotizaciones, si se saben (el detalle las trae; el listado no): el
   * aviso dice cuántas son, cuántas autorizadas y si ya hay pedidos, y la
   * transferencia relee solo el detalle de esas. Sin ellas el aviso es
   * genérico.
   */
  cotizaciones?: readonly OpportunityCotizacion[];
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
 *   seguimientos (salvo que sea administrador de empresa), y TODAS sus
 *   cotizaciones pasan al nuevo vendedor, sin importar su estatus. El vendedor
 *   de un pedido es el de su cotización, así que los pedidos que salieron de
 *   ellas también pasan: con autorizadas o pedidos el aviso lo resalta.
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
  cotizaciones,
  goneMessage = OPPORTUNITY_GONE_MESSAGE,
  onClose,
}: OpportunityTransferDialogProps) {
  const { mutate: transfer, isPending } = useTransferOpportunity();
  const session = useDialogSession(opportunity !== null, { opportunity, cotizaciones });
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
          cotizaciones={opened.cotizaciones}
          goneMessage={goneMessage}
          isPending={isPending}
          onTransfer={transfer}
          onClose={onClose}
        />
      )}
    </MainDialog>
  );
}
