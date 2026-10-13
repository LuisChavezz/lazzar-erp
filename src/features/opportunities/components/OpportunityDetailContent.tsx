"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, DeleteIcon, EditIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ErrorState } from "@/src/components/ErrorState";
import { Loader } from "@/src/components/Loader";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  InfoGrid,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CustomerCartera } from "@/src/features/customers/components/CustomerCartera";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { canLandOnQuoteEdit } from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { formatCurrency, NO_CURRENCY_FORMAT, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { ESTADO_OPORTUNIDAD_CFG, ETAPA_PERDIDA } from "../constants/opportunityChoices";
import { OPPORTUNITIES_LIST_PATH } from "../constants/opportunityRoutes";
import { useOpportunityDetail } from "../hooks/useOpportunityDetail";
import type { Opportunity } from "../interfaces/opportunity.interface";
import type { OpportunityOnboarding } from "../interfaces/opportunity-onboarding.interface";
import { OpportunityCotizaciones } from "./OpportunityCotizaciones";
import { OpportunityCotizarAction } from "./OpportunityCotizarAction";
import { OpportunityDeleteDialog } from "./OpportunityDeleteDialog";
import { OpportunityFormDialog } from "./OpportunityFormDialog";

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
 * Estados, como el detalle de proveedor: id inválido → error sin consultar;
 * 404 → "no disponible", también si llega en una relectura (la dio de baja otra
 * persona); error de carga INICIAL → `ErrorState`; un refetch fallido con datos
 * conserva la vista y avisa por toast.
 *
 * Los diálogos (editar, dar de baja) se montan FUERA de esos estados: así se
 * cierran con su animación aunque la pantalla de detrás cambie de estado.
 */
export const OpportunityDetailContent = ({ opportunityId }: OpportunityDetailContentProps) => {
  const router = useRouter();

  // `true` SOLO cuando la baja hecha desde esta página tuvo éxito (lo pone
  // `onDeleted`). No se deduce de un 404: una baja que falla porque otra
  // persona ya la había hecho es un "no disponible" normal. Con la baja hecha
  // se deja de consultar el detalle, que ya se quitó de la caché.
  const [wasDeletedHere, setWasDeletedHere] = useState(false);
  const { data, isNotFound, isValidId, isInitialError } = useOpportunityDetail(opportunityId, {
    enabled: !wasDeletedHere,
  });

  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunity | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<Opportunity | null>(null);

  const handleEdit = (opportunity: Opportunity) => {
    setOpportunityToEdit(opportunity);
    setIsEditOpen(true);
  };

  const handleDeleted = () => {
    setWasDeletedHere(true);
    router.replace(OPPORTUNITIES_LIST_PATH);
  };

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

  let content: ReactNode;
  if (!isValidId) {
    // Con id inválido la consulta está deshabilitada y nunca sale de `pending`:
    // se resuelve ANTES de mirar la carga para no quedar atorado en el `Loader`.
    content = (
      <ErrorState
        title="Oportunidad no válida"
        message="El identificador de la oportunidad no es válido."
      />
    );
  } else if (wasDeletedHere) {
    // Ya se está saliendo al listado; "Volver" queda a la vista por si la
    // navegación no llega a completarse.
    content = <Loader title="Oportunidad dada de baja" message="Volviendo al listado..." />;
  } else if (isNotFound) {
    // Un 404 es definitivo aunque antes hubiera datos: la oportunidad ya no
    // está disponible y mostrar su ficha (con sus acciones) sería mentir.
    content = (
      <ErrorState
        title="Oportunidad no disponible"
        message="La oportunidad no existe, se dio de baja o no tienes acceso a ella."
      />
    );
  } else if (isInitialError) {
    // Texto fijo: este GET no responde con un mensaje propio para el usuario, y
    // el del cliente HTTP ("Request failed with status code 500") no le dice nada.
    content = (
      <ErrorState
        title="No se pudo cargar la oportunidad"
        message="Ocurrió un problema al consultar el servidor. Recarga la página para intentar de nuevo."
      />
    );
  } else if (!data) {
    // Sin datos: carga inicial en curso (id válido ⇒ consulta activa).
    content = (
      <Loader title="Cargando oportunidad" message="Obteniendo detalle de la oportunidad..." />
    );
  } else {
    content = (
      <OpportunityDetailBody data={data} onEdit={handleEdit} onDelete={setOpportunityToDelete} />
    );
  }

  return (
    <div className="w-full space-y-6">
      {backLink}
      {content}

      <OpportunityFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        opportunityToEdit={opportunityToEdit}
      />

      <OpportunityDeleteDialog
        opportunity={opportunityToDelete}
        onClose={() => setOpportunityToDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

interface OpportunityDetailBodyProps {
  data: OpportunityOnboarding;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunity: Opportunity) => void;
}

/**
 * La ficha ya cargada: cabecera con el `estado` en TEXTO (`StatusBadge`; en el
 * listado es solo un punto de color) y las acciones, y las secciones de datos,
 * cotizaciones y cartera. Presentacional: los diálogos viven en
 * `OpportunityDetailContent`.
 */
function OpportunityDetailBody({ data, onEdit, onDelete }: OpportunityDetailBodyProps) {
  const { data: session } = useSession();

  const opportunity = data.oportunidad;
  // `?? []`: el contrato da ambos arreglos siempre, pero una respuesta sin el
  // campo debe caer en el estado vacío, no romper la página.
  const cotizaciones = data.cotizaciones ?? [];
  const cartera = data.cartera ?? [];

  const titulo = opportunity.titulo?.trim();
  const contacto = opportunity.nombre_contacto?.trim();
  const hasCliente = opportunity.cliente !== null;

  // El cliente de la oportunidad debe estar entre los clientes ACTIVOS que este
  // usuario ve: es el mismo catálogo con el que la edición de la cotización
  // arma los datos de facturación, y con un cliente que no está ahí abriría en
  // blanco. Mientras el catálogo carga, o si falla, `customers` viene vacío y
  // "Cotizar" no se ofrece (falla cerrado). `Customer.id` está tipado `string`
  // pero el backend lo manda como número: se compara como texto.
  const { customers } = useCustomers();
  const isClienteCotizable = customers.some(
    (customer) => customer.activo && String(customer.id) === String(opportunity.cliente)
  );

  // "Cotizar" crea una cotización CON el cliente de la oportunidad y navega a
  // editarla: sin cliente (o con uno que el usuario no puede usar) no hay a
  // quién cotizar, cerrada (Perdida/Ganada) ya no se cotiza, y sin acceso a la
  // ruta de edición el usuario la crearía y rebotaría después, dejándola
  // huérfana (mismo criterio que Recompra).
  const canCotizar =
    hasCliente &&
    isClienteCotizable &&
    !ESTADOS_CERRADOS.includes(opportunity.estado) &&
    canLandOnQuoteEdit(session?.user);

  return (
    <>
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
            onClick={() => onEdit(opportunity)}
          >
            Editar
          </Button>
          <Button
            variant="secondary"
            leftIcon={<DeleteIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={() => onDelete(opportunity)}
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
    </>
  );
}
