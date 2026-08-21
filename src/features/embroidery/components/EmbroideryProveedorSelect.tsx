"use client";

import { useSuppliers } from "@/src/features/suppliers/hooks/useSuppliers";
import { EmbroideryInlineSelect } from "./EmbroideryInlineSelect";

/**
 * Valor de la opción "bordado interno". Cadena vacía porque
 * `EmbroideryInlineSelect` emite `string` y ningún id de proveedor puede
 * colisionar con ella.
 */
const INTERNAL_VALUE = "";

/**
 * Rótulo del caso sin proveedor. NO es "sin asignar" ni "N/A": la ausencia de
 * proveedor tiene significado de negocio —el bordado se hace en casa— y es
 * además el caso mayoritario, así que se enuncia como una elección y no como un
 * dato que falta.
 */
const INTERNAL_LABEL = "Bordado interno";

interface EmbroideryProveedorSelectProps {
  /** Nombre ya resuelto por el backend; es lo que se pinta en el disparador. */
  proveedorNombre: string | null;
  /**
   * Id del proveedor asignado (`proveedor` de la orden), o `null` si es
   * interno. Solo se usa para no ofrecer en el menú lo que ya está asignado.
   */
  proveedorId: number | null;
  /** `null` devuelve la orden a bordado interno. */
  onProveedorChange: (proveedorId: number | null) => void;
  isPending?: boolean;
}

/**
 * Selector inline del proveedor externo de la orden.
 *
 * El catálogo es `useSuppliers()` (`GET /terceros/proveedores/`), el MISMO que
 * ya alimenta el módulo de proveedores: no se crea un servicio propio. No lleva
 * filtro de empresa por parámetro porque el backend ya acota el queryset a la
 * empresa del usuario autenticado (y a `activo=True`), igual que hace
 * `/usuarios/` para `EmbroideryOperatorSelect`. Filtrar otra vez en el cliente
 * solo podría equivocarse: la empresa de la ORDEN puede no ser la del usuario,
 * y en ese caso quien manda es la validación del backend, que responde `400`.
 *
 * La primera opción siempre es "Bordado interno" (envía `null`), para que se
 * pueda deshacer una subcontratación sin salir de la ficha.
 */
export function EmbroideryProveedorSelect({
  proveedorNombre,
  proveedorId,
  onProveedorChange,
  isPending = false,
}: EmbroideryProveedorSelectProps) {
  const { suppliers, isLoading } = useSuppliers();

  // El menú no ofrece la asignación ACTUAL: elegirla dispararía un PATCH que no
  // cambia nada. Mismo criterio que `EmbroideryStatusSelect`, cuyo
  // `getAvailableTransitions` excluye el estatus vigente.
  //
  // El proveedor asignado se descarta por ID, no por nombre: el catálogo puede
  // tener homónimos, y comparar etiquetas los ocultaría todos.
  //
  // "Interno" también se decide por el id y no por el nombre: un proveedor
  // capturado con el nombre en blanco daría `proveedor_nombre: " "` con
  // `proveedor` puesto, y leer la etiqueta habría escondido la opción de
  // volver a interno justo en la orden que sí necesita esa salida. El rótulo
  // del disparador sigue cayendo al nombre —es lo único que hay que pintar—,
  // pero quién manda sobre el estado es el id.
  const isInternal = proveedorId === null;

  const options = [
    // "Bordado interno" desaparece cuando la orden ya es interna: es la
    // asignación actual, no una alternativa.
    ...(isInternal ? [] : [{ value: INTERNAL_VALUE, label: INTERNAL_LABEL }]),
    ...suppliers
      .filter((supplier) => supplier.id !== proveedorId)
      .map((supplier) => ({
        value: String(supplier.id),
        label: supplier.nombre?.trim() || supplier.razon_social || `#${supplier.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es")),
  ];

  return (
    <EmbroideryInlineSelect
      options={options}
      onSelect={(value) =>
        onProveedorChange(value === INTERNAL_VALUE ? null : Number(value))
      }
      ariaLabel="Cambiar proveedor de bordado"
      isPending={isPending}
      // La lista SÍ puede quedar vacía desde que se excluye la asignación
      // actual: una orden interna en una empresa sin proveedores dados de alta
      // no tiene ninguna alternativa que ofrecer.
      emptyLabel={isLoading ? "Cargando proveedores…" : "Sin proveedores disponibles"}
      triggerClassName="text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
    >
      {proveedorNombre?.trim() ? (
        proveedorNombre
      ) : (
        <span className="text-slate-500 dark:text-slate-400">{INTERNAL_LABEL}</span>
      )}
    </EmbroideryInlineSelect>
  );
}
