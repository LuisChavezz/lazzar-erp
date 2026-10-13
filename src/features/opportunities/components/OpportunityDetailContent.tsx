"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, DeleteIcon, EditIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ErrorState } from "@/src/components/ErrorState";
import { Loader } from "@/src/components/Loader";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  InfoGrid,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CustomerCartera } from "@/src/features/customers/components/CustomerCartera";
import { canLandOnQuoteEdit } from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatCurrency, NO_CURRENCY_FORMAT, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { ESTADO_OPORTUNIDAD_CFG, ETAPA_PERDIDA } from "../constants/opportunityChoices";
import { OPPORTUNITIES_LIST_PATH } from "../constants/opportunityRoutes";
import { useDeleteOpportunity } from "../hooks/useDeleteOpportunity";
import { useOpportunityDetail } from "../hooks/useOpportunityDetail";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { describeOpportunity } from "../utils/describeOpportunity";
import { OpportunityCotizaciones } from "./OpportunityCotizaciones";
import { OpportunityCotizarAction } from "./OpportunityCotizarAction";
import OpportunityForm from "./OpportunityForm";

const MUTED_CLS = "text-slate-400 dark:text-slate-500";

/** Estados en los que ya no se cotiza: la oportunidad está cerrada. */
const ESTADOS_CERRADOS: readonly string[] = ["Perdida", "Ganada"];

interface OpportunityDetailContentProps {
  /** Id tal cual llega del segmento de ruta (texto libre). */
  opportunityId: string;
}

/**
 * Página de detalle de una oportunidad: sus datos, sus cotizaciones (con su
 * pedido) y la cartera de su cliente, todo de una sola llamada
 * (`useOpportunityDetail`).
 *
 * Aquí el `estado` va en TEXTO (`StatusBadge`): en el listado es solo un punto
 * de color.
 *
 * Estados, como el detalle de proveedor: id inválido → error sin consultar;
 * 404 → "no disponible", también si llega en una relectura (la dio de baja otra
 * persona); error de carga INICIAL → `ErrorState`; un refetch fallido con datos
 * conserva la vista y avisa por toast.
 */
export const OpportunityDetailContent = ({ opportunityId }: OpportunityDetailContentProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, isNotFound, isValidId, isInitialError, error } =
    useOpportunityDetail(opportunityId);

  // El formulario recibe una COPIA tomada al abrir, no `data.oportunidad` en
  // vivo: una relectura a media edición no debe cambiarle el registro base con
  // el que calcula qué campos cambiaron. `formSession` monta un formulario
  // nuevo en cada apertura (ver `OpportunityList`).
  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunity | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    mutate: deleteOpportunity,
    isPending: isDeleting,
    isSuccess: isDeleted,
  } = useDeleteOpportunity();

  const backLink = (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <Link
        href={OPPORTUNITIES_LIST_PATH}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Volver a Oportunidades</span>
      </Link>
    </div>
  );

  // Con id inválido la consulta está deshabilitada y nunca sale de `pending`:
  // se resuelve ANTES de mirar la carga para no quedar atorado en el `Loader`.
  if (!isValidId) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="Oportunidad no válida"
          message="El identificador de la oportunidad no es válido."
        />
      </div>
    );
  }

  // Baja hecha DESDE esta página: la consulta ya dice "no está" (la propia baja
  // la marca), pero no es un "no disponible" que explicar — se está saliendo al
  // listado.
  if (isNotFound && (isDeleting || isDeleted)) {
    return <Loader title="Oportunidad dada de baja" message="Volviendo al listado..." />;
  }

  // Un 404 es definitivo aunque antes hubiera datos: la oportunidad ya no está
  // disponible y mostrar su ficha (con sus acciones) sería mentir.
  if (isNotFound) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="Oportunidad no disponible"
          message="La oportunidad no existe, se dio de baja o no tienes acceso a ella."
        />
      </div>
    );
  }

  if (isInitialError) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="No se pudo cargar la oportunidad"
          message={extractErrorMessage(error, "No se pudo obtener la información de la oportunidad.")}
        />
      </div>
    );
  }

  // Sin datos: carga inicial en curso (id válido ⇒ consulta activa).
  if (!data) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <Loader title="Cargando oportunidad" message="Obteniendo detalle de la oportunidad..." />
      </div>
    );
  }

  const opportunity = data.oportunidad;
  // `?? []`: el contrato da ambos arreglos siempre, pero una respuesta sin el
  // campo debe caer en el estado vacío, no romper la página.
  const cotizaciones = data.cotizaciones ?? [];
  const cartera = data.cartera ?? [];

  const titulo = opportunity.titulo?.trim();
  const contacto = opportunity.nombre_contacto?.trim();
  const hasCliente = opportunity.cliente !== null;

  // "Cotizar" crea una cotización CON el cliente de la oportunidad y navega a
  // editarla: sin cliente no hay a quién cotizar, cerrada (Perdida/Ganada) ya
  // no se cotiza, y sin acceso a la ruta de edición el usuario la crearía y
  // rebotaría después, dejándola huérfana (mismo criterio que Recompra).
  const canCotizar =
    hasCliente &&
    !ESTADOS_CERRADOS.includes(opportunity.estado) &&
    canLandOnQuoteEdit(session?.user);

  const handleEdit = () => {
    setOpportunityToEdit(opportunity);
    setFormSession((current) => current + 1);
    setIsEditOpen(true);
  };

  return (
    <div className="w-full space-y-6">
      {backLink}

      {/* ── Cabecera ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white wrap-break-word min-w-0">
              {titulo || <span className={`italic font-medium ${MUTED_CLS}`}>Sin título</span>}
            </h1>
            <StatusBadge status={opportunity.estado} config={ESTADO_OPORTUNIDAD_CFG} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {opportunity.cliente_nombre ?? (contacto || "Sin cliente")} ·{" "}
            {opportunity.vendedor_nombre
              ? `Vendedor: ${opportunity.vendedor_nombre}`
              : "Sin vendedor asignado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCotizar && (
            <OpportunityCotizarAction
              opportunity={opportunity}
              cotizacionesCount={cotizaciones.length}
            />
          )}
          <Button
            variant="secondary"
            leftIcon={<EditIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={handleEdit}
          >
            Editar
          </Button>
          <Button
            variant="secondary"
            leftIcon={<DeleteIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setIsDeleteOpen(true)}
            className="text-rose-600! dark:text-rose-400!"
          >
            Dar de baja
          </Button>
        </div>
      </div>

      {/* ── Datos de la oportunidad ────────────────────────────────────── */}
      <Section title="Datos de la oportunidad">
        <InfoGrid>
          <InfoField label="Cliente">
            {opportunity.cliente_nombre ?? <span className={MUTED_CLS}>Sin cliente</span>}
          </InfoField>
          <InfoField label="Contacto">{textOrDash(opportunity.nombre_contacto)}</InfoField>
          <InfoField label="Teléfono">
            <span className="tabular-nums">{textOrDash(opportunity.telefono)}</span>
          </InfoField>
          <InfoField label="Correo" className="break-all">
            {textOrDash(opportunity.correo)}
          </InfoField>
          <InfoField label="Vendedor">
            {opportunity.vendedor_nombre ?? <span className={MUTED_CLS}>Sin asignar</span>}
          </InfoField>
          {/* Sin símbolo de moneda: las oportunidades no tienen moneda. */}
          <InfoField label="Monto estimado">
            <span className="tabular-nums">
              {formatCurrency(safeParseAmount(opportunity.monto_estimado), NO_CURRENCY_FORMAT)}
            </span>
          </InfoField>
          <InfoField label="Etapa">{textOrDash(opportunity.etapa)}</InfoField>
          {opportunity.etapa === ETAPA_PERDIDA && (
            <InfoField label="Motivo de pérdida">{textOrDash(opportunity.motivo_perdida)}</InfoField>
          )}
          {/* Fecha-calendario sin hora: se lee en UTC para que no se corra un
              día en husos al oeste. Las otras dos son timestamps reales. */}
          <InfoField label="Próximo contacto">
            {formatShortDate(opportunity.proximo_contacto, { timeZone: "UTC" })}
          </InfoField>
          <InfoField label="Creada">{formatShortDate(opportunity.created_at)}</InfoField>
          <InfoField label="Actualizada">{formatShortDate(opportunity.updated_at)}</InfoField>
          <InfoField label="Notas" className="col-span-full">
            <p className="whitespace-pre-wrap wrap-break-word">{textOrDash(opportunity.notas)}</p>
          </InfoField>
        </InfoGrid>
      </Section>

      <OpportunityCotizaciones opportunityId={opportunity.id} cotizaciones={cotizaciones} />

      {/* Solo con cliente. El texto vacío es NEUTRO: un `[]` también llega
          cuando el usuario no puede ver a ese cliente, así que no se afirma que
          no deba nada. */}
      {hasCliente && (
        <CustomerCartera
          cartera={cartera}
          title="Antigüedad de saldos del cliente"
          emptyMessage="Sin saldo pendiente para mostrar."
        />
      )}

      <MainDialog
        title={
          <DialogHeader title="Editar Oportunidad" subtitle="Edición de registro" statusColor="sky" />
        }
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        maxWidth="1000px"
      >
        <OpportunityForm
          key={formSession}
          onSuccess={() => setIsEditOpen(false)}
          opportunityToEdit={opportunityToEdit}
        />
      </MainDialog>

      {/* Misma confirmación que el listado. Sin optimista: queda abierta y
          bloqueada (`busy`) hasta que el servidor responde; con éxito se sale
          al listado (la baja ya dejó el detalle marcado como "no está"). */}
      {isDeleteOpen && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isDeleting) setIsDeleteOpen(false);
          }}
          title="Dar de Baja Oportunidad"
          description={`¿Dar de baja la oportunidad ${describeOpportunity(
            opportunity
          )}? Dejará de aparecer en el listado y en el seguimiento comercial.`}
          confirmText={isDeleting ? "Dando de baja…" : "Dar de baja"}
          confirmColor="red"
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() =>
            deleteOpportunity(opportunity.id, {
              onSuccess: () => router.replace(OPPORTUNITIES_LIST_PATH),
              onError: () => setIsDeleteOpen(false),
            })
          }
        />
      )}
    </div>
  );
};
