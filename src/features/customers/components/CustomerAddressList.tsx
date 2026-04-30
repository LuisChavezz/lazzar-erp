"use client";

import { useState } from "react";
import { Loader } from "@/src/components/Loader";
import { MapPinIcon, PlusIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { SearchInput } from "@/src/components/SearchInput";
import { useCustomerAddresses } from "../hooks/useCustomerAddresses";
import { CustomerAddressItem } from "./CustomerAddressItem";
import { CustomerAddress } from "../interfaces/customer-address.interface";

interface CustomerAddressListProps {
  customerId: number;
  customerName: string;
  onAddAddress?: () => void;
  onEditAddress?: (address: CustomerAddress) => void;
}

export function CustomerAddressList({
  customerId,
  customerName,
  onAddAddress,
  onEditAddress,
}: CustomerAddressListProps) {
  const { addresses, isLoading, isError } = useCustomerAddresses({ customerId });
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="py-6">
        <Loader
          title="Cargando direcciones"
          message={`Obteniendo direcciones de ${customerName}...`}
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-400">
          <MapPinIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          No se pudieron cargar las direcciones
        </p>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <MapPinIcon className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Sin direcciones registradas
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            Este cliente aún no tiene direcciones de envío.
          </p>
        </div>
      </div>
    );
  }

  /* Filtrado por término de búsqueda (destinatario, dirección, ciudad, colonia) */
  const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const termino = normalizar(search.trim());
  const filtered = termino
    ? addresses.filter((a) =>
        [a.destinatario, a.direccion_envio, a.ciudad_envio, a.colonia_envio, a.estado_envio]
          .some((campo) => normalizar(campo).includes(termino))
      )
    : addresses;

  return (
    <div className="flex flex-col gap-3">
      {/* Barra de herramientas: buscador + botón agregar */}
      <div className="flex items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar dirección..."
          className="flex-1"
        />
        {onAddAddress && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={onAddAddress}
          >
            Agregar
          </Button>
        )}
      </div>

      {/* Estado vacío tras búsqueda */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <MapPinIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sin resultados para &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      {/* Lista de ítems filtrados */}
      {filtered.map((address) => (
        <CustomerAddressItem key={address.id} address={address} onEdit={onEditAddress} />
      ))}
    </div>
  );
}
