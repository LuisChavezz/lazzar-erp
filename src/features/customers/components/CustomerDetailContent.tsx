"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { CustomerCartera } from "./CustomerCartera";
import { CustomerCredito } from "./CustomerCredito";
import { CustomerResumenKpis, CustomerResumenKpisSkeleton } from "./CustomerResumenKpis";
import { CustomerResumenPedidos } from "./CustomerResumenPedidos";
import { useCustomer } from "../hooks/useCustomer";
import { getFacturamaVerificationNotice } from "../utils/facturamaVerification";

interface CustomerDetailContentProps {
  customerId: string;
}

export const CustomerDetailContent = ({ customerId }: CustomerDetailContentProps) => {
  const router = useRouter();
  const { data, isPlaceholderData, isNotFound, isInitialError, isValidId } =
    useCustomer(customerId);

  const backButton = (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <button
        type="button"
        onClick={() => router.replace("/sales/customers")}
        className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Volver</span>
      </button>
    </div>
  );

  // Con id inválido la query está deshabilitada y nunca sale de `pending`: se
  // resuelve ANTES de mirar la carga para no quedar atorado en el `Loader`.
  if (!isValidId) {
    return (
      <div className="w-full space-y-8">
        {backButton}
        <ErrorState title="Cliente no válido" message="El identificador del cliente no es válido." />
      </div>
    );
  }

  // Un 404/403 gana aunque haya datos en caché: el cliente ya no existe o ya no
  // es visible para el usuario, y mostrar su ficha sería mentir.
  if (isNotFound) {
    return (
      <div className="w-full space-y-8">
        {backButton}
        <ErrorState
          title="Cliente no disponible"
          message="El cliente no existe, se dio de baja o no tienes acceso a él."
        />
      </div>
    );
  }

  // Error de pantalla completa SOLO si nunca hubo respuesta real. Un refetch
  // fallido con datos ya cargados conserva la vista (y `useGuardedQuery` avisa
  // por toast).
  if (isInitialError) {
    return (
      <div className="w-full space-y-8">
        {backButton}
        <ErrorState
          title="No se pudo cargar el cliente"
          message="Ocurrió un problema al consultar el servidor. Recarga la página para intentar de nuevo."
        />
      </div>
    );
  }

  // Sin datos ni placeholder: carga inicial en curso (id válido ⇒ query activa).
  if (!data) {
    return <Loader title="Cargando cliente" message="Obteniendo detalle del cliente..." />;
  }

  // El resumen solo existe en la respuesta REAL del detalle: mientras se
  // muestra la fila del listado (placeholder) se pinta un estado de carga,
  // nunca ceros ni "sin pedidos".
  const resumen = isPlaceholderData ? undefined : data.resumen_comercial;
  const facturamaNotice = getFacturamaVerificationNotice(data);

  // Bloque de KPIs: datos, carga o error del resumen.
  let kpis: ReactNode;
  if (resumen) {
    kpis = <CustomerResumenKpis resumen={resumen} />;
  } else if (isPlaceholderData) {
    kpis = <CustomerResumenKpisSkeleton />;
  } else {
    // Respuesta real sin el bloque: no se inventan valores.
    kpis = (
      <ErrorState
        title="Resumen comercial no disponible"
        message="El servidor no devolvió el resumen comercial de este cliente."
      />
    );
  }

  return (
    <div className="w-full space-y-8">
      {backButton}

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.nombre}</h1>
        {/* Sin correo (es opcional) no queda un "Razón · " colgando. */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {[data.razon_social, data.correo].filter(Boolean).join(" · ")}
        </p>
        {/* Texto completo, no solo tooltip: aquí sí cabe decir qué falta. La
            fila del listado (placeholder) ya trae el flag, así que no parpadea. */}
        {facturamaNotice && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {facturamaNotice}
          </span>
        )}
      </div>

      {kpis}

      {/* Mismo espaciado entre todas las secciones (`CustomerResumenPedidos`
          ya separa las suyas con `space-y-6`). El crédito es dato del CLIENTE,
          no del resumen —viene también en la fila del listado—, así que se
          pinta en los tres estados; cartera y pedidos, solo con el resumen. */}
      <div className="space-y-6">
        <CustomerCredito customer={data} />
        {resumen && (
          <>
            {/* Crédito y antigüedad de saldos van juntos pero sin cruzarse: el
                límite no tiene moneda y la cartera va por moneda.
                `?? []`: el contrato da `cartera` siempre, pero una respuesta
                sin el campo debe caer en el estado vacío, no romper. */}
            <CustomerCartera cartera={resumen.cartera ?? []} />
            <CustomerResumenPedidos resumen={resumen} />
          </>
        )}
      </div>
    </div>
  );
};
