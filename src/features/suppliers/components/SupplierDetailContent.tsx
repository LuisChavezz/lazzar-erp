"use client";

import { BACK_ARROW_CLASS, BACK_BUTTON_CLASS } from "@/src/components/backButtonClass";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { ArrowLeftIcon, EditIcon } from "@/src/components/Icons";
import { ProcurementRouteSkeleton } from "@/src/components/ProcurementRouteSkeleton";
import { ErrorState } from "@/src/components/ErrorState";
import { Button } from "@/src/components/Button";
import type { ReactNode } from "react";
import { Building2, CreditCard, Factory, Mail, Phone, Receipt } from "lucide-react";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import { hasPermission } from "@/src/utils/permissions";
import { useSatInfo } from "@/src/features/sat/hooks/useSatInfo";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import { useSupplier } from "../hooks/useSupplier";
import { SupplierMaquileroToggle } from "./SupplierMaquileroToggle";
import SupplierFormDialog from "./SupplierFormDialog";
import SupplierPurchaseOrderHistory from "./SupplierPurchaseOrderHistory";

/**
 * Etiqueta de un FK de catálogo con el MISMO formato que sus opciones en
 * `SupplierForm` ("código — descripción"). Si el id no está en el catálogo (o
 * el catálogo no cargó) se muestra el id crudo en vez de esconder el dato.
 */
const catalogLabel = <T,>(
  id: number | null | undefined,
  items: T[] | undefined,
  isLoading: boolean,
  getId: (item: T) => number,
  format: (item: T) => string,
): string => {
  if (id == null) return "—";
  const match = items?.find((item) => getId(item) === id);
  if (match) return format(match);
  return isLoading ? "Cargando..." : String(id);
};

/** Enlace visible desde el inicio (azul + subrayado punteado): se nota que se puede usar. */
const LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4 hover:decoration-solid hover:text-sky-700 dark:hover:text-sky-300 transition-colors";

/** Panel gris dentro de la hoja, como los del detalle del pedido. */
const SheetPanel = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
      <span className="text-sky-600 dark:text-sky-400" aria-hidden="true">{icon}</span>
      {title}
    </p>
    {children}
  </div>
);

const PanelField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
    <div className="text-sm text-slate-800 dark:text-slate-100">{children}</div>
  </div>
);

interface SupplierDetailContentProps {
  /** Id tal cual llega del segmento de ruta (texto libre). */
  supplierId: string;
}

/**
 * Página de detalle de un proveedor: sus datos (los 15 campos de `Supplier`,
 * sin saldos ni campos de sistema) y, para quien tiene `R-COMPRAS-OC`, su
 * historial de órdenes de compra.
 *
 * Estados como el detalle de cliente: id inválido → error sin consultar; error
 * de carga INICIAL → `ErrorState` de página (un refetch fallido con datos
 * conserva la vista y avisa por toast); 404/403 → "no disponible" (no existe,
 * es de otra empresa, está desactivado o ya no hay acceso), también en una
 * relectura. El historial maneja su propia carga y su
 * propio error: un fallo ahí nunca tumba la página.
 */
export const SupplierDetailContent = ({ supplierId }: SupplierDetailContentProps) => {
  const { data: session } = useSession();
  const { data, numericId, isNotFound, isInitialError, isValidId } =
    useSupplier(supplierId);
  const { data: satInfo, isLoading: isSatLoading } = useSatInfo();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();

  // Mismo código que gobierna "Editar" en el listado de Compras
  // (`PERMISSIONS_BY_CONTEXT.procurement` en `SupplierList`).
  const canEdit = hasPermission("E-COMPRAS-PROV", session?.user);
  const canSeeHistory = hasPermission("R-COMPRAS-OC", session?.user);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Si el proveedor deja de estar disponible con "Editar" abierto, la vista
  // cambia a "no disponible" y el diálogo se desmonta: se cierra (durante el
  // render, para que no reaparezca si el registro vuelve) y se avisa UNA vez
  // que lo capturado no se guardó.
  const [lostEditCount, setLostEditCount] = useState(0);
  if (isNotFound && isEditOpen) {
    setIsEditOpen(false);
    setLostEditCount((count) => count + 1);
  }
  useEffect(() => {
    if (lostEditCount === 0) return;
    toast.error("El proveedor ya no está disponible; los cambios no se guardaron.", {
      id: "supplier-edit-not-found",
    });
  }, [lostEditCount]);

  const backLink = (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <Link
        href="/procurement/suppliers"
        className={BACK_BUTTON_CLASS}
      >
        <ArrowLeftIcon className={BACK_ARROW_CLASS} />
        <span className="text-sm font-medium">Volver a Proveedores</span>
      </Link>
    </div>
  );

  // Con id inválido la query está deshabilitada y nunca sale de `pending`: se
  // resuelve ANTES de mirar la carga para no quedar atorado en el skeleton.
  if (!isValidId) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="Proveedor no válido"
          message="El identificador del proveedor no es válido."
        />
      </div>
    );
  }

  // Un 404/403 gana aunque haya datos en caché: el proveedor ya no está
  // disponible y mostrar su ficha (con "Editar") sería mentir.
  if (isNotFound) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="Proveedor no disponible"
          message="El proveedor no existe, está desactivado o no tienes acceso a él."
        />
      </div>
    );
  }

  if (isInitialError) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="No se pudo cargar el proveedor"
          message="Ocurrió un problema al consultar el servidor. Recarga la página para intentar de nuevo."
        />
      </div>
    );
  }

  // Sin datos ni placeholder: carga inicial en curso (id válido ⇒ query activa).
  // Mismo skeleton que el `loading.tsx` de la ruta: sin spinner intermedio.
  if (!data) {
    return <ProcurementRouteSkeleton variant="detail" backLink={backLink} />;
  }

  const currency = currencies?.find((item) => item.id === data.moneda);
  // Sin código ISO conocido se formatea como número plano: aplicar el MXN por
  // defecto de `formatCurrency` mentiría sobre un proveedor en otra moneda.
  const limiteCredito = formatMoneyValueOrDash(
    data.limite_credito,
    currency?.codigo_iso ?? null,
  );

  const moneda = catalogLabel(
    data.moneda,
    currencies,
    isCurrenciesLoading,
    (item) => item.id,
    (item) => `${item.codigo_iso} — ${item.nombre}`,
  );
  const satLabel = (item: { codigo: string; descripcion: string }) =>
    `${item.codigo} — ${item.descripcion}`;

  return (
    <div className="w-full space-y-6">
      {backLink}

      {/* ── Ficha del proveedor (una hoja, como el detalle del pedido) ── */}
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
        {/* Cabecera: identificación completa + editar */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Building2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.nombre}</h1>
                <span
                  className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded"
                  title="Código"
                >
                  {data.codigo}
                </span>
                {data.es_maquilero && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                    <Factory className="w-3.5 h-3.5" aria-hidden="true" />
                    Maquilero
                  </span>
                )}
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-1.5">
                  <dt className="text-slate-400 dark:text-slate-500">Razón social</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{textOrDash(data.razon_social)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-slate-400 dark:text-slate-500">RFC</dt>
                  <dd className="font-mono text-slate-700 dark:text-slate-200">{textOrDash(data.rfc)}</dd>
                </div>
              </dl>
            </div>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              leftIcon={<EditIcon className="w-4 h-4" />}
              onClick={() => setIsEditOpen(true)}
            >
              Editar
            </Button>
          )}
        </div>

        {/* Datos en paneles compactos, lado a lado */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SheetPanel icon={<Phone className="w-4 h-4" />} title="Contacto">
            <PanelField label="Contacto principal">{textOrDash(data.contacto_principal)}</PanelField>
            <PanelField label="Correo">
              {data.email ? (
                <a href={`mailto:${data.email}`} className={LINK_CLASS} title="Escribir correo">
                  <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{data.email}</span>
                </a>
              ) : (
                "—"
              )}
            </PanelField>
            <PanelField label="Teléfono">
              {data.telefono ? (
                <a href={`tel:${data.telefono.replace(/\s+/g, "")}`} className={LINK_CLASS} title="Llamar">
                  <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono">{data.telefono}</span>
                </a>
              ) : (
                "—"
              )}
            </PanelField>
          </SheetPanel>

          <SheetPanel icon={<CreditCard className="w-4 h-4" />} title="Crédito">
            <div className="grid grid-cols-2 gap-3">
              <PanelField label="Días">
                <span className="tabular-nums">{formatQuantityValue(data.dias_credito)}</span>
              </PanelField>
              <PanelField label="Límite">
                <span className="tabular-nums">{limiteCredito}</span>
              </PanelField>
            </div>
            <PanelField label="Moneda">{moneda}</PanelField>
          </SheetPanel>

          <SheetPanel icon={<Receipt className="w-4 h-4" />} title="SAT">
            <PanelField label="Régimen fiscal">
              {catalogLabel(data.sat_regimen_fiscal, satInfo?.regimenes_fiscales, isSatLoading, (item) => item.id_sat_regimen_fiscal, satLabel)}
            </PanelField>
            <PanelField label="Forma de pago">
              {catalogLabel(data.sat_forma_pago, satInfo?.formas_pago, isSatLoading, (item) => item.id_sat_forma_pago, satLabel)}
            </PanelField>
            <PanelField label="Método de pago">
              {catalogLabel(data.sat_metodo_pago, satInfo?.metodos_pago, isSatLoading, (item) => item.id_sat_metodo_pago, satLabel)}
            </PanelField>
          </SheetPanel>

          <SheetPanel icon={<Factory className="w-4 h-4" />} title="Producción">
            <SupplierMaquileroToggle
              supplierId={data.id}
              value={Boolean(data.es_maquilero)}
              canEdit={canEdit}
            />
          </SheetPanel>
        </div>
      </section>

      {/* ── Historial de órdenes de compra ─────────────────────────────── */}
      {/* Sin `R-COMPRAS-OC` la sección no existe (ni placeholder): sus filas
          enlazan a `/procurement/purchase-orders/[id]`, que exige ese código. */}
      {canSeeHistory && numericId !== null && (
        <SupplierPurchaseOrderHistory supplierId={numericId} />
      )}

      {canEdit && (
        <SupplierFormDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          supplierToEdit={data}
          onSuccess={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
};
