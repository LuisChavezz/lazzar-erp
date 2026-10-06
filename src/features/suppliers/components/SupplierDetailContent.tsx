"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, EditIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { Button } from "@/src/components/Button";
import {
  InfoField,
  InfoGrid,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import { hasPermission } from "@/src/utils/permissions";
import { useSatInfo } from "@/src/features/sat/hooks/useSatInfo";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import { useSupplier } from "../hooks/useSupplier";
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
 * conserva la vista y avisa por toast); 404 → "no disponible" (no existe, es de
 * otra empresa o está desactivado). El historial maneja su propia carga y su
 * propio error: un fallo ahí nunca tumba la página.
 */
export const SupplierDetailContent = ({ supplierId }: SupplierDetailContentProps) => {
  const { data: session } = useSession();
  const { data, numericId, isError, isNotFound, error, isValidId, hasLoaded } =
    useSupplier(supplierId);
  const { data: satInfo, isLoading: isSatLoading } = useSatInfo();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();

  // Mismo código que gobierna "Editar" en el listado de Compras
  // (`PERMISSIONS_BY_CONTEXT.procurement` en `SupplierList`).
  const canEdit = hasPermission("E-COMPRAS-PROV", session?.user);
  const canSeeHistory = hasPermission("R-COMPRAS-OC", session?.user);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const backLink = (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <Link
        href="/procurement/suppliers"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Volver a Proveedores</span>
      </Link>
    </div>
  );

  // Con id inválido la query está deshabilitada y nunca sale de `pending`: se
  // resuelve ANTES de mirar la carga para no quedar atorado en el `Loader`.
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

  // Un 404 gana aunque haya datos en caché: el proveedor ya no está disponible
  // y mostrar su ficha (con "Editar") sería mentir.
  if (isNotFound || isInitialLoadError(isError, hasLoaded)) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <ErrorState
          title="No se pudo cargar el proveedor"
          message={
            isNotFound
              ? "El proveedor no existe o ya no está disponible."
              : extractErrorMessage(error, "No se pudo obtener la información del proveedor.")
          }
        />
      </div>
    );
  }

  // Sin datos ni placeholder: carga inicial en curso (id válido ⇒ query activa).
  if (!data) {
    return (
      <div className="w-full space-y-6">
        {backLink}
        <Loader title="Cargando proveedor" message="Obteniendo detalle del proveedor..." />
      </div>
    );
  }

  const currency = currencies?.find((item) => item.id === data.moneda);
  // Sin código ISO conocido se formatea como número plano: aplicar el MXN por
  // defecto de `formatCurrency` mentiría sobre un proveedor en otra moneda.
  const limiteCredito = currency
    ? formatMoneyValueOrDash(data.limite_credito, { currency: currency.codigo_iso })
    : formatMoneyValueOrDash(data.limite_credito, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return (
    <div className="w-full space-y-6">
      {backLink}

      {/* ── Cabecera ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.nombre}</h1>
            <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded">
              {data.codigo}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {textOrDash(data.razon_social)} · <span className="font-mono">{textOrDash(data.rfc)}</span>
          </p>
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

      {/* ── Datos del proveedor ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Identificación">
          <InfoGrid>
            <InfoField label="Código">
              <span className="font-mono">{textOrDash(data.codigo)}</span>
            </InfoField>
            <InfoField label="Nombre">{textOrDash(data.nombre)}</InfoField>
            <InfoField label="Razón social">{textOrDash(data.razon_social)}</InfoField>
            <InfoField label="RFC">
              <span className="font-mono">{textOrDash(data.rfc)}</span>
            </InfoField>
          </InfoGrid>
        </Section>

        <Section title="Contacto">
          <InfoGrid>
            <InfoField label="Correo" className="break-all">
              {textOrDash(data.email)}
            </InfoField>
            <InfoField label="Teléfono">
              <span className="font-mono">{textOrDash(data.telefono)}</span>
            </InfoField>
            <InfoField label="Contacto principal">{textOrDash(data.contacto_principal)}</InfoField>
          </InfoGrid>
        </Section>

        <Section title="Crédito">
          <InfoGrid>
            <InfoField label="Días de crédito">
              <span className="tabular-nums">{formatQuantityValue(data.dias_credito)}</span>
            </InfoField>
            <InfoField label="Límite de crédito">
              <span className="tabular-nums">{limiteCredito}</span>
            </InfoField>
            <InfoField label="Moneda">
              {catalogLabel(
                data.moneda,
                currencies,
                isCurrenciesLoading,
                (item) => item.id,
                (item) => `${item.codigo_iso} — ${item.nombre}`,
              )}
            </InfoField>
          </InfoGrid>
        </Section>

        <Section title="SAT">
          <InfoGrid>
            <InfoField label="Régimen fiscal">
              {catalogLabel(
                data.sat_regimen_fiscal,
                satInfo?.regimenes_fiscales,
                isSatLoading,
                (item) => item.id_sat_regimen_fiscal,
                (item) => `${item.codigo} — ${item.descripcion}`,
              )}
            </InfoField>
            <InfoField label="Forma de pago">
              {catalogLabel(
                data.sat_forma_pago,
                satInfo?.formas_pago,
                isSatLoading,
                (item) => item.id_sat_forma_pago,
                (item) => `${item.codigo} — ${item.descripcion}`,
              )}
            </InfoField>
            <InfoField label="Método de pago">
              {catalogLabel(
                data.sat_metodo_pago,
                satInfo?.metodos_pago,
                isSatLoading,
                (item) => item.id_sat_metodo_pago,
                (item) => `${item.codigo} — ${item.descripcion}`,
              )}
            </InfoField>
          </InfoGrid>
        </Section>
      </div>

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
