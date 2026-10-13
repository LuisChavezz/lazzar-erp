"use client";

import { useMemo, useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import type { FormFieldError } from "@/src/utils/getFieldError";

/** Lo que el buscador lee de un cliente, venga del catálogo que venga. */
interface CustomerSearchOption {
  id: string | number;
  razon_social: string;
  nombre: string;
  correo: string;
  telefono: string;
}

interface CustomerSearchDropdownProps<C extends CustomerSearchOption> {
  value: string;
  onValueChange: (value: string) => void;
  customers: C[];
  onSelect: (customer: C) => void;
  label?: string;
  placeholder?: string;
  error?: FormFieldError;
  /**
   * Opción para QUITAR la selección (p. ej. "Sin cliente"), fija al inicio de
   * la lista. Con ella la lista abre también con el campo vacío, para que la
   * opción esté a la vista. Si se omite, el buscador se comporta como siempre:
   * solo lista coincidencias de lo tecleado.
   */
  clearOption?: { label: string; onSelect: () => void };
}

export function CustomerSearchDropdown<C extends CustomerSearchOption>({
  value,
  onValueChange,
  customers,
  onSelect,
  label,
  placeholder,
  error,
  clearOption,
}: CustomerSearchDropdownProps<C>) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => {
      const haystack =
        `${customer.razon_social} ${customer.nombre} ${customer.correo} ${customer.telefono}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [customers, value]);

  const showDropdown = isOpen && (value.trim().length > 0 || clearOption !== undefined);

  return (
    <div className="relative">
      <FormInput
        label={label}
        placeholder={placeholder}
        variant="ghostSearch"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        error={error}
      />
      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {clearOption && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  clearOption.onSelect();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors border-b border-slate-100 dark:border-slate-800"
              >
                {clearOption.label}
              </button>
            )}
            {filteredCustomers.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                No se encontraron clientes.
              </div>
            ) : (
              filteredCustomers.map((customer, index) => (
                <button
                  key={`${customer.id}-${index}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(customer);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {customer.razon_social}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {customer.nombre} · {customer.correo}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
