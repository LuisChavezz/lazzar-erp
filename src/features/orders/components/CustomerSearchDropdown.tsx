"use client";

import { useMemo, useState } from "react";
import { FieldError } from "react-hook-form";
import { FormInput } from "@/src/components/FormInput";
import { CustomerItem } from "@/src/features/customers/interfaces/customer.interface";

interface CustomerSearchDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  customers: CustomerItem[];
  onSelect: (customer: CustomerItem) => void;
  label?: string;
  placeholder?: string;
  error?: FieldError;
}

export function CustomerSearchDropdown({
  value,
  onValueChange,
  customers,
  onSelect,
  label,
  placeholder,
  error,
}: CustomerSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => {
      const haystack =
        `${customer.razonSocial} ${customer.contacto} ${customer.correo} ${customer.telefono}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [customers, value]);

  const showDropdown = isOpen && value.trim().length > 0;

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
            {filteredCustomers.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                No se encontraron clientes.
              </div>
            ) : (
              filteredCustomers.map((customer, index) => (
                <button
                  key={`${customer.razonSocial}-${index}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(customer);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {customer.razonSocial}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {customer.contacto} · {customer.correo}
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
