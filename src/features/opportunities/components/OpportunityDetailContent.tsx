"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, DeleteIcon, EditIcon, TraspasosIcon } from "@/src/components/Icons";
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
import { useCompanyAdminStatus } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { canLandOnQuoteEdit } from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { formatCurrency, NO_CURRENCY_FORMAT, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  ESTADO_OPORTUNIDAD_CFG,
  ETAPA_PERDIDA,
  isOportunidadCerrada,
} from "../constants/opportunityChoices";
import { OPPORTUNITY_GONE_DETAIL_MESSAGE } from "../hooks/opportunityErrorMessages";
import { useOpportunityDetail } from "../hooks/useOpportunityDetail";
import { usePendingQuitarCotizacionIds } from "../hooks/useOpportunityCotizacionLinks";
import {
  usePendingSeguimientoIds,
  useSetSeguimientoCompletado,
} from "../hooks/useSeguimientoMutations";
import type { Opportunity } from "../interfaces/opportunity.interface";
import type {
  OpportunityCotizacion,
  OpportunityOnboarding,
} from "../interfaces/opportunity-onboarding.interface";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";
import { OPPORTUNITY_LIST_PARAM } from "../constants/opportunityRoutes";
import { opportunitiesListHref, readOpportunityListParam } from "../utils/opportunityListQuery";
import { OpportunityCotizaciones } from "./OpportunityCotizaciones";
import { OpportunityCotizarAction } from "./OpportunityCotizarAction";
import { OpportunityDeleteDialog } from "./OpportunityDeleteDialog";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { OpportunityLigarCotizacionesDialog } from "./OpportunityLigarCotizacionesDialog";
import { OpportunityQuitarCotizacionDialog } from "./OpportunityQuitarCotizacionDialog";
import { OpportunityTransferDialog } from "./OpportunityTransferDialog";
import { OpportunityName } from "./OpportunityName";
import { OpportunitySeguimientoDeleteDialog } from "./OpportunitySeguimientoDeleteDialog";
import { OpportunitySeguimientoFormDialog } from "./OpportunitySeguimientoFormDialog";
import {
  OpportunitySeguimientos,
  type OpportunitySeguimientoActions,
} from "./OpportunitySeguimientos";

const MUTED_CLS = "text-slate-400 dark:text-slate-500";

interface OpportunityDetailContentProps {
  /** Id tal cual llega del segmento de ruta (texto libre). */
  opportunityId: string;
  /**
   * Parámetros CRUDOS de la URL del detalle. Si se llegó desde el listado, su
   * estado (filtros, búsqueda, orden, página) viene en `lista`: se valida aquí
   * y "Volver" regresa a ese mismo listado.
   */
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Página de detalle de una oportunidad: sus datos, sus cotizaciones (con su
 * pedido) y la cartera de su cliente, de una sola llamada
 * (`useOpportunityDetail`), y sus seguimientos, que tienen consulta propia
 * (`useOpportunitySeguimientos`, dentro de `OpportunitySeguimientos`).
 *
 * Estados, como el detalle de proveedor: id inválido → error sin consultar;
 * 404 → "no disponible", también si llega en una relectura (la dio de baja otra
 * persona); error de carga INICIAL → `ErrorState`; un refetch fallido con datos
 * conserva la vista y avisa por toast.
 *
 * "Volver" —y la salida tras dar de baja— regresan al listado con los filtros,
 * la búsqueda, el orden y la página con que se llegó (`opportunityListQuery`);
 * una entrada directa a esta URL vuelve al listado sin filtros.
 *
 * Los diálogos (editar, transferir y dar de baja la oportunidad; alta, edición
 * y borrado de un seguimiento; ligar y quitar cotizaciones) se montan FUERA de esos estados: así se cierran con su
 * animación aunque la pantalla de detrás cambie de estado. Guardan el REGISTRO
 * sobre el que actúan, no su id.
 */
export const OpportunityDetailContent = ({
  opportunityId,
  searchParams,
}: OpportunityDetailContentProps) => {
  const router = useRouter();
  const listQuery = readOpportunityListParam(searchParams[OPPORTUNITY_LIST_PARAM]);
  const listHref = opportunitiesListHref(listQuery);

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
  // "Transferir" (solo administrador de empresa): el registro y cuántas
  // cotizaciones tiene, para que el aviso diga el número.
  const [transfer, setTransfer] = useState<{
    opportunity: Opportunity;
    cotizacionesCount: number;
  } | null>(null);

  const handleEdit = (opportunity: Opportunity) => {
    setOpportunityToEdit(opportunity);
    setIsEditOpen(true);
  };

  // ── Seguimientos ────────────────────────────────────────────────────────
  // El formulario se abre con la oportunidad y el seguimiento tal como están
  // en ese momento (`seguimientoToEdit: null` = alta).
  const [seguimientoForm, setSeguimientoForm] = useState<{
    isOpen: boolean;
    seguimientoToEdit: OpportunitySeguimiento | null;
  }>({ isOpen: false, seguimientoToEdit: null });
  const [seguimientoToDelete, setSeguimientoToDelete] = useState<OpportunitySeguimiento | null>(
    null
  );
  const { mutate: setSeguimientoCompletado } = useSetSeguimientoCompletado();
  const busySeguimientoIds = usePendingSeguimientoIds();

  const seguimientoActions: OpportunitySeguimientoActions = {
    onCreate: () => setSeguimientoForm({ isOpen: true, seguimientoToEdit: null }),
    onEdit: (seguimiento) => setSeguimientoForm({ isOpen: true, seguimientoToEdit: seguimiento }),
    onDelete: setSeguimientoToDelete,
    onSetCompletado: (seguimiento, completado) =>
      setSeguimientoCompletado({ id: seguimiento.id, completado }),
    busyIds: busySeguimientoIds,
  };

  // ── Cotizaciones ligadas ────────────────────────────────────────────────
  // Id de la oportunidad a la que se ligan (`null` = cerrado), y la cotización
  // por quitar junto con su oportunidad.
  const [ligarOpportunityId, setLigarOpportunityId] = useState<number | null>(null);
  const [cotizacionToQuitar, setCotizacionToQuitar] = useState<{
    opportunityId: number;
    cotizacion: OpportunityCotizacion;
  } | null>(null);

  const handleDeleted = () => {
    setWasDeletedHere(true);
    router.replace(listHref);
  };

  const backLink = (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <Link
        href={listHref}
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
      <OpportunityDetailBody
        data={data}
        listQuery={listQuery}
        onEdit={handleEdit}
        onDelete={setOpportunityToDelete}
        onTransfer={(opportunity, cotizacionesCount) =>
          setTransfer({ opportunity, cotizacionesCount })
        }
        seguimientoActions={seguimientoActions}
        onLigarCotizaciones={setLigarOpportunityId}
        onQuitarCotizacion={(opportunityId, cotizacion) =>
          setCotizacionToQuitar({ opportunityId, cotizacion })
        }
      />
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

      <OpportunityTransferDialog
        opportunity={transfer?.opportunity ?? null}
        cotizacionesCount={transfer?.cotizacionesCount}
        goneMessage={OPPORTUNITY_GONE_DETAIL_MESSAGE}
        onClose={() => setTransfer(null)}
      />

      <OpportunitySeguimientoFormDialog
        open={seguimientoForm.isOpen}
        onOpenChange={(isOpen) => setSeguimientoForm((current) => ({ ...current, isOpen }))}
        opportunity={data?.oportunidad ?? null}
        seguimientoToEdit={seguimientoForm.seguimientoToEdit}
      />

      <OpportunitySeguimientoDeleteDialog
        seguimiento={seguimientoToDelete}
        onClose={() => setSeguimientoToDelete(null)}
      />

      <OpportunityLigarCotizacionesDialog
        opportunityId={ligarOpportunityId}
        onClose={() => setLigarOpportunityId(null)}
      />

      <OpportunityQuitarCotizacionDialog
        opportunityId={cotizacionToQuitar?.opportunityId ?? 0}
        cotizacion={cotizacionToQuitar?.cotizacion ?? null}
        onClose={() => setCotizacionToQuitar(null)}
      />
    </div>
  );
};

interface OpportunityDetailBodyProps {
  data: OpportunityOnboarding;
  /** Estado validado del listado de origen, para los enlaces que vuelven aquí. */
  listQuery: string;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunity: Opportunity) => void;
  onTransfer: (opportunity: Opportunity, cotizacionesCount: number) => void;
  seguimientoActions: OpportunitySeguimientoActions;
  onLigarCotizaciones: (opportunityId: number) => void;
  onQuitarCotizacion: (opportunityId: number, cotizacion: OpportunityCotizacion) => void;
}

/**
 * La ficha ya cargada: cabecera con el `estado` en TEXTO (`StatusBadge`; en el
 * listado es solo un punto de color) y las acciones, y las secciones de datos,
 * seguimientos, cotizaciones y cartera. Presentacional: los diálogos viven en
 * `OpportunityDetailContent`.
 */
function OpportunityDetailBody({
  data,
  listQuery,
  onEdit,
  onDelete,
  onTransfer,
  seguimientoActions,
  onLigarCotizaciones,
  onQuitarCotizacion,
}: OpportunityDetailBodyProps) {
  const { data: session } = useSession();
  // "Transferir" solo para un administrador de empresa RESUELTO.
  const canTransfer = useCompanyAdminStatus() === "admin";

  const opportunity = data.oportunidad;
  // `?? []`: el contrato da ambos arreglos siempre, pero una respuesta sin el
  // campo debe caer en el estado vacío, no romper la página.
  const cotizaciones = data.cotizaciones ?? [];
  const cartera = data.cartera ?? [];

  const contacto = opportunity.nombre_contacto?.trim();
  const hasCliente = opportunity.cliente !== null;
  const busyCotizacionIds = usePendingQuitarCotizacionIds(opportunity.id);

  // "Ligar cotización" ofrece cotizaciones del cliente: sin cliente no hay
  // cuáles, y a una Perdida el backend no liga (400). Se mira la ETAPA, que es
  // lo que valida el backend; una Ganada sí admite más cotizaciones.
  const canLigar = hasCliente && opportunity.etapa !== ETAPA_PERDIDA;

  // "Cotizar" crea una cotización CON el cliente de la oportunidad y navega a
  // editarla: sin cliente no hay a quién cotizar, cerrada (Perdida/Ganada) ya
  // no se cotiza, y sin acceso a la ruta de edición el usuario la crearía y
  // rebotaría después, dejándola huérfana (mismo criterio que Recompra). Que
  // ESE cliente se pueda cotizar lo comprueba la propia acción al hacer clic,
  // donde puede explicar por qué no (ver `OpportunityCotizarAction`).
  const canCotizar =
    hasCliente &&
    !isOportunidadCerrada(opportunity.estado) &&
    canLandOnQuoteEdit(session?.user);

  return (
    <>
      {/* ── Cabecera ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white wrap-break-word min-w-0">
              <OpportunityName opportunity={opportunity} />
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
          {canTransfer && (
            <Button
              variant="secondary"
              leftIcon={<TraspasosIcon className="w-4 h-4" aria-hidden="true" />}
              onClick={() => onTransfer(opportunity, cotizaciones.length)}
            >
              Transferir
            </Button>
          )}
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

      <OpportunitySeguimientos
        opportunity={opportunity}
        actions={seguimientoActions}
      />

      <OpportunityCotizaciones
        opportunityId={opportunity.id}
        cotizaciones={cotizaciones}
        listQuery={listQuery}
        canLigar={canLigar}
        onLigar={() => onLigarCotizaciones(opportunity.id)}
        onQuitar={(cotizacion) => onQuitarCotizacion(opportunity.id, cotizacion)}
        busyIds={busyCotizacionIds}
      />

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
