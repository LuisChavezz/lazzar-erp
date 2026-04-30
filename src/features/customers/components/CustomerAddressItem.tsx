"use client";

import { useState } from "react";
import { CustomerAddress } from "../interfaces/customer-address.interface";
import {
  ChevronDownIcon,
  MapPinIcon,
  HomeIcon,
  CheckCircleIcon,
  EditIcon,
} from "@/src/components/Icons";

interface CustomerAddressItemProps {
  address: CustomerAddress;
  onEdit?: (address: CustomerAddress) => void;
}

export function CustomerAddressItem({ address, onEdit }: CustomerAddressItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`
        rounded-2xl border transition-all duration-300
        ${isExpanded
          ? "border-sky-200 bg-sky-50/30 dark:border-sky-500/30 dark:bg-sky-500/5 shadow-md shadow-sky-100/50 dark:shadow-sky-900/10"
          : "border-slate-200 bg-white dark:border-white/5 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-sm"
        }
      `}
    >
      {/* Cabecera del item: area de expansion + acciones */}
      <div className="flex items-center gap-2 px-4 py-3.5">

        {/* Icono de pin */}
        <div
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200
            ${isExpanded
              ? "bg-sky-500 text-white"
              : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
            }
          `}
        >
          <MapPinIcon className="w-4 h-4" aria-hidden="true" />
        </div>

        {/* Texto de resumen — actua como area de expansion */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex-1 min-w-0 text-left cursor-pointer"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {address.destinatario}
            </span>
            {address.is_default && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 uppercase">
                <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
                Predeterminada
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {address.direccion_envio}, {address.colonia_envio} — {address.ciudad_envio}, {address.estado_envio}
          </p>
        </button>

        {/* Controles: boton editar + chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(address)}
              aria-label="Editar direccion"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors duration-200 cursor-pointer"
            >
              <EditIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? "Colapsar" : "Expandir"}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer"
          >
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-300 ${
                isExpanded ? "rotate-180 text-sky-500 dark:text-sky-400" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Panel de detalles expandible */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5">
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">

            <DetailRow label="Empresa de envio" value={address.empresa_envio} />
            <DetailRow label="Telefono" value={address.telefono_envio} />
            <DetailRow label="Celular" value={address.celular_envio} />
            <DetailRow label="Codigo Postal" value={address.codigo_postal} />

            <div className="sm:col-span-2">
              <DetailRow label="Calle y numero" value={address.direccion_envio} />
            </div>

            <DetailRow label="Colonia" value={address.colonia_envio} />
            <DetailRow label="Ciudad" value={address.ciudad_envio} />
            <DetailRow label="Estado" value={address.estado_envio} />

            {address.referencias && (
              <div className="sm:col-span-2">
                <DetailRow label="Referencias" value={address.referencias} />
              </div>
            )}
          </div>

          {/* Estatus */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Estatus
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                address.activo
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
              }`}
            >
              <HomeIcon className="w-3 h-3" aria-hidden="true" />
              {address.activo ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componente auxiliar para filas de detalle.
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {value || "—"}
      </span>
    </div>
  );
}
